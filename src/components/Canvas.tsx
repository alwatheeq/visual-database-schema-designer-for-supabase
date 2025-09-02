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
  const { tables, relationships, updateTable, addRelationship, setSelectedTable, setSelectedRelationship } = useSchemaStore();

  const nodes = useMemo(() => {
    return tables.map((table) => ({
      id: table.id,
      type: 'table',
      position: table.position,
      data: table,
    }));
  }, [tables]);

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

      // Validate type compatibility
      if (!areTypesCompatible(sourceFieldType, targetFieldType)) {
        toast.error(getIncompatibilityMessage(sourceFieldType, targetFieldType));
        return;
      }

      // Check for duplicate relationships
      const existingRelationship = relationships.find(
        rel => 
          (rel.source === source && rel.target === target && 
           rel.sourceField === sourceField && rel.targetField === targetField) ||
          (rel.source === target && rel.target === source && 
           rel.sourceField === targetField && rel.targetField === sourceField)
      );

      if (existingRelationship) {
        toast.error('This relationship already exists');
        return;
      }

      const sourceTable = tables.find(t => t.id === source);
      const targetTable = tables.find(t => t.id === target);

      if (!sourceTable || !targetTable) {
        toast.error('Invalid table reference');
        return;
      }
      
      const newRelationship = {
        id: `rel-${Date.now()}`,
        source,
        target,
        sourceField,
        targetField,
        type: 'one-to-many' as const,
      };
      
      addRelationship(newRelationship);
      toast.success(
        `Relationship created: ${sourceTable.name}.${sourceFieldName} → ${targetTable.name}.${targetFieldName}`,
        { duration: 4000 }
      );
    };

    window.addEventListener('createRelationship', handleCreateRelationship as EventListener);
    
    return () => {
      window.removeEventListener('createRelationship', handleCreateRelationship as EventListener);
    };
  }, [addRelationship, tables, relationships]);

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

      const [sourceTableId, sourceFieldId] = connection.sourceHandle.split('-');
      const [targetTableId, targetFieldId] = connection.targetHandle.split('-');

      const sourceTable = tables.find(t => t.id === sourceTableId);
      const targetTable = tables.find(t => t.id === targetTableId);
      const sourceField = sourceTable?.fields.find(f => f.id === sourceFieldId);
      const targetField = targetTable?.fields.find(f => f.id === targetFieldId);

      if (!sourceField || !targetField) {
        return false;
      }

      // Check if types are compatible
      return areTypesCompatible(sourceField.type, targetField.type);
    },
    [tables]
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

        // Validate type compatibility
        if (!areTypesCompatible(sourceField.type, targetField.type)) {
          toast.error(getIncompatibilityMessage(sourceField.type, targetField.type));
          return;
        }

        // Check for duplicate relationships
        const existingRelationship = relationships.find(
          rel => 
            (rel.source === sourceTableId && rel.target === targetTableId && 
             rel.sourceField === sourceFieldId && rel.targetField === targetFieldId) ||
            (rel.source === targetTableId && rel.target === sourceTableId && 
             rel.sourceField === targetFieldId && rel.targetField === sourceFieldId)
        );

        if (existingRelationship) {
          toast.error('This relationship already exists');
          return;
        }
        
        const newRelationship = {
          id: `rel-${Date.now()}`,
          source: sourceTableId,
          target: targetTableId,
          sourceField: sourceFieldId,
          targetField: targetFieldId,
          type: 'one-to-many' as const,
        };
        
        addRelationship(newRelationship);
        toast.success(`Relationship created: ${sourceTable?.name}.${sourceField.name} → ${targetTable?.name}.${targetField.name}`);
      }
    },
    [addRelationship, tables, relationships]
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
