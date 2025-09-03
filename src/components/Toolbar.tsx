import React, { useState } from 'react';
import { Database, Download, Bot, Save, Upload, Plus, FileCode, FolderOpen, LogIn } from 'lucide-react';
import { useSchemaStore } from '../store/schemaStore';
import { useAuthStore } from '../store/authStore';
import SaveDesignModal from './SaveDesignModal';
import LoadDesignModal from './LoadDesignModal';
import AuthModal from './AuthModal';
import UserMenu from './UserMenu';
import toast from 'react-hot-toast';

interface ToolbarProps {
  onGenerateScript: () => void;
  onToggleAI: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onGenerateScript, onToggleAI }) => {
  const { tables, relationships, addTable } = useSchemaStore();
  const { isAuthenticated } = useAuthStore();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleAddTable = () => {
    const TABLE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
    
    const newTable = {
      id: `table-${Date.now()}`,
      name: `table_${tables.length + 1}`,
      fields: [
        {
          id: 'id',
          name: 'id',
          type: 'uuid',
          isPrimaryKey: true,
          isForeignKey: false,
          isUnique: true,
          isNullable: false,
        },
        {
          id: 'created_at',
          name: 'created_at',
          type: 'timestamptz',
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isNullable: false,
          defaultValue: 'now()',
        },
        {
          id: 'updated_at',
          name: 'updated_at',
          type: 'timestamptz',
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isNullable: false,
          defaultValue: 'now()',
        },
      ],
      position: { x: 100 + tables.length * 50, y: 100 + tables.length * 50 },
      color: TABLE_COLORS[tables.length % TABLE_COLORS.length],
      enableRLS: true,
      policies: [],
    };
    addTable(newTable);
    toast.success('Table added successfully');
  };

  const handleExportSchema = () => {
    const schemaData = {
      tables,
      relationships,
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(schemaData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Schema exported successfully');
  };

  const handleImportSchema = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.tables && data.relationships) {
          useSchemaStore.setState({
            tables: data.tables,
            relationships: data.relationships
          });
          toast.success('Schema imported successfully');
        } else {
          toast.error('Invalid schema file');
        }
      } catch (error) {
        toast.error('Failed to import schema');
      }
    };
    
    input.click();
  };

  const handleSaveToLocal = () => {
    // Save to localStorage
    const schemaData = {
      tables,
      relationships,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('database-schema', JSON.stringify(schemaData));
    toast.success('Schema saved to browser');
  };

  const handleSaveClick = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to save designs');
      setShowAuthModal(true);
      return;
    }
    setShowSaveModal(true);
  };

  const handleLoadClick = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to load designs');
      setShowAuthModal(true);
      return;
    }
    setShowLoadModal(true);
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Database className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-semibold text-gray-900">Schema Designer</h1>
            </div>
            
            {/* Main Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddTable}
                className="inline-flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Table
              </button>
              
              <button
                onClick={onGenerateScript}
                disabled={tables.length === 0}
                className="inline-flex items-center px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileCode className="w-4 h-4 mr-2" />
                Generate Scripts
              </button>
            </div>
          </div>
          
          {/* Secondary Actions */}
          <div className="flex items-center space-x-2">
            {/* Database Save/Load */}
            <button
              onClick={handleSaveClick}
              disabled={tables.length === 0}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save Design to Database"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </button>
            
            <button
              onClick={handleLoadClick}
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              title="Load Design from Database"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Load
            </button>
            
            <div className="w-px h-6 bg-gray-300 mx-2" />
            
            {/* Local Storage & Import/Export */}
            <button
              onClick={handleSaveToLocal}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title="Save to Browser Storage"
            >
              <Save className="w-4 h-4 mr-2" />
              Local
            </button>
            
            <button
              onClick={handleImportSchema}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title="Import Schema"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </button>
            
            <button
              onClick={handleExportSchema}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title="Export Schema"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            
            <div className="w-px h-6 bg-gray-300 mx-2" />
            
            <button
              onClick={onToggleAI}
              className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all"
              title="AI Assistant"
            >
              <Bot className="w-4 h-4 mr-2" />
              AI Assistant
            </button>
            
            <div className="w-px h-6 bg-gray-300 mx-2" />
            
            {/* User Authentication */}
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <SaveDesignModal 
        isOpen={showSaveModal} 
        onClose={() => setShowSaveModal(false)}
        onSaved={() => {
          // Optionally refresh load modal if it's open
          if (showLoadModal) {
            setShowLoadModal(false);
            setTimeout(() => setShowLoadModal(true), 100);
          }
        }}
      />
      
      <LoadDesignModal 
        isOpen={showLoadModal} 
        onClose={() => setShowLoadModal(false)}
        onLoaded={() => {
          // Design loaded successfully
        }}
      />
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticated={() => {
          toast.success('Welcome back!');
        }}
      />
    </>
  );
};

export default Toolbar;
