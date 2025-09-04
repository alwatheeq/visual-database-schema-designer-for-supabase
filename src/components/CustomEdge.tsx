import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';
import { Relationship } from '../types/schema';
import { useSchemaStore } from '../store/schemaStore';
import { X } from 'lucide-react';

interface CustomEdgeData extends Relationship {}

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  selected,
}: EdgeProps<CustomEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const { deleteRelationship, tables } = useSchemaStore();

  const sourceTable = tables.find(t => t.id === data?.source);
  const targetTable = tables.find(t => t.id === data?.target);
  const sourceField = sourceTable?.fields.find(f => f.id === data?.sourceField);
  const targetField = targetTable?.fields.find(f => f.id === data?.targetField);

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    deleteRelationship(id);
  };

  const getRelationshipSymbol = () => {
    switch (data?.type) {
      case 'one-to-one':
        return '1:1';
      case 'one-to-many':
        return '1:N';
      case 'many-to-many':
        return 'N:N';
      default:
        return '';
    }
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? '#3B82F6' : '#6B7280',
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: selected ? 'none' : 'none',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="flex items-center gap-1"
        >
          <div className="bg-white px-2 py-1 rounded shadow-md border border-gray-200 text-xs font-medium">
            {getRelationshipSymbol()}
          </div>
          {selected && (
            <button
              onClick={handleDelete}
              className="bg-red-500 text-white p-1 rounded hover:bg-red-600 transition-colors"
              title="Delete relationship"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
      {selected && sourceField && targetField && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY + 25}px)`,
            }}
            className="bg-blue-50 px-2 py-1 rounded shadow-md border border-blue-200 text-xs"
          >
            {sourceTable?.name}.{sourceField.name} → {targetTable?.name}.{targetField.name}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
