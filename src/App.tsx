import React from 'react';
import { Toaster } from 'react-hot-toast';
import Canvas from './components/Canvas';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import ScriptModal from './components/ScriptModal';
import AIChat from './components/AIChat';

function App() {
  const [showScriptModal, setShowScriptModal] = React.useState(false);
  const [showAIChat, setShowAIChat] = React.useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10B981',
            },
          },
          error: {
            style: {
              background: '#EF4444',
            },
          },
        }}
      />
      
      <Toolbar 
        onGenerateScript={() => setShowScriptModal(true)}
        onToggleAI={() => setShowAIChat(!showAIChat)}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 relative">
          <Canvas />
        </div>
        {showAIChat && <AIChat onClose={() => setShowAIChat(false)} />}
      </div>
      
      {showScriptModal && (
        <ScriptModal onClose={() => setShowScriptModal(false)} />
      )}
    </div>
  );
}

export default App;
