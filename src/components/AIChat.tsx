import React, { useState } from 'react';
import { Send, X, Loader2, AlertCircle } from 'lucide-react';
import { useSchemaStore } from '../store/schemaStore';
import { modifySchemaWithAI } from '../utils/openaiClient';
import toast from 'react-hot-toast';

interface AIChatProps {
  onClose: () => void;
}

export default function AIChat({ onClose }: AIChatProps) {
  const { tables, relationships, loadDesign } = useSchemaStore();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    // Add user message to conversation
    const userMessage = { type: 'user' as const, content: message.trim(), timestamp: new Date() };
    setConversationHistory(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    const currentMessage = message.trim();
    setMessage(''); // Clear input immediately

    try {
      console.log('🎯 AI Schema Assistant: Processing request:', currentMessage);
      console.log('📊 Current schema state:', { 
        tables: tables.length, 
        relationships: relationships.length 
      });
      
      const modifiedSchema = await modifySchemaWithAI(
        { tables, relationships },
        currentMessage
      );
      
      console.log('✅ Schema modified successfully:', {
        newTables: modifiedSchema.tables.length,
        newRelationships: modifiedSchema.relationships.length
      });
      
      loadDesign(modifiedSchema.tables, modifiedSchema.relationships);
      
      // Add success message to conversation
      const assistantMessage = { 
        type: 'assistant' as const, 
        content: `✅ Successfully ${modifiedSchema.tables.length > tables.length ? 'added new tables and ' : ''}updated your schema! Added ${modifiedSchema.tables.length - tables.length} new table(s) and ${modifiedSchema.relationships.length - relationships.length} new relationship(s).`,
        timestamp: new Date() 
      };
      setConversationHistory(prev => [...prev, assistantMessage]);
      
      toast.success(`Schema updated! Added ${modifiedSchema.tables.length - tables.length} table(s)`);
    } catch (err) {
      console.error('❌ AI Schema Assistant error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to modify schema';
      setError(errorMessage);
      
      // Add error message to conversation
      const errorResponse = { 
        type: 'assistant' as const, 
        content: `❌ Error: ${errorMessage}`,
        timestamp: new Date() 
      };
      setConversationHistory(prev => [...prev, errorResponse]);
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
        <h3 className="font-semibold">AI Schema Assistant</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="p-4">
        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="mb-4 max-h-48 overflow-y-auto space-y-2">
            {conversationHistory.map((msg, index) => (
              <div 
                key={index} 
                className={`p-2 rounded text-sm ${
                  msg.type === 'user' 
                    ? 'bg-purple-100 text-purple-800 ml-4' 
                    : 'bg-gray-100 text-gray-800 mr-4'
                }`}
              >
                <div className="font-medium text-xs mb-1">
                  {msg.type === 'user' ? 'You' : 'AI Assistant'}
                </div>
                {msg.content}
              </div>
            ))}
          </div>
        )}
        
        <div className="mb-4 text-sm text-gray-600">
          Ask me to create tables or modify your schema. For example:
          <ul className="mt-2 space-y-1 text-xs">
            <li>• "Create a users table with email, password, and profile fields"</li>
            <li>• "Add a products table with name, price, and category"</li>
            <li>• "Create a blog schema with posts, comments, and tags"</li>
            <li>• "Add an orders table related to users and products"</li>
            <li>• "Create authentication and profile tables"</li>
          </ul>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5" />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
        
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what tables you want to create or how to modify the schema..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        
        {isLoading && (
          <div className="mt-2 text-xs text-gray-500 flex items-center">
            <Loader2 size={12} className="animate-spin mr-1" />
            AI is generating tables and relationships...
          </div>
        )}
      </div>
    </div>
  );
}
