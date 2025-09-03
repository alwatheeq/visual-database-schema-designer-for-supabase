import React, { useState } from 'react';
import { X, Save, Loader2, Edit3, Palette, Move } from 'lucide-react';
import { useSchemaStore } from '../store/schemaStore';
import { DesignService } from '../services/designService';
import toast from 'react-hot-toast';

interface SaveDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  viewport?: { x: number; y: number; zoom: number };
}

const SaveDesignModal: React.FC<SaveDesignModalProps> = ({ isOpen, onClose, onSaved, viewport }) => {
  const { tables, relationships, currentDesignId, currentDesignName, setCurrentDesign } = useSchemaStore();
  const [name, setName] = useState(currentDesignName || '');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdate, setIsUpdate] = useState(!!currentDesignId);

  React.useEffect(() => {
    if (isOpen) {
      setName(currentDesignName || '');
      setIsUpdate(!!currentDesignId);
      setDescription('');
    }
  }, [isOpen, currentDesignName, currentDesignId]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a design name');
      return;
    }

    if (tables.length === 0) {
      toast.error('Cannot save empty design');
      return;
    }

    setIsSaving(true);
    
    try {
      console.log('Starting save operation...', { isUpdate, currentDesignId, name });
      
      let savedDesign;
      
      // Include complete visual data with positions and colors
      const visualSchemaData = {
        tables: tables.map(table => ({
          ...table,
          position: table.position || { x: 100, y: 100 },
          color: table.color || '#3B82F6'
        })),
        relationships,
        viewport: viewport || { x: 0, y: 0, zoom: 1 }
      };
      
      if (isUpdate && currentDesignId) {
        // Update existing design with visual data
        console.log('Updating existing design:', currentDesignId);
        savedDesign = await DesignService.updateDesign(currentDesignId, {
          name: name.trim(),
          description: description.trim() || undefined,
          schema: visualSchemaData
        });
        toast.success('Design and layout updated successfully!');
      } else {
        // Create new design with visual data
        console.log('Creating new design:', name);
        savedDesign = await DesignService.saveDesign({
          name: name.trim(),
          description: description.trim() || undefined,
          schema: visualSchemaData
        });
        toast.success('Design and layout saved successfully!');
      }

      console.log('Save operation completed:', savedDesign);
      
      // Update the current design info in the store
      setCurrentDesign(savedDesign.id, savedDesign.name);
      
      setName('');
      setDescription('');
      onClose();
      onSaved?.();
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save design');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setName('');
      setDescription('');
      onClose();
    }
  };

  const toggleSaveMode = () => {
    setIsUpdate(!isUpdate);
    if (!isUpdate) {
      // Switching to update mode
      setName(currentDesignName || '');
    } else {
      // Switching to save as new mode
      setName('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isUpdate ? 'Update Design' : 'Save New Design'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {currentDesignId && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
              <div className="flex items-center text-sm text-blue-700">
                <Edit3 className="w-4 h-4 mr-2" />
                <span>Current: {currentDesignName}</span>
              </div>
              <button
                onClick={toggleSaveMode}
                disabled={isSaving}
                className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
              >
                {isUpdate ? 'Save as New' : 'Update Current'}
              </button>
            </div>
          )}

          <div>
            <label htmlFor="design-name" className="block text-sm font-medium text-gray-700 mb-2">
              Design Name *
            </label>
            <input
              id="design-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter design name..."
              disabled={isSaving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="design-description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="design-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your database design..."
              disabled={isSaving}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
              maxLength={500}
            />
          </div>

          <div className="bg-gray-50 rounded-md p-3 space-y-2">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Visual Design Data</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p className="flex items-center">
                <span className="text-gray-500 mr-2">Tables:</span> 
                {tables.length} tables with positions
              </p>
              <p className="flex items-center">
                <span className="text-gray-500 mr-2">Relationships:</span> 
                {relationships.length} connections
              </p>
              <p className="flex items-center">
                <Move className="w-3 h-3 mr-1 text-gray-400" />
                <span className="text-gray-500 mr-2">Layout:</span> 
                Positions preserved
              </p>
              <p className="flex items-center">
                <Palette className="w-3 h-3 mr-1 text-gray-400" />
                <span className="text-gray-500 mr-2">Styling:</span> 
                Colors preserved
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isUpdate ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isUpdate ? 'Update Design' : 'Save Design'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveDesignModal;
