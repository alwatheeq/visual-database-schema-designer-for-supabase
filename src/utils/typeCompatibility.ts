// Type compatibility rules for relationships
export const TYPE_COMPATIBILITY_RULES: Record<string, string[]> = {
  // UUID types
  'uuid': ['uuid'],
  
  // Integer types
  'bigint': ['bigint', 'int', 'smallint'],
  'int': ['bigint', 'int', 'smallint'],
  'smallint': ['bigint', 'int', 'smallint'],
  
  // Decimal types
  'decimal': ['decimal', 'numeric', 'real', 'double precision'],
  'numeric': ['decimal', 'numeric', 'real', 'double precision'],
  'real': ['decimal', 'numeric', 'real', 'double precision'],
  'double precision': ['decimal', 'numeric', 'real', 'double precision'],
  
  // Text types
  'text': ['text', 'varchar', 'char'],
  'varchar': ['text', 'varchar', 'char'],
  'char': ['text', 'varchar', 'char'],
  
  // Date/Time types
  'timestamp': ['timestamp', 'timestamptz'],
  'timestamptz': ['timestamp', 'timestamptz'],
  'date': ['date'],
  'time': ['time', 'timetz'],
  'timetz': ['time', 'timetz'],
  'interval': ['interval'],
  
  // Boolean
  'boolean': ['boolean'],
  
  // JSON types
  'json': ['json', 'jsonb'],
  'jsonb': ['json', 'jsonb'],
  
  // Array
  'array': ['array'],
};

export function areTypesCompatible(type1: string, type2: string): boolean {
  // Exact match
  if (type1 === type2) return true;
  
  // Check compatibility rules
  const compatibleTypes = TYPE_COMPATIBILITY_RULES[type1];
  if (compatibleTypes && compatibleTypes.includes(type2)) {
    return true;
  }
  
  // Check reverse compatibility
  const reverseCompatibleTypes = TYPE_COMPATIBILITY_RULES[type2];
  if (reverseCompatibleTypes && reverseCompatibleTypes.includes(type1)) {
    return true;
  }
  
  return false;
}

export function getIncompatibilityMessage(type1: string, type2: string): string {
  const compatibleTypes = TYPE_COMPATIBILITY_RULES[type1] || [type1];
  return `Cannot create relationship: "${type1}" can only connect to [${compatibleTypes.join(', ')}], but target field is "${type2}"`;
}
