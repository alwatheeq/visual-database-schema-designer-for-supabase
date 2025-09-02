import React from 'react';
import { X, Copy, Download, Loader2, AlertCircle } from 'lucide-react';
import { useSchemaStore } from '../store/schemaStore';
import { generateSupabaseScript, generateBoltPrompt } from '../utils/scriptGenerator';
import { toast } from 'react-hot-toast';

interface ScriptModalProps {
  onClose: () => void;
}

export default function ScriptModal({ onClose }: ScriptModalProps) {
  const { tables, relationships } = useSchemaStore();
  const [activeTab, setActiveTab] = React.useState<'supabase' | 'bolt'>('supabase');
  const [script, setScript] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const generateScript = async () => {
      setIsGenerating(true);
      setError(null);
      
      try {
        if (activeTab === 'supabase') {
          const generatedScript = await generateSupabaseScript({ tables, relationships });
          setScript(generatedScript);
        } else {
          const prompt = generateBoltPrompt({ tables, relationships });
          setScript(prompt);
        }
      } catch (err) {
        console.error('Script generation error:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate script');
        toast.error('Failed to generate script. Check your OpenAI API key.');
      } finally {
        setIsGenerating(false);
      }
    };

    generateScript();
  }, [tables, relationships, activeTab]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(script);
    toast.success('Copied to clipboard!');
  };

  const downloadScript = () => {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab === 'supabase' ? 'migration.sql' : 'schema-prompt.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded successfully!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Generated Scripts</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('supabase')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'supabase'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Supabase SQL
          </button>
          <button
            onClick={() => setActiveTab('bolt')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'bolt'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Bolt Prompt
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {isGenerating ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">Generating {activeTab === 'supabase' ? 'SQL script' : 'prompt'}...</p>
                <p className="text-sm text-gray-500 mt-1">Using AI to create optimized Supabase-compliant code</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Generation Failed</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <p className="text-sm text-gray-500">
                  Make sure your OpenAI API key is configured correctly in the .env file.
                  Falling back to manual generation.
                </p>
              </div>
            </div>
          ) : (
            <pre className="flex-1 p-4 bg-gray-50 overflow-auto">
              <code className="text-sm font-mono text-gray-800 whitespace-pre">
                {script}
              </code>
            </pre>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-gray-500">
            {activeTab === 'supabase' 
              ? 'Supabase-compliant PostgreSQL migration script'
              : 'Prompt for Bolt to generate the database'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              disabled={isGenerating || !script}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy size={16} />
              Copy
            </button>
            <button
              onClick={downloadScript}
              disabled={isGenerating || !script}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
