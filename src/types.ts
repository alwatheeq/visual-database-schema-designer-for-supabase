export interface Field {
  id: string;
  name: string;
  type: string;
  primaryKey?: boolean;
  unique?: boolean;
  nullable?: boolean;
  defaultValue?: string;
  references?: {
    table: string;
    field: string;
  };
}

export interface Table {
  id: string;
  name: string;
  fields: Field[];
  position: {
    x: number;
    y: number;
  };
  color?: string;
}

export interface Relationship {
  id: string;
  source: string;
  target: string;
  sourceField: string;
  targetField: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface DatabaseType {
  name: string;
  category: 'text' | 'numeric' | 'date' | 'boolean' | 'json' | 'uuid' | 'binary';
  supportsLength?: boolean;
  supportsPrecision?: boolean;
  supportsScale?: boolean;
}

export const DATABASE_TYPES: DatabaseType[] = [
  // Text types
  { name: 'text', category: 'text' },
  { name: 'varchar', category: 'text', supportsLength: true },
  { name: 'char', category: 'text', supportsLength: true },
  
  // Numeric types
  { name: 'integer', category: 'numeric' },
  { name: 'bigint', category: 'numeric' },
  { name: 'smallint', category: 'numeric' },
  { name: 'decimal', category: 'numeric', supportsPrecision: true, supportsScale: true },
  { name: 'numeric', category: 'numeric', supportsPrecision: true, supportsScale: true },
  { name: 'real', category: 'numeric' },
  { name: 'double precision', category: 'numeric' },
  
  // Date/Time types
  { name: 'timestamp', category: 'date' },
  { name: 'timestamptz', category: 'date' },
  { name: 'date', category: 'date' },
  { name: 'time', category: 'date' },
  { name: 'timetz', category: 'date' },
  { name: 'interval', category: 'date' },
  
  // Boolean
  { name: 'boolean', category: 'boolean' },
  
  // JSON
  { name: 'json', category: 'json' },
  { name: 'jsonb', category: 'json' },
  
  // UUID
  { name: 'uuid', category: 'uuid' },
  
  // Binary
  { name: 'bytea', category: 'binary' }
];

export const RELATIONSHIP_TYPES = [
  { value: 'one-to-one', label: 'One to One' },
  { value: 'one-to-many', label: 'One to Many' },
  { value: 'many-to-many', label: 'Many to Many' }
] as const;

export const CASCADE_OPTIONS = [
  { value: 'CASCADE', label: 'CASCADE' },
  { value: 'SET NULL', label: 'SET NULL' },
  { value: 'RESTRICT', label: 'RESTRICT' },
  { value: 'NO ACTION', label: 'NO ACTION' }
] as const;
