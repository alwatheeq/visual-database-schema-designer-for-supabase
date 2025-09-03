import OpenAI from 'openai';

// Check for OpenAI API key
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (apiKey && apiKey.trim() && !apiKey.startsWith('your-api-key')) {
  console.log('✅ OpenAI API key found and configured');
} else {
  console.warn('⚠️ OpenAI API key not configured or invalid');
}

export const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
}) : null;

// Enhanced schema modification with better error handling
export async function modifySchemaWithAI(
  currentSchema: { tables: any[], relationships: any[] },
  userPrompt: string
): Promise<{ tables: any[], relationships: any[] }> {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Please add your OpenAI API key to the .env file as VITE_OPENAI_API_KEY.');
  }

  const systemPrompt = `You are a database schema designer assistant. You help users modify their database schemas.
  
  Current schema:
  ${JSON.stringify(currentSchema, null, 2)}
  
  Rules:
  1. Return a valid JSON object with "tables" and "relationships" arrays
  2. Maintain existing IDs unless creating new items
  3. Use PostgreSQL data types (prefer uuid, text, timestamptz, jsonb)
  4. Always include id fields as primary keys (uuid type with gen_random_uuid() default)
  5. Include created_at and updated_at timestamps where appropriate
  6. Enable RLS by default for new tables
  7. Preserve positions of existing tables
  8. Follow Supabase naming conventions (snake_case)
  9. When adding new tables, place them at reasonable positions that don't overlap
  10. Generate meaningful field names and types based on the context
  11. Add appropriate relationships between new and existing tables when relevant
  12. Use different colors for new tables from this palette: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316']
  
  Return ONLY the JSON object, no explanations.`;

  try {
    console.log('🤖 Sending schema modification request to OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from AI');
    
    console.log('✅ OpenAI response received, parsing JSON...');
    
    // Parse the JSON response
    const modifiedSchema = JSON.parse(content);
    
    // Validate the response structure
    if (!modifiedSchema.tables || !Array.isArray(modifiedSchema.tables)) {
      throw new Error('Invalid response: missing tables array');
    }
    if (!modifiedSchema.relationships || !Array.isArray(modifiedSchema.relationships)) {
      throw new Error('Invalid response: missing relationships array');
    }
    
    // Ensure all tables have required properties for visual display
    const TABLE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
    
    modifiedSchema.tables = modifiedSchema.tables.map((table, index) => ({
      ...table,
      position: table.position || { 
        x: 100 + (index * 300), 
        y: 100 + ((index % 3) * 200) 
      },
      color: table.color || TABLE_COLORS[index % TABLE_COLORS.length],
      enableRLS: table.enableRLS !== undefined ? table.enableRLS : true,
      policies: table.policies || [],
      fields: table.fields.map(field => ({
        ...field,
        isPrimaryKey: field.isPrimaryKey || false,
        isForeignKey: field.isForeignKey || false,
        isUnique: field.isUnique || field.isPrimaryKey || false,
        isNullable: field.isNullable !== undefined ? field.isNullable : !field.isPrimaryKey
      }))
    }));
    
    console.log('✅ Schema modification completed successfully');
    return modifiedSchema;
  } catch (error) {
    console.error('❌ AI modification error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('OpenAI API key is invalid or expired. Please check your API key configuration.');
      } else if (error.message.includes('quota')) {
        throw new Error('OpenAI API quota exceeded. Please check your usage limits.');
      } else if (error.message.includes('JSON')) {
        throw new Error('AI generated invalid response. Please try again with a simpler request.');
      }
    }
    
    throw error;
  }
}

