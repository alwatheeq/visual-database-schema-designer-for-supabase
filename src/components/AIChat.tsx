import React, { useState } from 'react';
import { Send, X, Loader2, AlertCircle } from 'lucide-react';
import { useSchemaStore } from '../store/schemaStore';
import { modifySchemaWithAI } from '../utils/openaiClient';
import toast from 'react-hot-toast';

interface AIChatProps {
  onClose: () => void;
}

export default function AIChat({ onClose }: AIChatProps) {
  const { tables, relationships, loadSchema } = useSchemaStore();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const modifiedSchema = await modifySchemaWithAI(
        { tables, relationships },
        message
      );
      
      loadSchema(modifiedSchema.tables, modifiedSchema.relationships);
      toast.success('Schema updated successfully!');
      setMessage('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to modify schema';
      setError(errorMessage);
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
        <div className="mb-4 text-sm text-gray-600">
          Ask me to modify your schema. For example:
          <ul className="mt-2 space-y-1 text-xs">
            <li>• "Add a users table with email and password"</li>
            <li>• "Create a blog schema with posts and comments"</li>
            <li>• "Add authentication tables"</li>
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
            placeholder="Describe how you want to modify the schema..."
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
      </div>
    </div>
  );
}
