import React, { useState } from 'react';
import { useSchemaStore } from '../store/schemaStore';
import { Plus, Trash2, Edit2, Save, Shield } from 'lucide-react';
import { FIELD_TYPES, DEFAULT_VALUE_SUGGESTIONS } from '../types/schema';
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
    addPolicy,
    deletePolicy,
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
                <input
                  type="text"
                  value={selectedTableData.name}
                  onChange={(e) => updateTable(selectedTable, { name: e.target.value })}
                  className="border rounded px-2 py-1 text-sm w-full"
                  autoFocus
                />
              ) : (
                selectedTableData.name
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

          {selectedTableData.enableRLS && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">RLS Policies</h4>
              {selectedTableData.policies.map((policy) => (
                <div key={policy.id} className="bg-gray-50 p-3 rounded-lg text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{policy.name}</span>
                    <button
                      onClick={() => deletePolicy(selectedTable, policy.id)}
                      className="p-1 hover:bg-red-100 text-red-500 rounded"
                      title="Delete policy"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {policy.operation} for {policy.role}
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  const newPolicy = {
                    id: `policy-${Date.now()}`,
                    name: 'New Policy',
                    operation: 'SELECT' as const,
                    role: 'authenticated',
                    using: 'auth.uid() = user_id',
                  };
                  addPolicy(selectedTable, newPolicy);
                }}
                className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
              >
                Add Policy
              </button>
            </div>
          )}
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