// Generate Supabase SQL script using OpenAI
export async function generateSupabaseScriptWithAI(
  tables: any[],
  relationships: any[]
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Please add your OpenAI API key to the .env file as VITE_OPENAI_API_KEY.');
  }

  console.log('🤖 Generating Supabase SQL script with OpenAI...');
  console.log('📊 Schema data:', { tablesCount: tables.length, relationshipsCount: relationships.length });

  const schemaDescription = prepareDetailedSchemaDescription(tables, relationships);
  
  const systemPrompt = `You are an expert Supabase database engineer who generates production-ready PostgreSQL migration scripts.

CRITICAL REQUIREMENTS:
1. Generate COMPLETE, executable Supabase PostgreSQL migration scripts
2. Use ONLY PostgreSQL syntax compatible with Supabase
3. ALWAYS include "IF NOT EXISTS" or "IF EXISTS" for safety
4. Use proper UUID primary keys with gen_random_uuid() default
5. Include created_at and updated_at timestamptz fields with now() defaults
6. Enable Row Level Security (RLS) where specified
7. Create comprehensive RLS policies using auth.uid()
8. Add proper foreign key constraints with CASCADE actions
9. Create indexes for all foreign key columns for performance
10. Use snake_case naming convention throughout
11. Include comprehensive comments explaining each section
12. Add triggers for updated_at automation

STRUCTURE YOUR OUTPUT AS:
1. Header comment with migration overview and table list
2. CREATE TABLE statements (with all columns, defaults, and constraints)
3. Foreign key constraints (separate ALTER TABLE statements)
4. RLS configuration (ALTER TABLE ENABLE RLS)
5. RLS policies (CREATE POLICY statements with proper auth.uid() usage)
6. Performance indexes (CREATE INDEX statements)
7. Triggers for updated_at automation

SPECIFIC SUPABASE REQUIREMENTS:
- Primary keys: Always uuid DEFAULT gen_random_uuid()
- Timestamps: Always timestamptz DEFAULT now()
- Foreign keys: Include proper naming and CASCADE options
- RLS policies: Use auth.uid() for user-based access control
- Comments: Include detailed explanations for each section
- Table names: Use public schema prefix (public.table_name)

Return ONLY the SQL script with comments. No explanations or markdown formatting.`;

  const userPrompt = `Generate a complete, production-ready Supabase migration script for this database schema:

${schemaDescription}

Requirements:
- All tables must be in public schema
- Enable RLS where specified with proper auth policies
- Include comprehensive foreign key relationships
- Add performance indexes for all foreign keys
- Include updated_at triggers for timestamp automation
- Use proper CASCADE actions for data integrity
- Add detailed comments explaining each section

Generate a script that can be run directly in Supabase SQL editor.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
    
    throw error; // Re-throw to trigger fallback in calling code
  }
}

function prepareDetailedSchemaDescription(tables: any[], relationships: any[]): string {
  let description = '=== DATABASE SCHEMA SPECIFICATION ===\n\n';
  description += `📊 Overview: ${tables.length} tables, ${relationships.length} relationships\n\n`;
  
  description += '🗄️ TABLES DETAILED SPECIFICATION:\n\n';
  
  tables.forEach((table, index) => {
    description += `TABLE ${index + 1}: ${table.name}\n`;
    if (table.description) {
      description += `├─ Description: ${table.description}\n`;
    }
    description += `├─ RLS Required: ${table.enableRLS ? 'YES' : 'NO'}\n`;
    description += `├─ Total Fields: ${table.fields.length}\n`;
    description += `├─ Color Theme: ${table.color}\n`;
    description += `└─ FIELDS SPECIFICATION:\n`;
    
    table.fields.forEach((field, fieldIndex) => {
      const isLast = fieldIndex === table.fields.length - 1;
      const prefix = isLast ? '    └─' : '    ├─';
      
      description += `${prefix} ${field.name}:\n`;
      description += `${isLast ? '      ' : '    │ '}  • Type: ${field.type}\n`;
      description += `${isLast ? '      ' : '    │ '}  • Primary Key: ${field.isPrimaryKey ? 'YES' : 'NO'}\n`;
      description += `${isLast ? '      ' : '    │ '}  • Foreign Key: ${field.isForeignKey ? 'YES' : 'NO'}\n`;
      description += `${isLast ? '      ' : '    │ '}  • Unique: ${field.isUnique ? 'YES' : 'NO'}\n`;
      description += `${isLast ? '      ' : '    │ '}  • Nullable: ${field.isNullable ? 'YES' : 'NO'}\n`;
      
      if (field.defaultValue) {
        description += `${isLast ? '      ' : '    │ '}  • Default: ${field.defaultValue}\n`;
      }
      
      if (field.references) {
        description += `${isLast ? '      ' : '    │ '}  • References: ${field.references.table}.${field.references.field}\n`;
      }
    });
    
    // RLS Policies
    if (table.enableRLS) {
      description += '\n    🔒 RLS POLICIES:\n';
      if (table.policies && table.policies.length > 0) {
        table.policies.forEach((policy) => {
          description += `    ├─ ${policy.name}:\n`;
          description += `    │   • Command: ${policy.command}\n`;
          description += `    │   • Role: ${policy.role}\n`;
          if (policy.using) description += `    │   • USING: ${policy.using}\n`;
          if (policy.check) description += `    │   • CHECK: ${policy.check}\n`;
        });
      } else {
        description += '    └─ CREATE STANDARD AUTH-BASED POLICIES\n';
      }
    }
    
    description += '\n';
    description += '─'.repeat(60) + '\n\n';
  });
  
  if (relationships.length > 0) {
    description += '🔗 RELATIONSHIPS DETAILED SPECIFICATION:\n\n';
    relationships.forEach((rel, index) => {
      const sourceTable = tables.find(t => t.id === rel.source);
      const targetTable = tables.find(t => t.id === rel.target);
      const sourceField = sourceTable?.fields.find(f => f.id === rel.sourceField);
      const targetField = targetTable?.fields.find(f => f.id === rel.targetField);
      
      if (sourceTable && targetTable && sourceField && targetField) {
        description += `RELATIONSHIP ${index + 1}: ${sourceTable.name}.${sourceField.name} → ${targetTable.name}.${targetField.name}\n`;
        description += `├─ Type: ${rel.type}\n`;
        description += `├─ Source: ${sourceTable.name}.${sourceField.name} (${sourceField.type})\n`;
        description += `├─ Target: ${targetTable.name}.${targetField.name} (${targetField.type})\n`;
        description += `├─ On Delete: ${rel.onDelete || 'CASCADE'}\n`;
        description += `└─ On Update: ${rel.onUpdate || 'CASCADE'}\n\n`;
      }
    });
  }
  
  return description;
}