import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database service for HerbionYX
class SupabaseService {
  // Platform ratings
  async submitRating(rating: number, feedback: string) {
    const { data, error } = await supabase
      .from('platform_ratings')
      .insert([
        {
          rating,
          feedback,
          created_at: new Date().toISOString()
        }
      ]);
    
    if (error) throw error;
    return data;
  }

  async getRatingStats() {
    const { data, error } = await supabase
      .from('platform_ratings')
      .select('rating');
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        satisfactionRate: 0
      };
    }
    
    const totalReviews = data.length;
    const averageRating = data.reduce((sum, item) => sum + item.rating, 0) / totalReviews;
    const satisfactionRate = (data.filter(item => item.rating >= 4).length / totalReviews) * 100;
    
    return {
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews,
      satisfactionRate: parseFloat(satisfactionRate.toFixed(0))
    };
  }

  // Batches
  async saveBatch(batchData: any) {
    const { data, error } = await supabase
      .from('batches')
      .insert([batchData]);
    
    if (error) throw error;
    return data;
  }

  async getBatch(batchId: string) {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('batch_id', batchId)
      .single();
    
    if (error) throw error;
    return data;
  }

  async getAllBatches() {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async updateBatch(batchId: string, updates: any) {
    const { data, error } = await supabase
      .from('batches')
      .update(updates)
      .eq('batch_id', batchId);
    
    if (error) throw error;
    return data;
  }

  // Events
  async saveEvent(eventData: any) {
    const { data, error } = await supabase
      .from('events')
      .insert([eventData]);
    
    if (error) throw error;
    return data;
  }

  async getEventsByBatch(batchId: string) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async getEvent(eventId: string) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('event_id', eventId)
      .single();
    
    if (error) throw error;
    return data;
  }
}

export const supabaseService = new SupabaseService();
export default supabaseService;