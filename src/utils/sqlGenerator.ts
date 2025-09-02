import { Table, Relationship, Field } from '../types/schema';

export function generateSupabaseSQL(tables: Table[], relationships: Relationship[]): string {
  let sql = `/*
# Database Schema Migration

## Overview
This migration creates the complete database schema with tables, relationships, and security policies.

## Tables Created
${tables.map(t => `- ${t.name}: ${t.fields.length} fields`).join('\n')}

## Security
- Row Level Security (RLS) enabled on all tables
- Policies configured for authenticated access
*/

`;

  // Create tables
  tables.forEach((table) => {
    sql += `-- Create ${table.name} table\n`;
    sql += `CREATE TABLE IF NOT EXISTS ${table.name} (\n`;
    
    const fieldDefinitions = table.fields.map((field) => {
      let def = `  ${field.name} ${field.type}`;
      
      if (field.isPrimaryKey) {
        def += ' PRIMARY KEY';
        if (field.type === 'uuid') {
          def += ' DEFAULT gen_random_uuid()';
        }
      }
      
      if (field.isUnique && !field.isPrimaryKey) {
        def += ' UNIQUE';
      }
      
      if (!field.isNullable && !field.isPrimaryKey) {
        def += ' NOT NULL';
      }
      
      if (field.defaultValue && !field.isPrimaryKey) {
        if (field.defaultValue === 'now()' || field.defaultValue === 'CURRENT_TIMESTAMP') {
          def += ` DEFAULT ${field.defaultValue}`;
        } else if (field.type === 'boolean') {
          def += ` DEFAULT ${field.defaultValue}`;
        } else if (field.type.includes('int') || field.type.includes('numeric') || field.type.includes('decimal')) {
          def += ` DEFAULT ${field.defaultValue}`;
        } else {
          def += ` DEFAULT '${field.defaultValue}'`;
        }
      }
      
      return def;
    });
    
    sql += fieldDefinitions.join(',\n');
    
    // Add foreign key constraints
    const foreignKeyFields = table.fields.filter(f => f.isForeignKey && f.references);
    if (foreignKeyFields.length > 0) {
      sql += ',\n';
      const fkConstraints = foreignKeyFields.map((field) => {
        return `  CONSTRAINT fk_${table.name}_${field.name} FOREIGN KEY (${field.name}) REFERENCES ${field.references?.table}(${field.references?.field}) ON DELETE CASCADE`;
      });
      sql += fkConstraints.join(',\n');
    }
    
    sql += '\n);\n\n';
    
    // Add indexes for foreign keys
    foreignKeyFields.forEach((field) => {
      sql += `CREATE INDEX IF NOT EXISTS idx_${table.name}_${field.name} ON ${table.name}(${field.name});\n`;
    });
    
    if (foreignKeyFields.length > 0) {
      sql += '\n';
    }
  });
  
  // Enable RLS
  sql += '-- Enable Row Level Security\n';
  tables.forEach((table) => {
    if (table.enableRLS) {
      sql += `ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;\n`;
    }
  });
  sql += '\n';
  
  // Create RLS policies
  tables.forEach((table) => {
    if (table.enableRLS && table.policies.length > 0) {
      sql += `-- RLS Policies for ${table.name}\n`;
      table.policies.forEach((policy) => {
        sql += `CREATE POLICY "${policy.name}"\n`;
        sql += `  ON ${table.name}\n`;
        sql += `  FOR ${policy.operation}\n`;
        sql += `  TO ${policy.role}\n`;
        if (policy.using) {
          sql += `  USING (${policy.using})\n`;
        }
        if (policy.withCheck) {
          sql += `  WITH CHECK (${policy.withCheck})\n`;
        }
        sql += ';\n\n';
      });
    }
  });
  
  // Add created_at and updated_at triggers
  sql += '-- Add updated_at trigger function\n';
  sql += `CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;\n\n`;
  
  tables.forEach((table) => {
    const hasUpdatedAt = table.fields.some(f => f.name === 'updated_at');
    if (hasUpdatedAt) {
      sql += `CREATE TRIGGER update_${table.name}_updated_at
  BEFORE UPDATE ON ${table.name}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();\n\n`;
    }
  });
  
  return sql;
}

export function generateBoltPrompt(tables: Table[], relationships: Relationship[]): string {
  let prompt = `Create a Supabase-powered web application with the following database schema:\n\n`;
  
  prompt += `## Database Tables\n\n`;
  
  tables.forEach((table) => {
    prompt += `### ${table.name} Table\n`;
    prompt += `Fields:\n`;
    table.fields.forEach((field) => {
      prompt += `- ${field.name}: ${field.type}`;
      if (field.isPrimaryKey) prompt += ' (Primary Key)';
      if (field.isForeignKey) prompt += ` (Foreign Key -> ${field.references?.table}.${field.references?.field})`;
      if (field.isUnique) prompt += ' (Unique)';
      if (!field.isNullable) prompt += ' (Required)';
      if (field.defaultValue) prompt += ` (Default: ${field.defaultValue})`;
      prompt += '\n';
    });
    
    if (table.enableRLS) {
      prompt += `\nRow Level Security: Enabled\n`;
      if (table.policies.length > 0) {
        prompt += `Policies:\n`;
        table.policies.forEach((policy) => {
          prompt += `- ${policy.name}: ${policy.operation} for ${policy.role}\n`;
        });
      }
    }
    prompt += '\n';
  });
  
  if (relationships.length > 0) {
    prompt += `## Relationships\n\n`;
    relationships.forEach((rel) => {
      const sourceTable = tables.find(t => t.id === rel.source);
      const targetTable = tables.find(t => t.id === rel.target);
      prompt += `- ${sourceTable?.name}.${rel.sourceField} -> ${targetTable?.name}.${rel.targetField} (${rel.type})\n`;
    });
    prompt += '\n';
  }
  
  prompt += `## Requirements\n\n`;
  prompt += `1. Use Supabase for the database backend\n`;
  prompt += `2. Implement full CRUD operations for all tables\n`;
  prompt += `3. Use Row Level Security as configured\n`;
  prompt += `4. Create a modern, responsive UI with Tailwind CSS\n`;
  prompt += `5. Include proper error handling and loading states\n`;
  prompt += `6. Implement user authentication if auth tables are present\n`;
  prompt += `7. Use TypeScript for type safety\n\n`;
  
  prompt += `Please create this application with all necessary components, hooks, and utilities.`;
  
  return prompt;
}
