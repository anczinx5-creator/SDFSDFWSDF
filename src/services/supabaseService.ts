import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database service for HerbionYX
class SupabaseService {
  // Authentication
  async signUp(userData: any) {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          organization: userData.organization,
          role: userData.role,
          phone: userData.phone
        }
      }
    });
    
    if (error) throw error;
    
    // Also insert into users table for additional data
    if (data.user) {
      await this.createUserProfile(data.user.id, userData);
    }
    
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const profile = await this.getUserProfile(user.id);
      return { ...user, profile };
    }
    return null;
  }

  async createUserProfile(userId: string, userData: any) {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          email: userData.email,
          name: userData.name,
          organization: userData.organization,
          role: userData.role,
          phone: userData.phone,
          address: userData.address || `${userData.email}_address`
        }
      ]);
    
    if (error) throw error;
    return data;
  }

  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }

  // Platform ratings
  async submitRating(rating: number, feedback: string, userId?: string) {
    const { data, error } = await supabase
      .from('platform_ratings')
      .insert([
        {
          rating,
          feedback,
          user_id: userId,
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
      .insert([{
        batch_id: batchData.batchId,
        herb_species: batchData.herbSpecies,
        creator: batchData.creator,
        current_status: batchData.currentStatus || 'COLLECTED',
        data: batchData.data || {},
        is_completed: batchData.isCompleted || false
      }])
      .select();
    
    if (error) throw error;
    return data;
  }

  async getBatch(batchId: string) {
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('batch_id', batchId)
      .single();
    
    if (batchError) throw batchError;
    
    // Get events for this batch
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });
    
    if (eventsError) throw eventsError;
    
    return {
      ...batch,
      events: events || []
    };
  }

  async getAllBatches() {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        *,
        events:events(count)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform the data to match expected format
    return (data || []).map(batch => ({
      batchId: batch.batch_id,
      herbSpecies: batch.herb_species,
      creator: batch.creator,
      creationTime: batch.created_at,
      lastUpdated: batch.updated_at,
      currentStatus: batch.current_status,
      eventCount: batch.events?.[0]?.count || 0,
      isCompleted: batch.is_completed
    }));
  }

  async updateBatch(batchId: string, updates: any) {
    const { data, error } = await supabase
      .from('batches')
      .update({
        current_status: updates.currentStatus,
        data: updates.data,
        is_completed: updates.isCompleted,
        updated_at: new Date().toISOString()
      })
      .eq('batch_id', batchId)
      .select();
    
    if (error) throw error;
    return data;
  }

  // Events
  async saveEvent(eventData: any) {
    const { data, error } = await supabase
      .from('events')
      .insert([{
        event_id: eventData.eventId,
        event_type: eventData.eventType,
        batch_id: eventData.batchId,
        parent_event_id: eventData.parentEventId,
        participant: eventData.participant,
        organization: eventData.organization,
        data: eventData.data || {},
        ipfs_hash: eventData.ipfsHash,
        qr_code_hash: eventData.qrCodeHash,
        transaction_id: eventData.transactionId,
        block_number: eventData.blockNumber,
        gas_used: eventData.gasUsed,
        status: eventData.status || 'confirmed'
      }])
      .select();
    
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

  // SMS Notifications
  async saveSMSNotification(notificationData: any) {
    const { data, error } = await supabase
      .from('sms_notifications')
      .insert([{
        notification_id: notificationData.id,
        type: notificationData.type,
        message: notificationData.message,
        phone: notificationData.phone,
        event_id: notificationData.eventId,
        batch_id: notificationData.batchId,
        status: notificationData.status || 'sent'
      }])
      .select();
    
    if (error) throw error;
    return data;
  }

  async getSMSNotifications(limit = 50) {
    const { data, error } = await supabase
      .from('sms_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  }

  // IPFS Storage
  async saveIPFSFile(fileData: any) {
    const { data, error } = await supabase
      .from('ipfs_storage')
      .insert([{
        ipfs_hash: fileData.ipfsHash,
        file_name: fileData.fileName,
        file_type: fileData.fileType,
        file_size: fileData.fileSize,
        mime_type: fileData.mimeType,
        data: fileData.data || {}
      }])
      .select();
    
    if (error) throw error;
    return data;
  }

  async getIPFSFile(ipfsHash: string) {
    const { data, error } = await supabase
      .from('ipfs_storage')
      .select('*')
      .eq('ipfs_hash', ipfsHash)
      .single();
    
    if (error) throw error;
    return data;
  }

  // Batch info with events (for tracking)
  async getBatchInfo(eventIdOrBatchId: string) {
    // Try as batch ID first
    try {
      const batch = await this.getBatch(eventIdOrBatchId);
      return {
        success: true,
        batch: {
          batchId: batch.batch_id,
          herbSpecies: batch.herb_species,
          creator: batch.creator,
          creationTime: batch.created_at,
          lastUpdated: batch.updated_at,
          currentStatus: batch.current_status,
          isCompleted: batch.is_completed,
          events: batch.events.map((event: any) => ({
            eventId: event.event_id,
            eventType: event.event_type,
            batchId: event.batch_id,
            parentEventId: event.parent_event_id,
            timestamp: event.created_at,
            participant: event.participant,
            organization: event.organization,
            data: event.data,
            ipfsHash: event.ipfs_hash,
            qrCodeHash: event.qr_code_hash,
            transactionId: event.transaction_id,
            blockNumber: event.block_number,
            gasUsed: event.gas_used,
            status: event.status
          }))
        }
      };
    } catch (error) {
      // Try as event ID
      try {
        const event = await this.getEvent(eventIdOrBatchId);
        const batch = await this.getBatch(event.batch_id);
        return {
          success: true,
          batch: {
            batchId: batch.batch_id,
            herbSpecies: batch.herb_species,
            creator: batch.creator,
            creationTime: batch.created_at,
            lastUpdated: batch.updated_at,
            currentStatus: batch.current_status,
            isCompleted: batch.is_completed,
            events: batch.events.map((e: any) => ({
              eventId: e.event_id,
              eventType: e.event_type,
              batchId: e.batch_id,
              parentEventId: e.parent_event_id,
              timestamp: e.created_at,
              participant: e.participant,
              organization: e.organization,
              data: e.data,
              ipfsHash: e.ipfs_hash,
              qrCodeHash: e.qr_code_hash,
              transactionId: e.transaction_id,
              blockNumber: e.block_number,
              gasUsed: e.gas_used,
              status: e.status
            }))
          }
        };
      } catch (eventError) {
        throw new Error('Batch not found');
      }
    }
  }

  // Health check
  async healthCheck() {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      
      return {
        success: true,
        status: 'OK',
        message: '🌿 HerbionYX API Server is running with Supabase',
        timestamp: new Date().toISOString(),
        database: 'supabase-postgresql'
      };
    } catch (error) {
      throw new Error('Supabase connection failed');
    }
  }
}

export const supabaseService = new SupabaseService();
export default supabaseService;