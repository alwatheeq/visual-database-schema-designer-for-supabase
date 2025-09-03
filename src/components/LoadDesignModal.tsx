import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, Database, Trash2, FileText, Move, Palette, Layers, AlertCircle } from 'lucide-react';
import { useSchemaStore } from '../store/schemaStore';
import { DesignService } from '../services/designService';
import { Design } from '../types/design';
import toast from 'react-hot-toast';

interface LoadDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoaded?: (viewport?: { x: number; y: number; zoom: number }) => void;
}

const LoadDesignModal: React.FC<LoadDesignModalProps> = ({ isOpen, onClose, onLoaded }) => {
  const { loadDesign } = useSchemaStore();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchDesigns = async () => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      console.log('Fetching designs from database...');
      const loadedDesigns = await DesignService.loadDesigns();
      console.log('Designs fetched successfully:', loadedDesigns.length);
      setDesigns(loadedDesigns);
    } catch (error) {
      console.error('Load error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load designs';
      setLoadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDesigns();
    }
  }, [isOpen]);

  const handleLoad = async (design: Design) => {
    try {
      console.log('Loading design:', design.id, design.name);
      const { tables, relationships, viewport } = design.schema;
      
      // Load complete visual design with positions and colors
      loadDesign(tables, relationships, design.id, design.name);
      
      toast.success(`Loaded design: ${design.name} with visual layout`);
      onClose();
      
      // Pass viewport data to parent if available
      onLoaded?.(viewport);
    } catch (error) {
      console.error('Load design error:', error);
      toast.error('Failed to load design');
    }
  };

  const handleDelete = async (design: Design) => {
    if (!confirm(`Are you sure you want to delete "${design.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(design.id);
    try {
      console.log('Deleting design:', design.id);
      await DesignService.deleteDesign(design.id);
      setDesigns(designs.filter(d => d.id !== design.id));
      toast.success(`Deleted design: ${design.name}`);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete design');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hasVisualData = (design: Design) => {
    return design.schema.tables?.some(table => table.position && table.color);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Load Design from Database</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading visual designs from database...</span>
            </div>
          ) : loadError ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Designs</h3>
              <p className="text-gray-500 mb-4">{loadError}</p>
              <button
                onClick={fetchDesigns}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : designs.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Designs</h3>
              <p className="text-gray-500">Create and save your first database design to see it here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {design.name}
                        </h3>
                        {hasVisualData(design) && (
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Move className="w-3 h-3 mr-1" />
                              Layout
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <Palette className="w-3 h-3 mr-1" />
                              Styled
                            </span>
                          </div>
                        )}
                      </div>
                      {design.description && (
                        <p className="text-gray-600 text-sm mb-3 flex items-start">
                          <FileText className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                          {design.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Layers className="w-4 h-4 mr-1" />
                          {design.schema.tables?.length || 0} tables
                        </span>
                        <span className="flex items-center">
                          <Database className="w-4 h-4 mr-1" />
                          {design.schema.relationships?.length || 0} relationships
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(design.updated_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleDelete(design)}
                        disabled={deletingId === design.id}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title="Delete Design"
                      >
                        {deletingId === design.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleLoad(design)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Load Design
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadDesignModal;
