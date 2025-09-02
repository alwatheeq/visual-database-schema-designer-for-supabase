import { create } from 'zustand';
import { Table, Field, Relationship } from './types';

interface Store {
  tables: Table[];
  relationships: Relationship[];
  selectedTable: string | null;
  selectedRelationship: string | null;
  
  addTable: (table: Table) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  
  addField: (tableId: string, field: Field) => void;
  updateField: (tableId: string, fieldId: string, updates: Partial<Field>) => void;
  deleteField: (tableId: string, fieldId: string) => void;
  
  addRelationship: (relationship: Relationship) => void;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;
  
  setSelectedTable: (id: string | null) => void;
  setSelectedRelationship: (id: string | null) => void;
  
  loadFromStorage: () => void;
}

export const useStore = create<Store>((set, get) => ({
  tables: [],
  relationships: [],
  selectedTable: null,
  selectedRelationship: null,
  
  addTable: (table) => set((state) => ({
    tables: [...state.tables, table]
  })),
  
  updateTable: (id, updates) => set((state) => ({
    tables: state.tables.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  
  deleteTable: (id) => set((state) => ({
    tables: state.tables.filter(t => t.id !== id),
    relationships: state.relationships.filter(r => r.source !== id && r.target !== id),
    selectedTable: state.selectedTable === id ? null : state.selectedTable
  })),
  
  addField: (tableId, field) => set((state) => ({
    tables: state.tables.map(t => 
      t.id === tableId 
        ? { ...t, fields: [...t.fields, field] }
        : t
    )
  })),
  
  updateField: (tableId, fieldId, updates) => set((state) => ({
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
  })),
  
  deleteField: (tableId, fieldId) => set((state) => ({
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
  })),
  
  addRelationship: (relationship) => set((state) => ({
    relationships: [...state.relationships, relationship]
  })),
  
  updateRelationship: (id, updates) => set((state) => ({
    relationships: state.relationships.map(r => 
      r.id === id ? { ...r, ...updates } : r
    )
  })),
  
  deleteRelationship: (id) => set((state) => ({
    relationships: state.relationships.filter(r => r.id !== id),
    selectedRelationship: state.selectedRelationship === id ? null : state.selectedRelationship
  })),
  
  setSelectedTable: (id) => set({ selectedTable: id }),
  
  setSelectedRelationship: (id) => set({ selectedRelationship: id }),
  
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
  }
}));

// Auto-load from storage on initialization
if (typeof window !== 'undefined') {
  useStore.getState().loadFromStorage();
}
