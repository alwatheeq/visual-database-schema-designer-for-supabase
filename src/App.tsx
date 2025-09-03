import React, { useEffect, useState } from 'react';
import Canvas from './components/Canvas';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import ScriptModal from './components/ScriptModal';
import AIChat from './components/AIChat';
import { Toaster } from 'react-hot-toast';
import { useSchemaStore } from './store/schemaStore';
import { useAuthStore } from './store/authStore';
import { DesignService } from './services/designService';
import toast from 'react-hot-toast';

function App() {
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const { tables, relationships } = useSchemaStore();
  const { checkAuth, isLoading: authLoading } = useAuthStore();

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Test database connection on mount
  useEffect(() => {
    const testConnection = async () => {
      console.log('Testing database connection on app load...');
      const isConnected = await DesignService.testConnection();
      if (isConnected) {
        console.log('✅ Database connection successful');
        toast.success('Database connected', {
          duration: 2000,
          position: 'bottom-right',
          style: {
            background: '#10B981',
            color: 'white',
          },
        });
      } else {
        console.error('❌ Database connection failed');
        toast.error('Database connection failed. Check your Supabase configuration.', {
          duration: 5000,
          position: 'bottom-right',
        });
      }
    };
    
    testConnection();
  }, []);

  // Load from localStorage on mount (fallback)
  useEffect(() => {
    const savedSchema = localStorage.getItem('database-schema');
    if (savedSchema) {
      try {
        const { tables: savedTables, relationships: savedRelationships } = JSON.parse(savedSchema);
        if (savedTables && savedRelationships) {
          useSchemaStore.setState({
            tables: savedTables,
            relationships: savedRelationships
          });
          console.log('Loaded schema from localStorage (fallback)');
        }
      } catch (error) {
        console.error('Failed to load schema from localStorage:', error);
      }
    }
  }, []);

  // Auto-save to localStorage (fallback)
  useEffect(() => {
    if (tables.length > 0 || relationships.length > 0) {
      const schemaData = {
        tables,
        relationships,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('database-schema', JSON.stringify(schemaData));
      console.log('Auto-saved to localStorage (fallback)');
    }
  }, [tables, relationships]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toaster position="top-right" />
      
      <Toolbar 
        onGenerateScript={() => setShowScriptModal(true)}
        onToggleAI={() => setShowAIChat(!showAIChat)}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <Canvas />
        </div>
        <Sidebar />
      </div>

      {showScriptModal && (
        <ScriptModal 
          isOpen={showScriptModal}
          onClose={() => setShowScriptModal(false)}
        />
      )}

      {showAIChat && (
        <AIChat 
          isOpen={showAIChat}
          onClose={() => setShowAIChat(false)}
        />
      )}
    </div>
  );
}

export default App;
