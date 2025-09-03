import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Table } from '../types/schema';
import { Database, Key, Link, Shield, Hash } from 'lucide-react';
import clsx from 'clsx';

interface TableNodeProps {
  data: Table;
  selected?: boolean;
}

interface DragData {
  tableId: string;
  fieldId: string;
  fieldName: string;
  fieldType: string;
}

export default function TableNode({ data, selected }: TableNodeProps) {
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Global drag state cleanup
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDraggedField(null);
      setDragOverField(null);
      setIsDragging(false);
    };

    const handleGlobalDrop = () => {
      setDraggedField(null);
      setDragOverField(null);
      setIsDragging(false);
    };

    // Listen for global drag events to ensure cleanup
    document.addEventListener('dragend', handleGlobalDragEnd);
    document.addEventListener('drop', handleGlobalDrop);
    
    // Also listen for mouse up as a fallback
    document.addEventListener('mouseup', handleGlobalDragEnd);

    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
      document.removeEventListener('drop', handleGlobalDrop);
      document.removeEventListener('mouseup', handleGlobalDragEnd);
    };
  }, []);

  const handleDragStart = (e: React.DragEvent, field: any) => {
    const dragData: DragData = {
      tableId: data.id,
      fieldId: field.id,
      fieldName: field.name,
      fieldType: field.type
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'link';
    setDraggedField(field.id);
    setIsDragging(true);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Clean up all drag states
    setDraggedField(null);
    setDragOverField(null);
    setIsDragging(false);
    
    // Remove any lingering visual effects
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('opacity-50');
    target.style.opacity = '';
  };

  const handleDragOver = (e: React.DragEvent, field: any) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
    
    // Only set drag over if we're not dragging from this field
    if (draggedField !== field.id) {
      setDragOverField(field.id);
    }
  };

  const handleDragLeave = (e: React.DragEvent, field: any) => {
    // Only clear if we're actually leaving the field area
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      if (dragOverField === field.id) {
        setDragOverField(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetField: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear drag states immediately
    setDragOverField(null);
    setDraggedField(null);
    setIsDragging(false);
    
    try {
      const dragDataStr = e.dataTransfer.getData('application/json');
      if (!dragDataStr) return;
      
      const dragData: DragData = JSON.parse(dragDataStr);
      
      // Don't allow dropping on the same field
      if (dragData.tableId === data.id && dragData.fieldId === targetField.id) {
        return;
      }
      
      // Dispatch custom event to create relationship
      const relationshipEvent = new CustomEvent('createRelationship', {
        detail: {
          source: dragData.tableId,
          target: data.id,
          sourceField: dragData.fieldId,
          targetField: targetField.id,
          sourceFieldName: dragData.fieldName,
          targetFieldName: targetField.name,
          sourceFieldType: dragData.fieldType,
          targetFieldType: targetField.type
        }
      });
      
      window.dispatchEvent(relationshipEvent);
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  const handleDropOnTable = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clear drag states immediately
    setDragOverField(null);
    setDraggedField(null);
    setIsDragging(false);
    
    try {
      const dragDataStr = e.dataTransfer.getData('application/json');
      if (!dragDataStr) return;
      
      const dragData: DragData = JSON.parse(dragDataStr);
      
      // Don't allow dropping on the same table
      if (dragData.tableId === data.id) {
        return;
      }
      
      // Dispatch custom event to create relationship (no target field specified)
      const relationshipEvent = new CustomEvent('createRelationship', {
        detail: {
          source: dragData.tableId,
          target: data.id,
          sourceField: dragData.fieldId,
          targetField: null,
          sourceFieldName: dragData.fieldName,
          targetFieldName: null,
          sourceFieldType: dragData.fieldType,
          targetFieldType: null
        }
      });
      
      window.dispatchEvent(relationshipEvent);
    } catch (error) {
      console.error('Error handling table drop:', error);
    }
  };

  return (
    <div
      className={clsx(
        'bg-white rounded-lg shadow-lg border-2 min-w-[250px] transition-all',
        selected ? 'border-blue-500 shadow-xl' : 'border-gray-200 hover:shadow-xl'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'link';
      }}
      onDrop={handleDropOnTable}
    >
      <div
        className="px-4 py-3 rounded-t-lg text-white font-semibold flex items-center gap-2"
        style={{ backgroundColor: data.color }}
      >
        <Database size={18} />
        <span>{data.name}</span>
        {data.enableRLS && (
          <Shield size={16} className="ml-auto opacity-80" />
        )}
      </div>
      
      <div className="p-2">
        {data.fields.length === 0 ? (
          <div className="text-gray-400 text-sm italic p-2">No fields defined</div>
        ) : (
          <div className="space-y-1">
            {data.fields.map((field) => (
              <div
                key={field.id}
                className={clsx(
                  'relative flex items-center gap-2 px-2 py-1 rounded text-sm transition-all',
                  'hover:bg-gray-50',
                  // Drag states
                  draggedField === field.id ? 'opacity-50 cursor-grabbing' : 'cursor-grab',
                  dragOverField === field.id && draggedField !== field.id && 'bg-blue-50 border border-blue-300 shadow-sm',
                  // Prevent interaction during drag
                  isDragging && draggedField !== field.id && 'pointer-events-none'
                )}
                draggable
                onDragStart={(e) => handleDragStart(e, field)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, field)}
                onDragLeave={(e) => handleDragLeave(e, field)}
                onDrop={(e) => handleDrop(e, field)}
              >
                <div className="flex items-center gap-1 flex-1">
                  {field.isPrimaryKey && <Key size={14} className="text-amber-500" />}
                  {field.isForeignKey && <Link size={14} className="text-blue-500" />}
                  {field.isUnique && !field.isPrimaryKey && <Hash size={14} className="text-purple-500" />}
                  <span className={clsx(
                    'font-medium',
                    field.isPrimaryKey && 'text-amber-700',
                    field.isForeignKey && 'text-blue-700'
                  )}>
                    {field.name}
                  </span>
                </div>
                <span className="text-gray-500 text-xs">{field.type}</span>
                {!field.isNullable && (
                  <span className="text-red-500 text-xs font-semibold">*</span>
                )}
                
                {/* Drop zone indicator */}
                {dragOverField === field.id && draggedField !== field.id && (
                  <div className="absolute inset-0 bg-green-200 opacity-30 rounded pointer-events-none animate-pulse" />
                )}
                
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${data.id}-${field.id}`}
                  className="!w-2 !h-2 !bg-blue-500 !border-white"
                  style={{ position: 'relative', right: -6, transform: 'none' }}
                />
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${data.id}-${field.id}`}
                  className="!w-2 !h-2 !bg-blue-500 !border-white"
                  style={{ position: 'relative', left: -6, transform: 'none' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
