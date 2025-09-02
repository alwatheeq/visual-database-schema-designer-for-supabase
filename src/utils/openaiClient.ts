import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

export const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
}) : null;

export async function modifySchemaWithAI(
  currentSchema: { tables: any[], relationships: any[] },
  userPrompt: string
): Promise<{ tables: any[], relationships: any[] }> {
  if (!openai) {
    throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
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
  
  Return ONLY the JSON object, no explanations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from AI');
    
    // Parse the JSON response
    const modifiedSchema = JSON.parse(content);
    return modifiedSchema;
  } catch (error) {
    console.error('AI modification error:', error);
    throw error;
  }
}
