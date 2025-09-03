import { Schema, Table, Field, Relationship } from '../types/schema';
import { openai } from './openaiClient';

export async function generateSupabaseScript(schema: Schema): Promise<string> {
  const { tables, relationships } = schema;
  
  if (tables.length === 0) {
    return '-- No tables defined';
  }

  // If OpenAI is not configured, fall back to manual generation
  if (!openai) {
    console.warn('OpenAI not configured, falling back to manual generation');
    return generateManualSupabaseScript(schema);
  }

  try {
    // Prepare the schema description for OpenAI
    const schemaDescription = prepareSchemaDescription(schema);
    
    const systemPrompt = `You are an expert Supabase database engineer. Generate production-ready PostgreSQL migration scripts that follow Supabase conventions and best practices.

CRITICAL REQUIREMENTS:
1. Use PostgreSQL syntax compatible with Supabase
2. Always include "IF NOT EXISTS" or "IF EXISTS" for safety
3. Use proper UUID primary keys with gen_random_uuid() default
4. Include created_at and updated_at timestamptz fields with now() defaults
5. Enable Row Level Security (RLS) where specified
6. Create comprehensive RLS policies using auth.uid()
7. Add proper foreign key constraints with CASCADE actions
8. Create indexes for all foreign key columns for performance
9. Use snake_case naming convention
10. Include comprehensive comments explaining each section

STRUCTURE YOUR OUTPUT AS:
1. Header comment with migration overview
2. CREATE TABLE statements (with all columns and defaults)
3. Foreign key constraints (separate ALTER TABLE statements)
4. RLS configuration (ALTER TABLE ENABLE RLS)
5. RLS policies (CREATE POLICY statements)
6. Performance indexes (CREATE INDEX statements)
7. Triggers for updated_at automation

SPECIFIC REQUIREMENTS:
- Primary keys: Always uuid DEFAULT gen_random_uuid()
- Timestamps: Always timestamptz DEFAULT now()
- Foreign keys: Include proper naming and CASCADE options
- RLS policies: Use auth.uid() for user-based access control
- Comments: Include detailed explanations for each section

Return ONLY the SQL script, no explanations.`;

    const userPrompt = `Generate a complete, production-ready Supabase migration script for the following database schema.

Pay special attention to:
- Proper UUID primary key setup
- Comprehensive RLS policies for data security
- Foreign key relationships with proper constraints
- Performance indexes
- Updated_at trigger automation

Schema Definition:
${schemaDescription}

Generate a complete migration that can be run directly in Supabase SQL editor.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const script = response.choices[0].message.content;
    if (!script) throw new Error('No response from OpenAI');
    
    // Validate the generated script has essential components
    if (!script.includes('CREATE TABLE') && tables.length > 0) {
      throw new Error('Generated script missing table creation statements');
    }
    
    console.log('✅ OpenAI generated Supabase SQL script successfully');
    return script;
  } catch (error) {
    console.error('❌ OpenAI generation failed:', error);
    console.log('🔄 Falling back to manual generation...');
    
    // Provide more specific error feedback
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('API key')) {
      console.error('🔑 OpenAI API key issue detected');
    }
    
    return generateManualSupabaseScript(schema);
  }
}

function prepareSchemaDescription(schema: Schema): string {
  const { tables, relationships } = schema;
  
  let description = 'DATABASE SCHEMA SPECIFICATION:\n\n';
  description += `Total Tables: ${tables.length}\n`;
  description += `Total Relationships: ${relationships.length}\n\n`;
  description += 'TABLES DEFINITION:\n\n';
  
  tables.forEach((table) => {
    description += `TABLE: ${table.name}\n`;
    description += `- RLS Required: ${table.enableRLS ? 'YES' : 'NO'}\n`;
    description += `- Total Fields: ${table.fields.length}\n`;
    description += `- Color Theme: ${table.color}\n`;
    description += 'FIELDS:\n';
    
    table.fields.forEach((field) => {
      description += `  * ${field.name}:\n`;
      description += `    - Type: ${field.type}\n`;
      description += `    - Primary Key: ${field.isPrimaryKey ? 'YES' : 'NO'}\n`;
      description += `    - Foreign Key: ${field.isForeignKey ? 'YES' : 'NO'}\n`;
      description += `    - Unique: ${field.isUnique ? 'YES' : 'NO'}\n`;
      description += `    - Nullable: ${field.isNullable ? 'YES' : 'NO'}\n`;
      
      if (field.defaultValue) {
        description += `    - Default Value: ${field.defaultValue}\n`;
      }
      
      if (field.references) {
        description += `    - References: ${field.references.table}.${field.references.field}\n`;
      }
    });
    
    if (table.enableRLS && table.policies && table.policies.length > 0) {
      description += 'RLS POLICIES:\n';
      table.policies.forEach((policy) => {
        description += `  * ${policy.name}:\n`;
        description += `    - Command: ${policy.command}\n`;
        description += `    - Role: ${policy.role}\n`;
        if (policy.using) description += ` USING (${policy.using})`;
        if (policy.check) description += ` WITH CHECK (${policy.check})`;
        description += '\n';
      });
    } else if (table.enableRLS) {
      description += 'RLS POLICIES: CREATE STANDARD AUTH-BASED POLICIES\n';
    }
    
    description += '\n---\n\n';
  });
  
  if (relationships.length > 0) {
    description += 'RELATIONSHIPS DEFINITION:\n\n';
    relationships.forEach((rel) => {
      const sourceTable = tables.find(t => t.id === rel.source);
      const targetTable = tables.find(t => t.id === rel.target);
      const sourceField = sourceTable?.fields.find(f => f.id === rel.sourceField);
      const targetField = targetTable?.fields.find(f => f.id === rel.targetField);
      
      if (sourceTable && targetTable && sourceField && targetField) {
        description += `RELATIONSHIP: ${sourceTable.name}.${sourceField.name} → ${targetTable.name}.${targetField.name}\n`;
        description += `- Type: ${rel.type}\n`;
        description += `- Source: ${sourceTable.name}.${sourceField.name} (${sourceField.type})\n`;
        description += `- Target: ${targetTable.name}.${targetField.name} (${targetField.type})\n`;
        description += `- On Delete: ${rel.onDelete || 'CASCADE'}\n`;
        description += `- On Update: ${rel.onUpdate || 'CASCADE'}\n\n`;
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