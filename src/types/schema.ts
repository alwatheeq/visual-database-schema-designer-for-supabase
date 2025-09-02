export interface Field {
  id: string;
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isUnique?: boolean;
  isNullable?: boolean;
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
  enableRLS?: boolean;
  policies?: Policy[];
}

export interface Policy {
  id: string;
  name: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  role: string;
  using?: string;
  withCheck?: string;
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

// Field types for UI dropdowns - simplified version of DATABASE_TYPES
export const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'varchar', label: 'Varchar' },
  { value: 'integer', label: 'Integer' },
  { value: 'bigint', label: 'Big Integer' },
  { value: 'smallint', label: 'Small Integer' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'real', label: 'Real' },
  { value: 'double precision', label: 'Double Precision' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'timestamp', label: 'Timestamp' },
  { value: 'timestamptz', label: 'Timestamp with Timezone' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'uuid', label: 'UUID' },
  { value: 'json', label: 'JSON' },
  { value: 'jsonb', label: 'JSONB' },
  { value: 'bytea', label: 'Binary Data' }
];

// Default value suggestions for different field types
export const DEFAULT_VALUE_SUGGESTIONS: Record<string, string[]> = {
  'uuid': ['gen_random_uuid()', 'auth.uid()'],
  'timestamp': ['now()', 'CURRENT_TIMESTAMP'],
  'timestamptz': ['now()', 'CURRENT_TIMESTAMP'],
  'date': ['CURRENT_DATE', 'now()'],
  'time': ['CURRENT_TIME', 'now()'],
  'boolean': ['false', 'true'],
  'integer': ['0', '1'],
  'bigint': ['0', '1'],
  'smallint': ['0', '1'],
  'decimal': ['0.0', '1.0'],
  'numeric': ['0.0', '1.0'],
  'real': ['0.0', '1.0'],
  'double precision': ['0.0', '1.0'],
  'text': ["''", "'default'"],
  'varchar': ["''", "'default'"],
  'json': ["'{}'", "'[]'"],
  'jsonb': ["'{}'", "'[]'"]
};

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
