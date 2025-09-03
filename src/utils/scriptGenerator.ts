import { Schema, Table, Field, Relationship } from '../types/schema';
import { openai, generateSupabaseScriptWithAI, testOpenAIConnection } from './openaiClient';

// Generate Bolt prompt using OpenAI
export async function generateBoltPromptWithAI(tables: any[], relationships: any[]): Promise<string> {
  if (!openai) {
    console.warn('OpenAI not available, using manual prompt generation');
    return generateManualBoltPrompt({ tables, relationships });
  }

  console.log('🤖 Generating Bolt prompt with OpenAI...');

  const systemPrompt = `You are an expert full-stack developer who creates detailed, comprehensive prompts for Bolt to generate complete web applications with Supabase backends.

CRITICAL REQUIREMENTS:
1. Generate a COMPLETE, detailed prompt that Bolt can use to create a full web application
2. Include ALL database schema details with proper descriptions
3. Specify modern React components with TypeScript
4. Include Supabase authentication and RLS requirements
5. Describe the complete user interface and user experience
6. Include all CRUD operations and data management features
7. Specify responsive design and modern UI/UX patterns
8. Include proper error handling and loading states
9. Describe the application's purpose and functionality clearly
10. Include specific technical requirements and best practices

PROMPT STRUCTURE:
1. Application Overview (purpose, target users, main features)
2. Database Schema (detailed tables, fields, relationships, RLS)
3. User Interface Requirements (pages, components, navigation)
4. Authentication & Security (user management, permissions)
5. Technical Specifications (React, TypeScript, Tailwind, Supabase)
6. User Experience Guidelines (responsive design, interactions)
7. Additional Features (search, filtering, pagination, etc.)

Make the prompt comprehensive enough that Bolt can generate a complete, production-ready application.
Return ONLY the prompt text, no explanations or markdown formatting.`;

  const schemaDescription = prepareDetailedSchemaDescription(tables, relationships);
  
  const userPrompt = `Generate a comprehensive Bolt prompt for creating a web application with this database schema:

${schemaDescription}

The prompt should describe:
- Complete application functionality based on the schema
- Modern React/TypeScript interface with Tailwind CSS
- Full Supabase integration with authentication
- All CRUD operations for each table
- Proper RLS implementation and user permissions
- Responsive design and excellent user experience
- Professional UI components and interactions

Create a prompt that will result in a complete, functional web application.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 3000,
    });

    const prompt = response.choices[0].message.content;
    if (!prompt) throw new Error('No response from OpenAI');
    
    console.log('✅ OpenAI generated Bolt prompt successfully');
    return prompt;
  } catch (error) {
    console.error('❌ OpenAI Bolt prompt generation failed:', error);
    console.log('🔄 Falling back to manual prompt generation...');
    throw error;
  }
}
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

  // Test OpenAI connection first
  try {
    const isConnected = await testOpenAIConnection();
    if (!isConnected) {
      console.warn('⚠️ OpenAI connection test failed, using manual generation');
      return generateManualSupabaseScript(schema);
    }
  } catch (error) {
    console.warn('⚠️ OpenAI connection test error, using manual generation');
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

function generateManualBoltPrompt(schema: Schema): string {
  const { tables, relationships } = schema;
  
  if (tables.length === 0) {
    return 'No schema defined';
  }

// Enhanced Bolt prompt generation with OpenAI fallback
export async function generateBoltPrompt(schema: Schema): Promise<string> {
  const { tables, relationships } = schema;
  
  if (tables.length === 0) {
    return 'No schema defined';
  }

  // Try OpenAI generation first
  if (openai) {
    try {
      console.log('🤖 Generating Bolt prompt with OpenAI...');
      return await generateBoltPromptWithAI(tables, relationships);
    } catch (error) {
      console.error('❌ OpenAI Bolt prompt generation failed, using manual generation:', error);
    }
  }
  
  // Fallback to manual generation
  console.log('📝 Using manual Bolt prompt generation');
  return generateManualBoltPrompt(schema);
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