import { Schema, Table, Field, Relationship } from '../types/schema';
import { openai, generateSupabaseScriptWithAI } from './openaiClient';

export async function generateSupabaseScript(schema: Schema): Promise<string> {
  const { tables, relationships } = schema;
  
  if (tables.length === 0) {
    return '-- No tables defined';
  }

  console.log('🚀 Starting Supabase SQL script generation...');
  console.log('📊 Schema:', { tables: tables.length, relationships: relationships.length });
  
  // Try OpenAI generation first
  if (!openai) {
    console.warn('⚠️ OpenAI not configured, using manual generation');
    return generateManualSupabaseScript(schema);
  }

  try {
    // Use the enhanced OpenAI generation
    return await generateSupabaseScriptWithAI(tables, relationships);
  } catch (error) {
    console.error('❌ OpenAI generation failed, falling back to manual generation:', error);
    return generateManualSupabaseScript(schema);
  }
}

function generateManualSupabaseScript(schema: Schema): string {
  const { tables, relationships } = schema;
  
  // Filter out system tables (like auth.users) from script generation
  const userTables = tables.filter(table => !(table as any).isSystemTable && table.name !== 'auth.users');
  
  let script = `/*
# Database Schema Migration
This migration creates ${userTables.length} table(s) with ${relationships.length} relationship(s).

## Tables
${userTables.map(t => `- public.${t.name}: ${t.fields.length} fields${t.enableRLS ? ' (RLS enabled)' : ''}`).join('\n')}
${tables.length > userTables.length ? '\n## System Tables (Not Created - Already Exist)\n' + 
  tables.filter(t => (t as any).isSystemTable || t.name === 'auth.users')
    .map(t => `- ${t.name}: Referenced in relationships`).join('\n') : ''}

## Relationships
${relationships.length > 0 ? relationships.map(r => {
  const sourceTable = tables.find(t => t.id === r.source);
  const targetTable = tables.find(t => t.id === r.target);
  const sourceField = sourceTable?.fields.find(f => f.id === r.sourceField);
  const targetField = targetTable?.fields.find(f => f.id === r.targetField);
  return `- ${sourceTable?.name}.${sourceField?.name} → ${targetTable?.name}.${targetField?.name} (${r.type})`;
}).join('\n') : '- No relationships defined'}
*/

`;

  // Generate CREATE TABLE statements with public schema
  userTables.forEach((table) => {
    script += `-- Create ${table.name} table\n`;
    script += `CREATE TABLE IF NOT EXISTS public.${table.name} (\n`;
    
    const fieldDefinitions = table.fields.map((field) => {
      let def = `  ${field.name} ${field.type}`;
      
      if (field.isPrimaryKey) {
        if (field.type === 'uuid') {
          def += ' DEFAULT gen_random_uuid() PRIMARY KEY';
        } else {
          def += ' PRIMARY KEY';
        }
      }
      
      if (field.defaultValue && !field.isPrimaryKey) {
        def += ` DEFAULT ${field.defaultValue}`;
      }
      
      if (!field.isNullable) {
        def += ' NOT NULL';
      }
      
      if (field.isUnique && !field.isPrimaryKey) {
        def += ' UNIQUE';
      }
      
      return def;
    });
    
    // Add timestamps if not already present
    const hasCreatedAt = table.fields.some(f => f.name === 'created_at');
    const hasUpdatedAt = table.fields.some(f => f.name === 'updated_at');
    
    if (!hasCreatedAt) {
      fieldDefinitions.push('  created_at timestamptz DEFAULT now() NOT NULL');
    }
    if (!hasUpdatedAt) {
      fieldDefinitions.push('  updated_at timestamptz DEFAULT now() NOT NULL');
    }
    
    script += fieldDefinitions.join(',\n');
    script += '\n);\n\n';
  });

  // Generate foreign key constraints with Supabase standards
  relationships.forEach((rel, index) => {
    const sourceTable = tables.find(t => t.id === rel.source);
    const targetTable = tables.find(t => t.id === rel.target);
    const sourceField = sourceTable?.fields.find(f => f.id === rel.sourceField);
    const targetField = targetTable?.fields.find(f => f.id === rel.targetField);
    
    if (sourceTable && targetTable && sourceField && targetField) {
      // Skip ALTER TABLE commands for system tables
      const isSourceSystemTable = (sourceTable as any).isSystemTable || sourceTable.name === 'auth.users';
      if (isSourceSystemTable) {
        script += `-- Skipping foreign key constraint for system table: ${sourceTable.name}\n`;
        script += `-- Note: ${sourceTable.name}.${sourceField.name} -> ${targetTable.name}.${targetField.name} relationship exists\n\n`;
        return;
      }
      
      script += `-- Add foreign key constraint for ${sourceTable.name}.${sourceField.name}\n`;
      script += `ALTER TABLE public.${sourceTable.name}\n`;
      script += `ADD CONSTRAINT ${sourceTable.name}_${sourceField.name}_fkey\n`;
      script += `FOREIGN KEY (${sourceField.name})\n`;
      // Use correct schema reference for target table
      const targetSchema = (targetTable as any).isSystemTable || targetTable.name === 'auth.users' ? '' : 'public.';
      script += `REFERENCES ${targetSchema}${targetTable.name} (${targetField.name})\n`;
      script += `ON DELETE CASCADE;\n\n`;
    }
  });

  // Generate RLS policies
  userTables.forEach((table) => {
    if (table.enableRLS) {
      script += `-- Enable RLS for ${table.name}\n`;
      script += `ALTER TABLE public.${table.name} ENABLE ROW LEVEL SECURITY;\n\n`;
      
      // Add default policies if none specified
      if (!table.policies || table.policies.length === 0) {
        script += `-- Default policy: authenticated users can manage their own data\n`;
        script += `CREATE POLICY "${table.name}_authenticated_policy"\n`;
        script += `ON public.${table.name}\n`;
        script += `FOR ALL\n`;
        script += `TO authenticated\n`;
        script += `USING (auth.uid() IS NOT NULL);\n\n`;
      } else {
        table.policies.forEach((policy) => {
          script += `-- Create policy: ${policy.name}\n`;
          script += `CREATE POLICY "${policy.name}"\n`;
          script += `ON public.${table.name}\n`;
          script += `FOR ${policy.operation}\n`;
          script += `TO ${policy.role}\n`;
          
          if (policy.using) {
            script += `USING (${policy.using})\n`;
          }
          
          if (policy.withCheck) {
            script += `WITH CHECK (${policy.withCheck})\n`;
          }
          
          script += ';\n\n';
        });
      }
    }
  });

  // Generate indexes for foreign keys
  relationships.forEach((rel) => {
    const sourceTable = tables.find(t => t.id === rel.source);
    const sourceField = sourceTable?.fields.find(f => f.id === rel.sourceField);
    
    // Only create indexes for user tables, not system tables
    if (sourceTable && sourceField && !((sourceTable as any).isSystemTable || sourceTable.name === 'auth.users')) {
      script += `-- Create index for foreign key performance\n`;
      script += `CREATE INDEX IF NOT EXISTS idx_${sourceTable.name}_${sourceField.name}\n`;
      script += `ON public.${sourceTable.name} (${sourceField.name});\n\n`;
    }
  });

  // Add update trigger for updated_at
  userTables.forEach((table) => {
    const hasUpdatedAt = table.fields.some(f => f.name === 'updated_at');
    if (hasUpdatedAt) {
      script += `-- Add trigger to update updated_at timestamp\n`;
      
      script += `CREATE TRIGGER update_${table.name}_updated_at\n`;
      script += `BEFORE UPDATE ON public.${table.name}\n`;
      script += `FOR EACH ROW\n`;
      script += `EXECUTE FUNCTION update_updated_at_column();\n\n`;
    }
  });
  
  // Add the trigger function once at the end if any table has updated_at
  const hasAnyUpdatedAt = userTables.some(table => 
    table.fields.some(f => f.name === 'updated_at')
  );
  
  if (hasAnyUpdatedAt) {
    script = script.replace(
      '-- Add trigger to update updated_at timestamp\n',
      `-- Add trigger function for updated_at automation
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at timestamp
`
    );
  }

  return script.trim();
}

