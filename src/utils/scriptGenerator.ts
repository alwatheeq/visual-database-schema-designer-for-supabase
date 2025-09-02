import { Schema, Table, Field, Relationship } from '../types/schema';
import { openai } from './openaiClient';

export async function generateSupabaseScript(schema: Schema): Promise<string> {
  const { tables, relationships } = schema;
  
  if (tables.length === 0) {
    return '-- No tables defined';
  }

  // If OpenAI is not configured, fall back to manual generation
  if (!openai) {
    return generateManualSupabaseScript(schema);
  }

  try {
    // Prepare the schema description for OpenAI
    const schemaDescription = prepareSchemaDescription(schema);
    
    const systemPrompt = `You are a Supabase SQL expert. Generate production-ready PostgreSQL migration scripts following Supabase best practices.

CRITICAL RULES:
1. Use "public" schema prefix for all tables (e.g., public.users)
2. Foreign key constraints must use this exact format:
   ALTER TABLE public.child_table
   ADD CONSTRAINT child_table_field_fkey
   FOREIGN KEY (field)
   REFERENCES public.parent_table (id)
   ON DELETE CASCADE;
3. Always use UUID type with gen_random_uuid() for primary keys
4. Include created_at and updated_at timestamps with defaults
5. Enable RLS and create appropriate policies
6. Add indexes for all foreign keys
7. Use IF NOT EXISTS for safety
8. Include helpful comments
9. Follow this exact structure:
   - Header comment with migration summary
   - CREATE TABLE statements
   - ALTER TABLE for foreign keys
   - ALTER TABLE for RLS
   - CREATE POLICY statements
   - CREATE INDEX statements

Return ONLY the SQL script, no explanations.`;

    const userPrompt = `Generate a complete Supabase migration script for this schema:

${schemaDescription}

Requirements:
- Use public schema prefix everywhere
- Foreign keys with ON DELETE CASCADE
- Enable RLS where specified
- Create all necessary indexes
- Include proper constraints`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const script = response.choices[0].message.content;
    if (!script) throw new Error('No response from OpenAI');
    
    return script;
  } catch (error) {
    console.error('OpenAI generation failed, falling back to manual generation:', error);
    return generateManualSupabaseScript(schema);
  }
}

function prepareSchemaDescription(schema: Schema): string {
  const { tables, relationships } = schema;
  
  let description = 'TABLES:\n\n';
  
  tables.forEach((table) => {
    description += `Table: ${table.name}\n`;
    description += `RLS: ${table.enableRLS ? 'ENABLED' : 'DISABLED'}\n`;
    description += 'Fields:\n';
    
    table.fields.forEach((field) => {
      description += `  - ${field.name}: ${field.type}`;
      
      const attributes = [];
      if (field.isPrimaryKey) attributes.push('PRIMARY KEY');
      if (field.isUnique && !field.isPrimaryKey) attributes.push('UNIQUE');
      if (!field.isNullable) attributes.push('NOT NULL');
      if (field.defaultValue) attributes.push(`DEFAULT ${field.defaultValue}`);
      
      if (attributes.length > 0) {
        description += ` (${attributes.join(', ')})`;
      }
      description += '\n';
    });
    
    if (table.enableRLS && table.policies.length > 0) {
      description += 'RLS Policies:\n';
      table.policies.forEach((policy) => {
        description += `  - ${policy.name}: ${policy.operation} for ${policy.role}`;
        if (policy.using) description += ` USING (${policy.using})`;
        if (policy.withCheck) description += ` WITH CHECK (${policy.withCheck})`;
        description += '\n';
      });
    }
    
    description += '\n';
  });
  
  if (relationships.length > 0) {
    description += 'RELATIONSHIPS:\n\n';
    relationships.forEach((rel) => {
      const sourceTable = tables.find(t => t.id === rel.source);
      const targetTable = tables.find(t => t.id === rel.target);
      const sourceField = sourceTable?.fields.find(f => f.id === rel.sourceField);
      const targetField = targetTable?.fields.find(f => f.id === rel.targetField);
      
      if (sourceTable && targetTable && sourceField && targetField) {
        description += `${sourceTable.name}.${sourceField.name} -> ${targetTable.name}.${targetField.name} (${rel.type})\n`;
      }
    });
  }
  
  return description;
}

function generateManualSupabaseScript(schema: Schema): string {
  const { tables, relationships } = schema;
  
  let script = `/*
# Database Schema Migration

## Summary
This migration creates ${tables.length} table(s) with ${relationships.length} relationship(s).

## Tables
${tables.map(t => `- public.${t.name}: ${t.fields.length} fields${t.enableRLS ? ' (RLS enabled)' : ''}`).join('\n')}

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
  tables.forEach((table) => {
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
      script += `-- Add foreign key constraint for ${sourceTable.name}.${sourceField.name}\n`;
      script += `ALTER TABLE public.${sourceTable.name}\n`;
      script += `ADD CONSTRAINT ${sourceTable.name}_${sourceField.name}_fkey\n`;
      script += `FOREIGN KEY (${sourceField.name})\n`;
      script += `REFERENCES public.${targetTable.name} (${targetField.name})\n`;
      script += `ON DELETE CASCADE;\n\n`;
    }
  });

  // Generate RLS policies
  tables.forEach((table) => {
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
    
    if (sourceTable && sourceField) {
      script += `-- Create index for foreign key performance\n`;
      script += `CREATE INDEX IF NOT EXISTS idx_${sourceTable.name}_${sourceField.name}\n`;
      script += `ON public.${sourceTable.name} (${sourceField.name});\n\n`;
    }
  });

  // Add update trigger for updated_at
  tables.forEach((table) => {
    const hasUpdatedAt = table.fields.some(f => f.name === 'updated_at');
    if (!hasUpdatedAt) {
      script += `-- Add trigger to update updated_at timestamp\n`;
      script += `CREATE OR REPLACE FUNCTION update_updated_at_column()\n`;
      script += `RETURNS TRIGGER AS $$\n`;
      script += `BEGIN\n`;
      script += `  NEW.updated_at = now();\n`;
      script += `  RETURN NEW;\n`;
      script += `END;\n`;
      script += `$$ LANGUAGE plpgsql;\n\n`;
      
      script += `CREATE TRIGGER update_${table.name}_updated_at\n`;
      script += `BEFORE UPDATE ON public.${table.name}\n`;
      script += `FOR EACH ROW\n`;
      script += `EXECUTE FUNCTION update_updated_at_column();\n\n`;
    }
  });

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
