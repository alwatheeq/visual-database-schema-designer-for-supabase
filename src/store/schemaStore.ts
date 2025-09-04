import { create } from 'zustand';
import { Table, Field, Relationship, Policy } from '../types/schema';

interface SchemaStore {
  tables: Table[];
  relationships: Relationship[];
  selectedTable: string | null;
  selectedRelationship: string | null;
  currentDesignId: string | null;
  currentDesignName: string | null;
  
  addTable: (table: Table) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  
  addField: (tableId: string, field: Field) => void;
  updateField: (tableId: string, fieldId: string, updates: Partial<Field>) => void;
  deleteField: (tableId: string, fieldId: string) => void;
  
  addRelationship: (relationship: Relationship) => void;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;
  
  addPolicy: (tableId: string, policy: Policy) => void;
  updatePolicy: (tableId: string, policyId: string, updates: Partial<Policy>) => void;
  deletePolicy: (tableId: string, policyId: string) => void;
  
  setSelectedTable: (id: string | null) => void;
  setSelectedRelationship: (id: string | null) => void;
  
  loadDesign: (tables: Table[], relationships: Relationship[], designId?: string, designName?: string) => void;
  clearDesign: () => void;
  setCurrentDesign: (id: string | null, name: string | null) => void;
  
  // Keep localStorage methods for backward compatibility and local backup
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useSchemaStore = create<SchemaStore>((set, get) => ({
  tables: [],
  relationships: [],
  selectedTable: null,
  selectedRelationship: null,
  currentDesignId: null,
  currentDesignName: null,
  
  addTable: (table) => {
    set((state) => ({
      tables: [...state.tables, table]
    }));
    // Keep localStorage backup for safety
    get().saveToStorage();
  },
  
  updateTable: (id, updates) => {
    // Don't allow updating the auth.users system table
    if (id === 'auth-users-table') return;
    
    set((state) => ({
      tables: state.tables.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    get().saveToStorage();
  },
  
  deleteTable: (id) => {
    // Don't allow deleting the auth.users system table
    if (id === 'auth-users-table') return;
    
    set((state) => ({
      tables: state.tables.filter(t => t.id !== id),
      relationships: state.relationships.filter(r => r.source !== id && r.target !== id),
      selectedTable: state.selectedTable === id ? null : state.selectedTable
    }));
    get().saveToStorage();
  },
  
  addField: (tableId, field) => {
    set((state) => ({
      tables: state.tables.map(t => 
        t.id === tableId 
          ? { ...t, fields: [...t.fields, field] }
          : t
      )
    }));
    get().saveToStorage();
  },
  
  updateField: (tableId, fieldId, updates) => {
    set((state) => ({
      tables: state.tables.map(t => 
        t.id === tableId 
          ? {
              ...t,
              fields: t.fields.map(f => 
                f.id === fieldId ? { ...f, ...updates } : f
              )
            }
          : t
      )
    }));
    get().saveToStorage();
  },
  
  deleteField: (tableId, fieldId) => {
    set((state) => ({
      tables: state.tables.map(t => 
        t.id === tableId 
          ? {
              ...t,
              fields: t.fields.filter(f => f.id !== fieldId)
            }
          : t
      ),
      relationships: state.relationships.filter(r => {
        if (r.sourceField === fieldId || r.targetField === fieldId) {
          return false;
        }
        return true;
      })
    }));
    get().saveToStorage();
  },
  
  addRelationship: (relationship) => {
    set((state) => ({
      relationships: [...state.relationships, relationship]
    }));
    get().saveToStorage();
  },
  
  updateRelationship: (id, updates) => {
    set((state) => ({
      relationships: state.relationships.map(r => 
        r.id === id ? { ...r, ...updates } : r
      )
    }));
    get().saveToStorage();
  },
  
  deleteRelationship: (id) => {
    set((state) => ({
      relationships: state.relationships.filter(r => r.id !== id),
      selectedRelationship: state.selectedRelationship === id ? null : state.selectedRelationship
    }));
    get().saveToStorage();
  },
  
  addPolicy: (tableId, policy) => {
    set((state) => ({
      tables: state.tables.map(t => 
        t.id === tableId 
          ? { ...t, policies: [...(t.policies || []), policy] }
          : t
      )
    }));
    get().saveToStorage();
  },
  
  updatePolicy: (tableId, policyId, updates) => {
    set((state) => ({
      tables: state.tables.map(t => 
        t.id === tableId 
          ? {
              ...t,
              policies: (t.policies || []).map(p => 
                p.id === policyId ? { ...p, ...updates } : p
              )
            }
          : t
      )
    }));
    get().saveToStorage();
  },
  
  deletePolicy: (tableId, policyId) => {
    set((state) => ({
      tables: state.tables.map(t => 
        t.id === tableId 
          ? {
              ...t,
              policies: (t.policies || []).filter(p => p.id !== policyId)
            }
          : t
      )
    }));
    get().saveToStorage();
  },
  
  setSelectedTable: (id) => set({ selectedTable: id }),
  
  setSelectedRelationship: (id) => set({ selectedRelationship: id }),
  
  loadDesign: (tables, relationships, designId, designName) => {
    set({
      tables,
      relationships,
      currentDesignId: designId || null,
      currentDesignName: designName || null,
      selectedTable: null,
      selectedRelationship: null
    });
    // Also save to localStorage as backup
    get().saveToStorage();
  },
  
  clearDesign: () => {
    set({
      tables: [],
      relationships: [],
      selectedTable: null,
      selectedRelationship: null,
      currentDesignId: null,
      currentDesignName: null
    });
    get().saveToStorage();
  },
  
  setCurrentDesign: (id, name) => {
    set({
      currentDesignId: id,
      currentDesignName: name
    });
  },
  
  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem('database-schema');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.tables && data.relationships) {
          set({
            tables: data.tables,
            relationships: data.relationships
          });
        }
      }
    } catch (error) {
      console.error('Failed to load schema from storage:', error);
    }
  },

  saveToStorage: () => {
    try {
      const { tables, relationships } = get();
      localStorage.setItem('database-schema', JSON.stringify({
        tables,
        relationships
      }));
    } catch (error) {
      console.error('Failed to save schema to storage:', error);
    }
  }
}));

// Auto-load from storage on initialization
if (typeof window !== 'undefined') {
  useSchemaStore.getState().loadFromStorage();
}
