import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Shield, Lock, Eye, FileEdit, Database } from 'lucide-react';
import { Policy } from '../types/schema';
import { useSchemaStore } from '../store/schemaStore';
import toast from 'react-hot-toast';

interface PolicyEditorProps {
  tableId: string;
  policies: Policy[];
}

const POLICY_COMMANDS = [
  { value: 'SELECT', label: 'SELECT', icon: Eye, description: 'Allow reading data' },
  { value: 'INSERT', label: 'INSERT', icon: Plus, description: 'Allow creating new records' },
  { value: 'UPDATE', label: 'UPDATE', icon: FileEdit, description: 'Allow modifying existing records' },
  { value: 'DELETE', label: 'DELETE', icon: Trash2, description: 'Allow deleting records' },
  { value: 'ALL', label: 'ALL', icon: Database, description: 'Allow all operations' },
];

const COMMON_ROLES = [
  { value: 'authenticated', label: 'Authenticated Users' },
  { value: 'anon', label: 'Anonymous Users' },
  { value: 'service_role', label: 'Service Role' },
  { value: 'public', label: 'Public' },
];

const POLICY_TEMPLATES = [
  {
    name: 'Own records only',
    command: 'ALL' as const,
    role: 'authenticated',
    using: 'auth.uid() = user_id',
    description: 'Users can only access their own records'
  },
  {
    name: 'Read own records',
    command: 'SELECT' as const,
    role: 'authenticated',
    using: 'auth.uid() = user_id',
    description: 'Users can only read their own records'
  },
  {
    name: 'Public read access',
    command: 'SELECT' as const,
    role: 'anon',
    using: 'true',
    description: 'Anyone can read all records'
  },
  {
    name: 'Insert own records',
    command: 'INSERT' as const,
    role: 'authenticated',
    check: 'auth.uid() = user_id',
    description: 'Users can only create records for themselves'
  },
];

