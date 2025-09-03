import React, { useState } from 'react';
import { useSchemaStore } from '../store/schemaStore';
import { Plus, Trash2, Edit2, Save, Shield, ArrowRight, Link2 } from 'lucide-react';
import { FIELD_TYPES, DEFAULT_VALUE_SUGGESTIONS } from '../types/schema';
import PolicyEditor from './PolicyEditor';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const {
    tables,
    relationships,
    selectedTable,
    selectedRelationship,
    updateTable,
    deleteTable,
    addField,
    updateField,
    deleteField,
    updateRelationship,
    deleteRelationship,
  } = useSchemaStore();

  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldDefaultValue, setNewFieldDefaultValue] = useState('');

  const selectedTableData = tables.find((t) => t.id === selectedTable);
  const selectedRelationshipData = relationships.find((r) => r.id === selectedRelationship);

  const handleAddField = () => {
    if (!selectedTable || !newFieldName) return;
    
    const newField = {
      id: `field-${Date.now()}`,
      name: newFieldName,
      type: newFieldType,
      isPrimaryKey: false,
      isForeignKey: false,
      isUnique: false,
      isNullable: true,
      defaultValue: newFieldDefaultValue || undefined,
    };
    
    addField(selectedTable, newField);
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldDefaultValue('');
    toast.success('Field added successfully');
  };

  const getDefaultValueSuggestions = (fieldType: string) => {
    return DEFAULT_VALUE_SUGGESTIONS[fieldType] || [];
  };

  // Get relationships involving the selected table
  const getTableRelationships = () => {
    if (!selectedTableData) return [];
    
    return relationships.filter(rel => 
      rel.source === selectedTableData.id || rel.target === selectedTableData.id
    );
  };

  const getRelationshipDisplay = (relationship: any) => {
    const isSource = relationship.source === selectedTableData?.id;
    const connectedTableId = isSource ? relationship.target : relationship.source;
    const connectedTable = tables.find(t => t.id === connectedTableId);
    
    const sourceField = selectedTableData?.fields.find(f => f.id === relationship.sourceField);
    const targetField = tables.find(t => t.id === relationship.target)?.fields.find(f => f.id === relationship.targetField);
    
    if (isSource) {
      return {
        direction: 'outgoing',
        connectedTable: connectedTable?.name || 'Unknown',
        fieldConnection: `${sourceField?.name || 'unknown'} → ${connectedTable?.name}.${targetField?.name || 'unknown'}`,
        type: relationship.type,
        relationshipId: relationship.id
      };
    } else {
      return {
        direction: 'incoming',
        connectedTable: connectedTable?.name || 'Unknown',
        fieldConnection: `${connectedTable?.name}.${sourceField?.name || 'unknown'} → ${targetField?.name || 'unknown'}`,
        type: relationship.type,
        relationshipId: relationship.id
      };
    }
  };

  const getRelationshipTypeLabel = (type: string) => {
    switch (type) {
      case 'one-to-one': return '1:1';
      case 'one-to-many': return '1:N';
      case 'many-to-many': return 'N:N';
      default: return type;
    }
  };

  const getRelationshipTypeColor = (type: string) => {
    switch (type) {
      case 'one-to-one': return 'bg-blue-100 text-blue-800';
      case 'one-to-many': return 'bg-green-100 text-green-800';
      case 'many-to-many': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Show empty state when nothing is selected
  if (!selectedTableData && !selectedRelationshipData) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="text-gray-400 mb-4">
            <Shield size={48} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Selection</h3>
          <p className="text-gray-500 text-sm">
            Select a table or relationship to view and edit its properties.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      {selectedTableData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800">
              {editingTable === selectedTable ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={selectedTableData.name}
                    onChange={(e) => updateTable(selectedTable, { name: e.target.value })}
                    className="border rounded px-2 py-1 text-sm w-full"
                    placeholder="Table name"
                    autoFocus
                  />
                  <textarea
                    value={selectedTableData.description || ''}
                    onChange={(e) => updateTable(selectedTable, { description: e.target.value })}
                    className="border rounded px-2 py-1 text-sm w-full resize-none"
                    placeholder="Table description (optional)"
                    rows={2}
                  />
                </div>
              ) : (
                <div>
                  <div>{selectedTableData.name}</div>
                  {selectedTableData.description && (
                    <div className="text-sm text-gray-600 mt-1">{selectedTableData.description}</div>
                  )}
                </div>
              )}
            </h3>
            <div className="flex gap-1">
              <button
                onClick={() => setEditingTable(editingTable === selectedTable ? null : selectedTable)}
                className="p-1 hover:bg-gray-100 rounded"
                title={editingTable === selectedTable ? "Save" : "Edit table name"}
              >
                {editingTable === selectedTable ? <Save size={16} /> : <Edit2 size={16} />}
              </button>
              <button
                onClick={() => {
                  deleteTable(selectedTable);
                  toast.success('Table deleted');
                }}
                className="p-1 hover:bg-red-100 text-red-500 rounded"
                title="Delete table"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedTableData.enableRLS}
                onChange={(e) => updateTable(selectedTable, { enableRLS: e.target.checked })}
                className="rounded"
              />
              <Shield size={14} />
              Enable Row Level Security
            </label>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Fields</h4>
            {selectedTableData.fields.map((field) => (
              <div key={field.id} className="bg-gray-50 p-3 rounded-lg text-sm">
                {editingField === field.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateField(selectedTable, field.id, { name: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                      placeholder="Field name"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(selectedTable, field.id, { type: e.target.value })}
                      className="w-full border rounded px-2 py-1"
                    >
                      {FIELD_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={field.defaultValue || ''}
                        onChange={(e) => updateField(selectedTable, field.id, { defaultValue: e.target.value || undefined })}
                        className="w-full border rounded px-2 py-1"
                        placeholder="Default value (optional)"
                      />
                      {getDefaultValueSuggestions(field.type).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {getDefaultValueSuggestions(field.type).map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => updateField(selectedTable, field.id, { defaultValue: suggestion })}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={field.isUnique}
                          onChange={(e) => updateField(selectedTable, field.id, { isUnique: e.target.checked })}
                        />
                        <span className="text-xs">Unique</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={!field.isNullable}
                          onChange={(e) => updateField(selectedTable, field.id, { isNullable: !e.target.checked })}
                        />
                        <span className="text-xs">Required</span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingField(null)}
                        className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{field.name}</span>
                      <div className="text-xs text-gray-500 mt-1">
                        {field.type}
                        {field.defaultValue && <span className="ml-2 text-green-600">Default: {field.defaultValue}</span>}
                        {field.isPrimaryKey && <span className="ml-2 text-amber-600">Primary Key</span>}
                        {field.isForeignKey && <span className="ml-2 text-blue-600">Foreign Key</span>}
                        {field.isUnique && !field.isPrimaryKey && <span className="ml-2 text-purple-600">Unique</span>}
                        {!field.isNullable && <span className="ml-2 text-red-600">Required</span>}
                      </div>
                    </div>
                    {!field.isPrimaryKey && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingField(field.id)}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Edit field"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            deleteField(selectedTable, field.id);
                            toast.success('Field deleted');
                          }}
                          className="p-1 hover:bg-red-100 text-red-500 rounded"
                          title="Delete field"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Field name"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="flex-1 border rounded px-2 py-1 text-sm"
                  />
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {FIELD_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Default value (optional)"
                    value={newFieldDefaultValue}
                    onChange={(e) => setNewFieldDefaultValue(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                  {getDefaultValueSuggestions(newFieldType).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {getDefaultValueSuggestions(newFieldType).map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setNewFieldDefaultValue(suggestion)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleAddField}
                disabled={!newFieldName}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm mt-2"
              >
                <Plus size={16} />
                Add Field
              </button>
            </div>
          </div>

          {/* Current Relationships */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Link2 size={16} />
              Current Relationships ({getTableRelationships().length})
            </h4>
            
            {getTableRelationships().length === 0 ? (
              <div className="text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-lg">
                <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No relationships defined
              </div>
            ) : (
              <div className="space-y-2">
                {getTableRelationships().map((rel) => {
                  const display = getRelationshipDisplay(rel);
                  return (
                    <div
                      key={rel.id}
                      className={`p-3 rounded-lg border transition-colors cursor-pointer hover:border-blue-300 ${
                        selectedRelationship === rel.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                      onClick={() => setSelectedRelationship(rel.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRelationshipTypeColor(display.type)}`}>
                            {getRelationshipTypeLabel(display.type)}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            display.direction === 'outgoing' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {display.direction === 'outgoing' ? 'Outgoing' : 'Incoming'}
                          </span>
                        </div>
                        <ArrowRight size={14} className="text-gray-400" />
                      </div>
                      
                      <div className="text-sm">
                        <div className="font-medium text-gray-800 mb-1">
                          → {display.connectedTable}
                        </div>
                        <div className="text-xs text-gray-600 font-mono">
                          {display.fieldConnection}
                        </div>
                      </div>
                      
                      {rel.onDelete && (
                        <div className="mt-2 text-xs text-gray-500">
                          On Delete: <span className="font-medium">{rel.onDelete}</span>
                          {rel.onUpdate && (
                            <span className="ml-2">
                              On Update: <span className="font-medium">{rel.onUpdate}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RLS Policy Editor */}
          <PolicyEditor 
            tableId={selectedTable}
            policies={selectedTableData.policies || []}
          />
        </div>
      )}

      {selectedRelationshipData && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Relationship</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={selectedRelationshipData.type}
                onChange={(e) => updateRelationship(selectedRelationship, { type: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="one-to-one">One to One</option>
                <option value="one-to-many">One to Many</option>
                <option value="many-to-many">Many to Many</option>
              </select>
            </div>
            <button
              onClick={() => {
                deleteRelationship(selectedRelationship);
                toast.success('Relationship deleted');
              }}
              className="w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete Relationship
            </button>
          </div>
        </div>
      )}
    </div>
  );
}