export interface Field {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  isNullable: boolean;
  defaultValue?: string;
  references?: {
    table: string;
    field: string;
  };
}

export interface Policy {
  id: string;
  name: string;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  role: string;
  using?: string;
  check?: string;
}

export interface Table {
  id: string;
  name: string;
  description?: string;
  fields: Field[];
  position: { x: number; y: number };
  color: string;
  enableRLS: boolean;
  policies?: Policy[];
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

export interface VisualDesign {
  tables: Table[];
  relationships: Relationship[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  metadata?: {
    version: string;
    lastModified: string;
  };
}

// Field type options for dropdowns
export const FIELD_TYPES = [
  { value: 'uuid', label: 'UUID' },
  { value: 'text', label: 'Text' },
  { value: 'varchar', label: 'Varchar' },
  { value: 'int', label: 'Integer' },
  { value: 'bigint', label: 'Big Integer' },
  { value: 'smallint', label: 'Small Integer' },
  { value: 'serial', label: 'Serial' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'real', label: 'Real' },
  { value: 'double precision', label: 'Double Precision' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'timestamp', label: 'Timestamp' },
  { value: 'timestamptz', label: 'Timestamp with Timezone' },
  { value: 'interval', label: 'Interval' },
  { value: 'json', label: 'JSON' },
  { value: 'jsonb', label: 'JSONB' },
  { value: 'array', label: 'Array' },
  { value: 'enum', label: 'Enum' },
  { value: 'bytea', label: 'Binary' },
];

// Default value suggestions based on field type
export const DEFAULT_VALUE_SUGGESTIONS: Record<string, string[]> = {
  uuid: ['gen_random_uuid()', 'auth.uid()'],
  text: ["''", "'pending'", "'active'", "'inactive'", "'draft'", "'published'"],
  varchar: ["''", "'pending'", "'active'", "'inactive'", "'draft'", "'published'"],
  int: ['0', '1', '-1', '100', '1000'],
  bigint: ['0', '1', '-1', '100', '1000'],
  smallint: ['0', '1', '-1', '10', '100'],
  serial: ['1', '0'],
  decimal: ['0.00', '1.00', '100.00', '0.50'],
  numeric: ['0.00', '1.00', '100.00', '0.50'],
  real: ['0.0', '1.0', '100.0', '0.5'],
  'double precision': ['0.0', '1.0', '100.0', '0.5'],
  boolean: ['false', 'true'],
  date: ['CURRENT_DATE', "'2024-01-01'"],
  time: ['CURRENT_TIME', "'00:00:00'", "'12:00:00'"],
  timestamp: ['now()', 'CURRENT_TIMESTAMP'],
  timestamptz: ['now()', 'CURRENT_TIMESTAMP'],
  interval: ["'1 day'", "'1 hour'", "'30 minutes'", "'1 week'", "'1 month'"],
  json: ["'{}'", "'[]'", "'{\"status\": \"active\"}'"],
  jsonb: ["'{}'", "'[]'", "'{\"status\": \"active\"}'"],
  array: ["'{}'", "ARRAY[]::text[]"],
  enum: ["'option1'", "'option2'", "'option3'"],
  bytea: ["'\\x'", "decode('', 'hex')"],
};
