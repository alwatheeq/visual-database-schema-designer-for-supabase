import React, { useState } from 'react';
import { useSchemaStore } from '../store/schemaStore';
import { Plus, Trash2, Edit2, Save, Shield, Lock, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import { FIELD_TYPES, DEFAULT_VALUE_SUGGESTIONS } from '../types/schema';
import toast from 'react-hot-toast';

// Common RLS policy templates
const POLICY_TEMPLATES = [
  {
    name: 'Users can read own data',
    command: 'SELECT' as const,
    role: 'authenticated',
    using: 'auth.uid() = user_id',
  },
  {
    name: 'Users can insert own data',
    command: 'INSERT' as const,
    role: 'authenticated',
    check: 'auth.uid() = user_id',
  },
  {
    name: 'Users can update own data',
    command: 'UPDATE' as const,
    role: 'authenticated',
    using: 'auth.uid() = user_id',
    check: 'auth.uid() = user_id',
  },
  {
    name: 'Users can delete own data',
    command: 'DELETE' as const,
    role: 'authenticated',
    using: 'auth.uid() = user_id',
  },
  {
    name: 'Public read access',
    command: 'SELECT' as const,
    role: 'anon',
    using: 'true',
  },
];

const POLICY_ROLES = [
  { value: 'anon', label: 'Anonymous (anon)' },
  { value: 'authenticated', label: 'Authenticated Users' },
  { value: 'service_role', label: 'Service Role' },
  { value: 'public', label: 'Public' },
];

const POLICY_COMMANDS = [
  { value: 'SELECT', label: 'SELECT (Read)' },
  { value: 'INSERT', label: 'INSERT (Create)' },
  { value: 'UPDATE', label: 'UPDATE (Modify)' },
  { value: 'DELETE', label: 'DELETE (Remove)' },
  { value: 'ALL', label: 'ALL (Full Access)' },
];
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
    updatePolicy,
  } = useSchemaStore();

  const [editingTable, setEditingTable] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [expandedPolicies, setExpandedPolicies] = useState(true);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldDefaultValue, setNewFieldDefaultValue] = useState('');
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyCommand, setNewPolicyCommand] = useState<'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL'>('SELECT');
  const [newPolicyRole, setNewPolicyRole] = useState('authenticated');
  const [newPolicyUsing, setNewPolicyUsing] = useState('');
  const [newPolicyCheck, setNewPolicyCheck] = useState('');

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
  const handleAddPolicy = () => {
    if (!selectedTable || !newPolicyName.trim()) {
      toast.error('Policy name is required');
      return;
    }
    
    const newPolicy = {
      id: `policy-${Date.now()}`,
      name: newPolicyName.trim(),
      command: newPolicyCommand,
      role: newPolicyRole,
      using: newPolicyUsing.trim() || undefined,
      check: newPolicyCheck.trim() || undefined,
    };
    
    addPolicy(selectedTable, newPolicy);
    
    // Reset form
    setNewPolicyName('');
    setNewPolicyCommand('SELECT');
    setNewPolicyRole('authenticated');
    setNewPolicyUsing('');
    setNewPolicyCheck('');
    setShowPolicyForm(false);
    
    toast.success('Policy added successfully');
  };

  const handleApplyTemplate = (template: typeof POLICY_TEMPLATES[0]) => {
    setNewPolicyName(template.name);
    setNewPolicyCommand(template.command);
    setNewPolicyRole(template.role);
    setNewPolicyUsing(template.using || '');
    setNewPolicyCheck(template.check || '');
  };

  const handleUpdatePolicy = (policyId: string, updates: any) => {
    if (!selectedTable) return;
    updatePolicy(selectedTable, policyId, updates);
    toast.success('Policy updated');
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
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock size={16} className="text-blue-600" />
                  RLS Policies
                </h4>
                <button
                  onClick={() => setExpandedPolicies(!expandedPolicies)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {expandedPolicies ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>
              
              {expandedPolicies && (
                <>
                  {(selectedTableData.policies || []).map((policy) => (
                    <div key={policy.id} className="bg-gray-50 p-3 rounded-lg text-sm border">
                      {editingPolicy === policy.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={policy.name}
                            onChange={(e) => handleUpdatePolicy(policy.id, { name: e.target.value })}
                            className="w-full border rounded px-2 py-1 font-medium"
                            placeholder="Policy name"
                          />
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Command</label>
                              <select
                                value={policy.command}
                                onChange={(e) => handleUpdatePolicy(policy.id, { command: e.target.value })}
                                className="w-full border rounded px-2 py-1 text-xs"
                              >
                                {POLICY_COMMANDS.map((cmd) => (
                                  <option key={cmd.value} value={cmd.value}>
                                    {cmd.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                              <select
                                value={policy.role}
                                onChange={(e) => handleUpdatePolicy(policy.id, { role: e.target.value })}
                                className="w-full border rounded px-2 py-1 text-xs"
                              >
                                {POLICY_ROLES.map((role) => (
                                  <option key={role.value} value={role.value}>
                                    {role.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              USING clause (row visibility)
                            </label>
                            <input
                              type="text"
                              value={policy.using || ''}
                              onChange={(e) => handleUpdatePolicy(policy.id, { using: e.target.value || undefined })}
                              className="w-full border rounded px-2 py-1 text-xs font-mono"
                              placeholder="e.g., auth.uid() = user_id"
                            />
                          </div>
                          
                          {(policy.command === 'INSERT' || policy.command === 'UPDATE' || policy.command === 'ALL') && (
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                WITH CHECK clause (data validation)
                              </label>
                              <input
                                type="text"
                                value={policy.check || ''}
                                onChange={(e) => handleUpdatePolicy(policy.id, { check: e.target.value || undefined })}
                                className="w-full border rounded px-2 py-1 text-xs font-mono"
                                placeholder="e.g., auth.uid() = user_id"
                              />
                            </div>
                          )}
                          
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => setEditingPolicy(null)}
                              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingPolicy(null)}
                              className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-800">{policy.name}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => setEditingPolicy(policy.id)}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Edit policy"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => {
                                  deletePolicy(selectedTable, policy.id);
                                  toast.success('Policy deleted');
                                }}
                                className="p-1 hover:bg-red-100 text-red-500 rounded"
                                title="Delete policy"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {policy.command}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {policy.role}
                              </span>
                            </div>
                            
                            {policy.using && (
                              <div className="mt-2">
                                <span className="text-gray-500">USING:</span>
                                <code className="ml-1 px-1 py-0.5 bg-gray-200 rounded text-xs">
                                  {policy.using}
                                </code>
                              </div>
                            )}
                            
                            {policy.check && (
                              <div>
                                <span className="text-gray-500">CHECK:</span>
                                <code className="ml-1 px-1 py-0.5 bg-gray-200 rounded text-xs">
                                  {policy.check}
                                </code>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {showPolicyForm ? (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Create New Policy</h5>
                      
                      {/* Policy Templates */}
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-600 mb-2">Templates</label>
                        <div className="grid grid-cols-1 gap-1">
                          {POLICY_TEMPLATES.map((template, index) => (
                            <button
                              key={index}
                              onClick={() => handleApplyTemplate(template)}
                              className="text-left px-2 py-1 text-xs bg-white border rounded hover:bg-gray-50 text-gray-700"
                            >
                              {template.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Policy Name *</label>
                          <input
                            type="text"
                            value={newPolicyName}
                            onChange={(e) => setNewPolicyName(e.target.value)}
                            className="w-full border rounded px-2 py-1 text-sm"
                            placeholder="e.g., Users can read own data"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Command *</label>
                            <select
                              value={newPolicyCommand}
                              onChange={(e) => setNewPolicyCommand(e.target.value as any)}
                              className="w-full border rounded px-2 py-1 text-xs"
                            >
                              {POLICY_COMMANDS.map((cmd) => (
                                <option key={cmd.value} value={cmd.value}>
                                  {cmd.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
                            <select
                              value={newPolicyRole}
                              onChange={(e) => setNewPolicyRole(e.target.value)}
                              className="w-full border rounded px-2 py-1 text-xs"
                            >
                              {POLICY_ROLES.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            USING clause (row visibility condition)
                          </label>
                          <input
                            type="text"
                            value={newPolicyUsing}
                            onChange={(e) => setNewPolicyUsing(e.target.value)}
                            className="w-full border rounded px-2 py-1 text-xs font-mono"
                            placeholder="e.g., auth.uid() = user_id"
                          />
                          <p className="text-xs text-gray-500 mt-1">Determines which rows are visible to the role</p>
                        </div>
                        
                        {(newPolicyCommand === 'INSERT' || newPolicyCommand === 'UPDATE' || newPolicyCommand === 'ALL') && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              WITH CHECK clause (data validation)
                            </label>
                            <input
                              type="text"
                              value={newPolicyCheck}
                              onChange={(e) => setNewPolicyCheck(e.target.value)}
                              className="w-full border rounded px-2 py-1 text-xs font-mono"
                              placeholder="e.g., auth.uid() = user_id"
                            />
                            <p className="text-xs text-gray-500 mt-1">Validates data before INSERT/UPDATE</p>
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={handleAddPolicy}
                            disabled={!newPolicyName.trim()}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-xs"
                          >
                            Add Policy
                          </button>
                          <button
                            onClick={() => {
                              setShowPolicyForm(false);
                              setNewPolicyName('');
                              setNewPolicyUsing('');
                              setNewPolicyCheck('');
                            }}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPolicyForm(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm transition-colors"
                    >
                      <Plus size={16} />
                      Add RLS Policy
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          
          {!selectedTableData.enableRLS && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-800">
                <Shield size={16} />
                <span className="text-sm font-medium">RLS Disabled</span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                Enable Row Level Security above to configure access policies for this table.
              </p>
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
