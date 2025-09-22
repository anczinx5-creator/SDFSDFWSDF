// Neon Database Service for HerbionYX
class NeonService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/.netlify/functions';
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Request failed');
      }

      return data.data;
    } catch (error) {
      console.error('Neon API request failed:', error);
      throw error;
    }
  }

  // Platform ratings
  async submitRating(rating: number, feedback: string) {
    return this.makeRequest('/api/ratings', {
      method: 'POST',
      body: JSON.stringify({ rating, feedback })
    });
  }

  async getRatingStats() {
    return this.makeRequest('/api/ratings');
  }

  // Batches
  async saveBatch(batchData: any) {
    return this.makeRequest('/api/batches', {
      method: 'POST',
      body: JSON.stringify({
        batchId: batchData.batch_id,
        herbSpecies: batchData.herb_species,
        creator: batchData.creator,
        data: batchData.data
      })
    });
  }

  async getBatch(batchId: string) {
    return this.makeRequest(`/api/batch/${batchId}`);
  }

  async getAllBatches() {
    return this.makeRequest('/api/batches');
  }

  async updateBatch(batchId: string, updates: any) {
    return this.makeRequest(`/api/batch/${batchId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // Events
  async saveEvent(eventData: any) {
    return this.makeRequest('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        eventId: eventData.event_id,
        eventType: eventData.event_type,
        batchId: eventData.batch_id,
        participant: eventData.participant,
        organization: eventData.organization,
        data: eventData.data,
        ipfsHash: eventData.ipfs_hash,
        qrCodeHash: eventData.qr_code_hash,
        transactionId: eventData.transaction_id,
        blockNumber: eventData.block_number,
        gasUsed: eventData.gas_used
      })
    });
  }

  async getEventsByBatch(batchId: string) {
    const batchData = await this.getBatch(batchId);
    return batchData.batch.events || [];
  }

  async getEvent(eventId: string) {
    // For now, we'll need to search through batches to find the event
    // In a more complex setup, you might want a dedicated endpoint
    const batches = await this.getAllBatches();
    for (const batch of batches) {
      const fullBatch = await this.getBatch(batch.batchId);
      const event = fullBatch.batch.events.find((e: any) => e.eventId === eventId);
      if (event) {
        return event;
      }
    }
    throw new Error('Event not found');
  }

  // Health check
  async healthCheck() {
    return this.makeRequest('/api/health');
  }
}

export const neonService = new NeonService();
export default neonService;