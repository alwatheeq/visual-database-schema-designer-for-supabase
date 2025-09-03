import React, { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  ConnectionMode,
  MarkerType,
  NodeTypes,
  EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useSchemaStore } from '../store/schemaStore';
import TableNode from './TableNode';
import CustomEdge from './CustomEdge';
import { areTypesCompatible, getIncompatibilityMessage } from '../utils/typeCompatibility';
import { toast } from 'react-hot-toast';

const nodeTypes: NodeTypes = {
  table: TableNode,
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

export default function Canvas() {
  const { tables, relationships, updateTable, addRelationship, addField, setSelectedTable, setSelectedRelationship } = useSchemaStore();

  const nodes = useMemo(() => {
    // Get selected relationship data for highlighting
    const selectedRel = relationships.find(rel => rel.id === selectedRelationship);
    
    return tables.map((table) => ({
      id: table.id,
      type: 'table',
      position: table.position,
      data: {
        ...table,
        highlightedField: selectedRel ? (
          selectedRel.source === table.id ? selectedRel.sourceField :
          selectedRel.target === table.id ? selectedRel.targetField :
          null
        ) : null,
        highlightType: selectedRel ? (
          selectedRel.source === table.id ? 'source' :
          selectedRel.target === table.id ? 'target' :
          null
        ) : null,
      },
    }));
  }, [tables, relationships, selectedRelationship]);

  const edges = useMemo(() => {
    return relationships.map((rel) => ({
      id: rel.id,
      source: rel.source,
      target: rel.target,
      sourceHandle: `${rel.source}-${rel.sourceField}`,
      targetHandle: `${rel.target}-${rel.targetField}`,
      type: 'custom',
      data: rel,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
      },
      style: {
        strokeWidth: 2,
      },
    }));
  }, [relationships]);

  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

  React.useEffect(() => {
    setNodes(nodes);
  }, [nodes, setNodes]);

  React.useEffect(() => {
    setEdges(edges);
  }, [edges, setEdges]);

  const createMatchingField = (targetTableId: string, sourceField: any, sourceFieldName: string) => {
    const newField = {
      id: `field-${Date.now()}`,
      name: sourceFieldName,
      type: sourceField.type,
      isPrimaryKey: false,
      isForeignKey: true,
      isUnique: false,
      isNullable: true,
      references: {
        table: sourceField.tableId,
        field: sourceField.id
      }
    };
    
    addField(targetTableId, newField);
    return newField;
  };

  const handleRelationshipCreation = (
    source: string,
    target: string,
    sourceField: string,
    targetField: string | null,
    sourceFieldName: string,
    targetFieldName: string | null,
    sourceFieldType: string,
    targetFieldType: string | null
  ) => {
    const sourceTable = tables.find(t => t.id === source);
    const targetTable = tables.find(t => t.id === target);

    if (!sourceTable || !targetTable) {
      toast.error('Invalid table reference');
      return;
    }

    let finalTargetField = targetField;
    let finalTargetFieldName = targetFieldName;

    // If no target field specified or types don't match, create a matching field
    if (!targetField || !targetFieldType || !areTypesCompatible(sourceFieldType, targetFieldType)) {
      // Check if a field with the same name already exists
      const existingField = targetTable.fields.find(f => f.name === sourceFieldName);
      
      if (existingField) {
        if (areTypesCompatible(sourceFieldType, existingField.type)) {
          // Use existing compatible field
          finalTargetField = existingField.id;
          finalTargetFieldName = existingField.name;
          toast.success(`Using existing field: ${targetTable.name}.${existingField.name}`);
        } else {
          // Create field with modified name to avoid conflict
          const newFieldName = `${sourceFieldName}_ref`;
          const sourceFieldObj = sourceTable.fields.find(f => f.id === sourceField);
          
          if (sourceFieldObj) {
            const newField = createMatchingField(target, { ...sourceFieldObj, tableId: source }, newFieldName);
            finalTargetField = newField.id;
            finalTargetFieldName = newField.name;
            toast.success(`Created new field: ${targetTable.name}.${newFieldName} (${sourceFieldType})`);
          }
        }
      } else {
        // Create new field with same name and type
        const sourceFieldObj = sourceTable.fields.find(f => f.id === sourceField);
        
        if (sourceFieldObj) {
          const newField = createMatchingField(target, { ...sourceFieldObj, tableId: source }, sourceFieldName);
          finalTargetField = newField.id;
          finalTargetFieldName = newField.name;
          toast.success(`Created new field: ${targetTable.name}.${sourceFieldName} (${sourceFieldType})`);
        }
      }
    }

    if (!finalTargetField) {
      toast.error('Failed to create or find target field');
      return;
    }

    // Check for duplicate relationships
    const existingRelationship = relationships.find(
      rel => 
        (rel.source === source && rel.target === target && 
         rel.sourceField === sourceField && rel.targetField === finalTargetField) ||
        (rel.source === target && rel.target === source && 
         rel.sourceField === finalTargetField && rel.targetField === sourceField)
    );

    if (existingRelationship) {
      toast.error('This relationship already exists');
      return;
    }
    
    const newRelationship = {
      id: `rel-${Date.now()}`,
      source,
      target,
      sourceField,
      targetField: finalTargetField,
      type: 'one-to-many' as const,
    };
    
    addRelationship(newRelationship);
    toast.success(
      `Relationship created: ${sourceTable.name}.${sourceFieldName} → ${targetTable.name}.${finalTargetFieldName}`,
      { duration: 4000 }
    );
  };

  // Handle drag-to-connect relationships
  useEffect(() => {
    const handleCreateRelationship = (event: CustomEvent) => {
      const { 
        source, 
        target, 
        sourceField, 
        targetField, 
        sourceFieldName, 
        targetFieldName,
        sourceFieldType,
        targetFieldType 
      } = event.detail;

      handleRelationshipCreation(
        source,
        target,
        sourceField,
        targetField,
        sourceFieldName,
        targetFieldName,
        sourceFieldType,
        targetFieldType
      );
    };

    window.addEventListener('createRelationship', handleCreateRelationship as EventListener);
    
    return () => {
      window.removeEventListener('createRelationship', handleCreateRelationship as EventListener);
    };
  }, [addRelationship, addField, tables, relationships]);

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      updateTable(node.id, { position: node.position });
    },
    [updateTable]
  );

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
        return false;
      }

      // Don't allow self-connections to the same field
      if (connection.sourceHandle === connection.targetHandle) {
        return false;
      }

      // Allow all connections - we'll handle type compatibility in onConnect
      return true;
    },
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target && params.sourceHandle && params.targetHandle) {
        const [sourceTableId, sourceFieldId] = params.sourceHandle.split('-');
        const [targetTableId, targetFieldId] = params.targetHandle.split('-');
        
        const sourceTable = tables.find(t => t.id === sourceTableId);
        const targetTable = tables.find(t => t.id === targetTableId);
        const sourceField = sourceTable?.fields.find(f => f.id === sourceFieldId);
        const targetField = targetTable?.fields.find(f => f.id === targetFieldId);

        if (!sourceField || !targetField) {
          toast.error('Invalid connection: Fields not found');
          return;
        }

        handleRelationshipCreation(
          sourceTableId,
          targetTableId,
          sourceFieldId,
          targetFieldId,
          sourceField.name,
          targetField.name,
          sourceField.type,
          targetField.type
        );
      }
    },
    [tables, relationships, addRelationship, addField]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedTable(node.id);
    },
    [setSelectedTable]
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      setSelectedRelationship(edge.id);
    },
    [setSelectedRelationship]
  );

  const onPaneClick = useCallback(() => {
    setSelectedTable(null);
    setSelectedRelationship(null);
  }, [setSelectedTable, setSelectedRelationship]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        className="bg-gradient-to-br from-slate-50 to-slate-100"
      >
        <Background color="#94a3b8" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
