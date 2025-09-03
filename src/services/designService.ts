import { supabase } from '../utils/supabaseClient';
import { Design, CreateDesignRequest } from '../types/design';

export class DesignService {
  static async saveDesign(designData: CreateDesignRequest): Promise<Design> {
    console.log('Saving complete visual design to database:', designData.name);
    console.log('Supabase client initialized:', !!supabase);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to save designs');
    }
    
    // Ensure we're saving complete visual data including positions and colors
    const visualData = {
      tables: designData.schema.tables.map(table => ({
        ...table,
        position: table.position || { x: 100, y: 100 },
        color: table.color || '#3B82F6'
      })),
      relationships: designData.schema.relationships,
      viewport: designData.schema.viewport,
      metadata: {
        version: '1.0.0',
        lastModified: new Date().toISOString()
      }
    };
    
    console.log('Attempting to insert into designs table with schema column...');
    const { data, error } = await supabase
      .from('designs')
      .insert([{
        name: designData.name,
        description: designData.description,
        schema: visualData,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error saving visual design:', error);
      throw new Error(`Failed to save design: ${error.message}`);
    }

    console.log('Visual design saved successfully:', data);
    return data;
  }

  static async updateDesign(id: string, designData: Partial<CreateDesignRequest>): Promise<Design> {
    console.log('Updating visual design in database:', id);
    console.log('Supabase client initialized:', !!supabase);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to update designs');
    }
    
    // Ensure we're updating complete visual data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (designData.name) updateData.name = designData.name;
    if (designData.description !== undefined) updateData.description = designData.description;
    
    if (designData.schema) {
      updateData.schema = {
        tables: designData.schema.tables.map(table => ({
          ...table,
          position: table.position || { x: 100, y: 100 },
          color: table.color || '#3B82F6'
        })),
        relationships: designData.schema.relationships,
        viewport: designData.schema.viewport,
        metadata: {
          version: '1.0.0',
          lastModified: new Date().toISOString()
        }
      };
    }
    
    console.log('Attempting to update designs table with schema column...');
    const { data, error } = await supabase
      .from('designs')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the design
      .select()
      .single();

    if (error) {
      console.error('Error updating visual design:', error);
      throw new Error(`Failed to update design: ${error.message}`);
    }

    console.log('Visual design updated successfully:', data);
    return data;
  }

  static async loadDesigns(): Promise<Design[]> {
    console.log('Loading visual designs from database...');
    console.log('Supabase client initialized:', !!supabase);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user logged in, returning empty array');
      return [];
    }
    
    console.log('Attempting to fetch from designs table with schema column...');
    const { data, error } = await supabase
      .from('designs')
      .select('*')
      .eq('user_id', user.id) // Only load user's own designs
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading visual designs:', error);
      throw new Error(`Failed to load designs: ${error.message}`);
    }

    console.log('Visual designs loaded:', data?.length || 0, 'records');
    return data || [];
  }

  static async loadDesign(id: string): Promise<Design> {
    console.log('Loading single visual design from database:', id);
    console.log('Supabase client initialized:', !!supabase);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to load designs');
    }
    
    const { data, error } = await supabase
      .from('designs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the design
      .single();

    if (error) {
      console.error('Error loading visual design:', error);
      throw new Error(`Failed to load design: ${error.message}`);
    }

    console.log('Visual design loaded with positions and colors:', data);
    return data;
  }

  static async deleteDesign(id: string): Promise<void> {
    console.log('Deleting visual design from database:', id);
    console.log('Supabase client initialized:', !!supabase);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to delete designs');
    }
    
    const { error } = await supabase
      .from('designs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user owns the design

    if (error) {
      console.error('Error deleting visual design:', error);
      throw new Error(`Failed to delete design: ${error.message}`);
    }

    console.log('Visual design deleted successfully:', id);
  }
  
  // Test connection method
  static async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Supabase connection...');
      
      // First test basic connectivity
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError && authError.message !== 'Invalid JWT') {
        console.error('Connection test failed (auth check):', authError);
        return false;
      }
      
      console.log('Connection test successful - Supabase is reachable');
      return true;
    } catch (error) {
      console.error('Connection test error:', error);
      return false;
    }
  }
}
