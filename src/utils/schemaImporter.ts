import { Table, Field, Relationship } from '../types/schema';
import { useSchemaStore } from '../store/schemaStore';
import toast from 'react-hot-toast';

interface ExternalSchema {
  tables: Array<{
    id: string;
    name: string;
    fields: Array<{
      id: string;
      name: string;
      type: string;
      isUnique?: boolean;
      isNullable?: boolean;
      isPrimaryKey?: boolean;
      defaultValue?: string;
    }>;
    position: { x: number; y: number };
  }>;
  relationships: Array<{
    id: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    toField: string;
    toTable: string;
    fromField: string;
    fromTable: string;
  }>;
}

export function convertExternalSchema(externalSchema: ExternalSchema): {
  tables: Table[];
  relationships: Relationship[];
} {
  const TABLE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
  
  // Convert tables
  const tables: Table[] = externalSchema.tables.map((table, index) => ({
    id: table.id,
    name: table.name,
    fields: table.fields.map((field) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      isPrimaryKey: field.isPrimaryKey || false,
      isForeignKey: false, // Will be updated when processing relationships
      isUnique: field.isUnique || false,
      isNullable: field.isNullable !== false, // Default to true if not explicitly false
      defaultValue: field.defaultValue,
    })),
    position: table.position,
    color: TABLE_COLORS[index % TABLE_COLORS.length],
    enableRLS: true,
    policies: [],
  }));

  // Convert relationships and update foreign key flags
  const relationships: Relationship[] = externalSchema.relationships.map((rel) => {
    // Find the actual table IDs and field IDs
    const sourceTable = tables.find(t => t.id === rel.fromTable);
    const targetTable = tables.find(t => t.id === rel.toTable);
    
    if (sourceTable && targetTable) {
      const sourceField = sourceTable.fields.find(f => f.name === rel.fromField);
      const targetField = targetTable.fields.find(f => f.name === rel.toField);
      
      // Mark target field as foreign key
      if (targetField) {
        targetField.isForeignKey = true;
        targetField.references = {
          table: sourceTable.id,
          field: sourceField?.id || rel.fromField
        };
      }
      
      return {
        id: rel.id,
        source: rel.fromTable,
        target: rel.toTable,
        sourceField: sourceField?.id || rel.fromField,
        targetField: targetField?.id || rel.toField,
        type: rel.type,
        onDelete: 'CASCADE' as const,
        onUpdate: 'CASCADE' as const,
      };
    }
    
    return {
      id: rel.id,
      source: rel.fromTable,
      target: rel.toTable,
      sourceField: rel.fromField,
      targetField: rel.toField,
      type: rel.type,
      onDelete: 'CASCADE' as const,
      onUpdate: 'CASCADE' as const,
    };
  });

  return { tables, relationships };
}

// Function to directly load a schema object
export function loadSchemaDirectly(schemaData: any) {
  try {
    if (!schemaData || !schemaData.tables || !Array.isArray(schemaData.tables)) {
      throw new Error('Invalid schema format');
    }

    // Check if this is an external schema format
    const firstTable = schemaData.tables[0];
    const firstRelationship = schemaData.relationships?.[0];
    
    if (firstRelationship && ('fromTable' in firstRelationship || 'toTable' in firstRelationship)) {
      // This looks like an external schema format
      const converted = convertExternalSchema(schemaData);
      useSchemaStore.setState({
        tables: converted.tables,
        relationships: converted.relationships,
        selectedTable: null,
        selectedRelationship: null,
        currentDesignId: null,
        currentDesignName: 'Imported Schema'
      });
      toast.success('External schema loaded successfully with products and images tables');
    } else {
      // This is our internal format
      useSchemaStore.setState({
        tables: schemaData.tables,
        relationships: schemaData.relationships || [],
        selectedTable: null,
        selectedRelationship: null
      });
      toast.success('Schema loaded successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to load schema:', error);
    toast.error('Failed to load schema: ' + (error instanceof Error ? error.message : 'Unknown error'));
    return false;
  }
}

// Auto-load the provided schema on app initialization
export function autoLoadProvidedSchema() {
  const providedSchema = {
    "tables": [
      {
        "id": "table_1756769455441_qwhhza6qo",
        "name": "products",
        "fields": [
          {"id": "field_1756769455441_0", "name": "id", "type": "serial", "isUnique": true, "isNullable": false, "isPrimaryKey": true},
          {"id": "field_1756769455441_1", "name": "name", "type": "varchar(255)", "isUnique": false, "isNullable": false, "isPrimaryKey": false},
          {"id": "field_1756769455441_2", "name": "description", "type": "text", "isUnique": false, "isNullable": true, "isPrimaryKey": false},
          {"id": "field_1756769455441_3", "name": "price", "type": "decimal", "isUnique": false, "isNullable": false, "isPrimaryKey": false},
          {"id": "field_1756769455441_4", "name": "stock_quantity", "type": "integer", "isUnique": false, "isNullable": false, "isPrimaryKey": false},
          {"id": "field_1756769455441_5", "name": "created_at", "type": "timestamptz", "isUnique": false, "isNullable": false, "defaultValue": "now()", "isPrimaryKey": false},
          {"id": "field_1756769455441_6", "name": "updated_at", "type": "timestamptz", "isUnique": false, "isNullable": false, "defaultValue": "now()", "isPrimaryKey": false}
        ],
        "position": {"x": 100, "y": 100}
      },
      {
        "id": "table_1756769455441_c4zl3n4n1",
        "name": "images",
        "fields": [
          {"id": "field_1756769455441_0", "name": "id", "type": "serial", "isUnique": true, "isNullable": false, "isPrimaryKey": true},
          {"id": "field_1756769455441_1", "name": "product_id", "type": "integer", "isUnique": false, "isNullable": false, "isPrimaryKey": false},
          {"id": "field_1756769455441_2", "name": "image_url", "type": "varchar(255)", "isUnique": false, "isNullable": false, "isPrimaryKey": false},
          {"id": "field_1756769455441_3", "name": "created_at", "type": "timestamptz", "isUnique": false, "isNullable": false, "defaultValue": "now()", "isPrimaryKey": false},
          {"id": "field_1756769455441_4", "name": "updated_at", "type": "timestamptz", "isUnique": false, "isNullable": false, "defaultValue": "now()", "isPrimaryKey": false},
          {"id": "field_1756769687575", "name": "product_id", "type": "uuid", "isUnique": false, "isNullable": true, "isPrimaryKey": false}
        ],
        "position": {"x": 572, "y": 133}
      }
    ],
    "relationships": [
      {
        "id": "rel_1756769733395",
        "type": "one-to-many",
        "toField": "product_id",
        "toTable": "table_1756769455441_c4zl3n4n1",
        "fromField": "id",
        "fromTable": "table_1756769455441_qwhhza6qo"
      }
    ]
  };
  
  // Load this schema automatically
  return loadSchemaDirectly(providedSchema);
}