export function generateBoltPrompt(schema: Schema): string {
  const { tables, relationships } = schema;
  
  if (tables.length === 0) {
    return 'No schema defined';
  }

  let prompt = `Create a Supabase database with the following schema:\n\n`;
  
  prompt += `## Tables\n\n`;
  
  tables.forEach((table) => {
    prompt += `### ${table.name}\n`;
    
    if (table.description) {
      prompt += `Description: ${table.description}\n\n`;
    }
    
    if (table.fields.length > 0) {
      prompt += `Fields:\n`;
      table.fields.forEach((field) => {
        prompt += `- ${field.name}: ${field.type}`;
        
        const attributes = [];
        if (field.isPrimaryKey) attributes.push('primary key');
        if (field.isForeignKey) attributes.push('foreign key');
        if (field.isUnique && !field.isPrimaryKey) attributes.push('unique');
        if (!field.isNullable) attributes.push('required');
        if (field.defaultValue) attributes.push(`default: ${field.defaultValue}`);
        
        if (attributes.length > 0) {
          prompt += ` (${attributes.join(', ')})`;
        }
        
        prompt += '\n';
      });
    }
    
    if (table.enableRLS) {
      prompt += `\nRow Level Security: Enabled\n`;
      
      if (table.policies && table.policies.length > 0) {
        prompt += `Policies:\n`;
        table.policies.forEach((policy) => {
          prompt += `- ${policy.name}: ${policy.operation} for ${policy.role}`;
          if (policy.using) prompt += ` using (${policy.using})`;
          if (policy.withCheck) prompt += ` with check (${policy.withCheck})`;
          prompt += '\n';
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
      const sourceField = sourceTable?.fields.find(f => f.id === rel.sourceField);
      const targetField = targetTable?.fields.find(f => f.id === rel.targetField);
      
      if (sourceTable && targetTable && sourceField && targetField) {
        prompt += `- ${sourceTable.name}.${sourceField.name} → ${targetTable.name}.${targetField.name} (${rel.type})\n`;
      }
    });
    prompt += '\n';
  }
  
  prompt += `## Requirements\n`;
  prompt += `- Use public schema prefix for all tables\n`;
  prompt += `- Foreign keys must use ON DELETE CASCADE\n`;
  prompt += `- UUID primary keys should use gen_random_uuid()\n`;
  prompt += `- Include created_at and updated_at timestamps\n`;
  prompt += `- Enable RLS where specified and create policies\n`;
  prompt += `- Add indexes for all foreign keys\n`;
  prompt += `- Follow Supabase naming conventions\n`;
  
  return prompt;
}