export default function PolicyEditor({ tableId, policies }: PolicyEditorProps) {
  const { addPolicy, updatePolicy, deletePolicy } = useSchemaStore();
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null);
  const [showNewPolicyForm, setShowNewPolicyForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  // New policy form state
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    command: 'SELECT' as Policy['command'],
    role: 'authenticated',
    using: '',
    check: ''
  });

  const handleAddPolicy = () => {
    if (!newPolicy.name.trim()) {
      toast.error('Policy name is required');
      return;
    }

    const policy: Policy = {
      id: `policy-${Date.now()}`,
      name: newPolicy.name.trim(),
      command: newPolicy.command,
      role: newPolicy.role,
      using: newPolicy.using.trim() || undefined,
      check: newPolicy.check.trim() || undefined,
    };

    addPolicy(tableId, policy);
    
    // Reset form
    setNewPolicy({
      name: '',
      command: 'SELECT',
      role: 'authenticated',
      using: '',
      check: ''
    });
    setShowNewPolicyForm(false);
    toast.success('Policy added successfully');
  };

  const handleApplyTemplate = (template: typeof POLICY_TEMPLATES[0]) => {
    setNewPolicy({
      name: template.name,
      command: template.command,
      role: template.role,
      using: template.using || '',
      check: template.check || ''
    });
    setShowTemplates(false);
    setShowNewPolicyForm(true);
  };

  const getCommandIcon = (command: Policy['command']) => {
    const commandConfig = POLICY_COMMANDS.find(c => c.value === command);
    const Icon = commandConfig?.icon || Shield;
    return <Icon size={14} />;
  };

  const getCommandColor = (command: Policy['command']) => {
    switch (command) {
      case 'SELECT': return 'text-blue-600 bg-blue-100';
      case 'INSERT': return 'text-green-600 bg-green-100';
      case 'UPDATE': return 'text-amber-600 bg-amber-100';
      case 'DELETE': return 'text-red-600 bg-red-100';
      case 'ALL': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Shield size={16} />
          RLS Policies
        </h4>
        <div className="flex gap-1">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
            title="Policy Templates"
          >
            Templates
          </button>
          <button
            onClick={() => setShowNewPolicyForm(!showNewPolicyForm)}
            className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
            title="Add Policy"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Policy Templates */}
      {showTemplates && (
        <div className="bg-gray-50 rounded-lg p-3 border">
          <h5 className="text-xs font-medium text-gray-700 mb-2">Quick Templates</h5>
          <div className="space-y-1">
            {POLICY_TEMPLATES.map((template, index) => (
              <button
                key={index}
                onClick={() => handleApplyTemplate(template)}
                className="w-full text-left p-2 bg-white rounded border hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{template.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${getCommandColor(template.command)}`}>
                    {template.command}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{template.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New Policy Form */}
      {showNewPolicyForm && (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-medium text-blue-800">Create New Policy</h5>
            <button
              onClick={() => setShowNewPolicyForm(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Policy Name *
              </label>
              <input
                type="text"
                value={newPolicy.name}
                onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                placeholder="e.g., Users can read own data"
                className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Command *
                </label>
                <select
                  value={newPolicy.command}
                  onChange={(e) => setNewPolicy({ ...newPolicy, command: e.target.value as Policy['command'] })}
                  className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                >
                  {POLICY_COMMANDS.map((cmd) => (
                    <option key={cmd.value} value={cmd.value}>
                      {cmd.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={newPolicy.role}
                  onChange={(e) => setNewPolicy({ ...newPolicy, role: e.target.value })}
                  className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
                >
                  {COMMON_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                USING Expression
              </label>
              <input
                type="text"
                value={newPolicy.using}
                onChange={(e) => setNewPolicy({ ...newPolicy, using: e.target.value })}
                placeholder="e.g., auth.uid() = user_id"
                className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Condition for when the policy applies</p>
            </div>

            {(newPolicy.command === 'INSERT' || newPolicy.command === 'UPDATE' || newPolicy.command === 'ALL') && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  WITH CHECK Expression
                </label>
                <input
                  type="text"
                  value={newPolicy.check}
                  onChange={(e) => setNewPolicy({ ...newPolicy, check: e.target.value })}
                  placeholder="e.g., auth.uid() = user_id"
                  className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Condition for data being inserted/updated</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAddPolicy}
                disabled={!newPolicy.name.trim()}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Policy
              </button>
              <button
                onClick={() => setShowNewPolicyForm(false)}
                className="px-3 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Policies */}
      <div className="space-y-2">
        {policies.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No policies defined
          </div>
        ) : (
          policies.map((policy) => (
            <div key={policy.id} className="bg-gray-50 rounded-lg border">
              {editingPolicy === policy.id ? (
                <PolicyEditForm
                  policy={policy}
                  tableId={tableId}
                  onSave={() => setEditingPolicy(null)}
                  onCancel={() => setEditingPolicy(null)}
                />
              ) : (
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{policy.name}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCommandColor(policy.command)}`}>
                          {getCommandIcon(policy.command)}
                          <span className="ml-1">{policy.command}</span>
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Role:</span>
                          <span className="px-1 py-0.5 bg-gray-200 rounded">{policy.role}</span>
                        </div>
                        {policy.using && (
                          <div>
                            <span className="font-medium">USING:</span>
                            <code className="ml-1 px-1 py-0.5 bg-gray-200 rounded text-xs">{policy.using}</code>
                          </div>
                        )}
                        {policy.check && (
                          <div>
                            <span className="font-medium">WITH CHECK:</span>
                            <code className="ml-1 px-1 py-0.5 bg-gray-200 rounded text-xs">{policy.check}</code>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => setEditingPolicy(policy.id)}
                        className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        title="Edit Policy"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          deletePolicy(tableId, policy.id);
                          toast.success('Policy deleted');
                        }}
                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Delete Policy"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface PolicyEditFormProps {
  policy: Policy;
  tableId: string;
  onSave: () => void;
  onCancel: () => void;
}

function PolicyEditForm({ policy, tableId, onSave, onCancel }: PolicyEditFormProps) {
  const { updatePolicy } = useSchemaStore();
  const [editedPolicy, setEditedPolicy] = useState(policy);

  const handleSave = () => {
    if (!editedPolicy.name.trim()) {
      toast.error('Policy name is required');
      return;
    }

    updatePolicy(tableId, policy.id, {
      name: editedPolicy.name.trim(),
      command: editedPolicy.command,
      role: editedPolicy.role,
      using: editedPolicy.using?.trim() || undefined,
      check: editedPolicy.check?.trim() || undefined,
    });

    toast.success('Policy updated successfully');
    onSave();
  };

  return (
    <div className="p-3 bg-white border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-medium text-blue-800">Edit Policy</h5>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Policy Name *
          </label>
          <input
            type="text"
            value={editedPolicy.name}
            onChange={(e) => setEditedPolicy({ ...editedPolicy, name: e.target.value })}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Command *
            </label>
            <select
              value={editedPolicy.command}
              onChange={(e) => setEditedPolicy({ ...editedPolicy, command: e.target.value as Policy['command'] })}
              className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
            >
              {POLICY_COMMANDS.map((cmd) => (
                <option key={cmd.value} value={cmd.value}>
                  {cmd.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              value={editedPolicy.role}
              onChange={(e) => setEditedPolicy({ ...editedPolicy, role: e.target.value })}
              className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
            >
              {COMMON_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            USING Expression
          </label>
          <textarea
            value={editedPolicy.using || ''}
            onChange={(e) => setEditedPolicy({ ...editedPolicy, using: e.target.value })}
            placeholder="e.g., auth.uid() = user_id"
            rows={2}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {(editedPolicy.command === 'INSERT' || editedPolicy.command === 'UPDATE' || editedPolicy.command === 'ALL') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              WITH CHECK Expression
            </label>
            <textarea
              value={editedPolicy.check || ''}
              onChange={(e) => setEditedPolicy({ ...editedPolicy, check: e.target.value })}
              placeholder="e.g., auth.uid() = user_id"
              rows={2}
              className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default PolicyEditor;