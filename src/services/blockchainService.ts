import supabaseService from './supabaseService';

interface Event {
  eventId: string;
  eventType: 'COLLECTION' | 'QUALITY_TEST' | 'PROCESSING' | 'MANUFACTURING';
  batchId: string;
  timestamp: string;
  participant: string;
  organization: string;
  data: any;
  ipfsHash: string;
  qrCodeHash: string;
  transactionId: string;
  blockNumber: number;
  gasUsed: number;
  status: 'confirmed' | 'pending';
  parentEventId?: string;
}

interface Batch {
  batchId: string;
  herbSpecies: string;
  creator: string;
  creationTime: string;
  lastUpdated: string;
  currentStatus: string;
  events: Event[];
  isCompleted?: boolean;
}

class BlockchainService {
  private blockNumber = 100000;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return { success: true };
    
    // Test Supabase connection
    try {
      await supabaseService.healthCheck();
      this.isInitialized = true;
      console.log('✅ Blockchain service initialized with Supabase');
      
      return {
        success: true,
        message: 'Connected to Supabase database',
        network: 'hyperledger-fabric-supabase',
        fabricConnected: true
      };
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw new Error('Failed to connect to Supabase database');
    }
  }

  async createBatch(userAddress: string, batchData: any) {
    await this.simulateNetworkDelay();
    
    const batchId = batchData.batchId || this.generateBatchId();
    const eventId = this.generateEventId('COLLECTION');
    
    // Save batch to Supabase
    const batch = {
      batchId,
      herbSpecies: batchData.herbSpecies,
      creator: batchData.collectorName || batchData.collectorGroupName || 'Unknown Collector',
      currentStatus: 'COLLECTED',
      data: {
        herbSpecies: batchData.herbSpecies,
        weight: batchData.weight,
        location: batchData.location,
        qualityGrade: batchData.qualityGrade,
        notes: batchData.notes,
        weather: batchData.weather
      }
    };

    await supabaseService.saveBatch(batch);

    // Save collection event
    const event = {
      eventId,
      eventType: 'COLLECTION',
      batchId,
      participant: batchData.collectorName || batchData.collectorGroupName || 'Unknown Collector',
      organization: 'Collector Group',
      data: batch.data,
      ipfsHash: batchData.ipfsHash || `Qm${Math.random().toString(36).substr(2, 44)}`,
      qrCodeHash: batchData.qrCodeHash || this.generateHash(`collection-${eventId}`),
      transactionId: `fabric_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blockNumber: this.blockNumber++,
      gasUsed: Math.floor(Math.random() * 100000) + 50000,
      status: 'confirmed'
    };

    await supabaseService.saveEvent(event);

    // Save SMS notification if phone provided
    if (batchData.phone) {
      await this.saveSMSNotification('collection', batchData, eventId);
    }

    return {
      success: true,
      data: event,
      transactionId: event.transactionId,
      blockNumber: event.blockNumber,
      network: 'hyperledger-fabric-supabase'
    };
  }

  async addQualityTestEvent(userAddress: string, eventData: any) {
    await this.simulateNetworkDelay();
    
    // Check if batch already has a quality test event
    const batch = await supabaseService.getBatch(eventData.batchId);
    const hasQualityTest = batch.events.some((event: any) => event.event_type === 'QUALITY_TEST');
    
    if (hasQualityTest) {
      throw new Error('This batch already has a quality test recorded. Only one quality test per batch is allowed.');
    }

    const eventId = this.generateEventId('QUALITY_TEST');

    const event = {
      eventId,
      eventType: 'QUALITY_TEST',
      batchId: eventData.batchId,
      parentEventId: eventData.parentEventId,
      participant: eventData.testerName || 'Unknown Tester',
      organization: 'Testing Laboratory',
      data: {
        moistureContent: eventData.moistureContent,
        purity: eventData.purity,
        pesticideLevel: eventData.pesticideLevel,
        testMethod: eventData.testMethod,
        customParameters: eventData.customParameters
      },
      ipfsHash: eventData.ipfsHash || `Qm${Math.random().toString(36).substr(2, 44)}`,
      qrCodeHash: eventData.qrCodeHash || this.generateHash(`test-${eventId}`),
      transactionId: `fabric_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blockNumber: this.blockNumber++,
      gasUsed: Math.floor(Math.random() * 100000) + 50000,
      status: 'confirmed'
    };

    await supabaseService.saveEvent(event);

    // Update batch status
    await supabaseService.updateBatch(eventData.batchId, {
      currentStatus: 'QUALITY_TESTED',
      data: batch.data
    });

    // Save SMS notification
    await this.saveSMSNotification('quality_test', eventData, eventId);

    return {
      success: true,
      data: event,
      transactionId: event.transactionId,
      blockNumber: event.blockNumber,
      network: 'hyperledger-fabric-supabase'
    };
  }

  async addProcessingEvent(userAddress: string, eventData: any) {
    await this.simulateNetworkDelay();
    
    // Check if batch already has a processing event
    const batch = await supabaseService.getBatch(eventData.batchId);
    const hasProcessing = batch.events.some((event: any) => event.event_type === 'PROCESSING');
    
    if (hasProcessing) {
      throw new Error('This batch already has processing recorded. Only one processing step per batch is allowed.');
    }

    const eventId = this.generateEventId('PROCESSING');

    const event = {
      eventId,
      eventType: 'PROCESSING',
      batchId: eventData.batchId,
      parentEventId: eventData.parentEventId,
      participant: eventData.processorName || 'Unknown Processor',
      organization: 'Processing Unit',
      data: {
        method: eventData.method,
        temperature: eventData.temperature,
        yield: eventData.yield,
        duration: eventData.duration,
        yieldPercentage: eventData.yieldPercentage
      },
      ipfsHash: eventData.ipfsHash || `Qm${Math.random().toString(36).substr(2, 44)}`,
      qrCodeHash: eventData.qrCodeHash || this.generateHash(`process-${eventId}`),
      transactionId: `fabric_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blockNumber: this.blockNumber++,
      gasUsed: Math.floor(Math.random() * 100000) + 50000,
      status: 'confirmed'
    };

    await supabaseService.saveEvent(event);

    // Update batch status
    await supabaseService.updateBatch(eventData.batchId, {
      currentStatus: 'PROCESSED',
      data: batch.data
    });

    // Save SMS notification
    await this.saveSMSNotification('processing', eventData, eventId);

    return {
      success: true,
      data: event,
      transactionId: event.transactionId,
      blockNumber: event.blockNumber,
      network: 'hyperledger-fabric-supabase'
    };
  }

  async addManufacturingEvent(userAddress: string, eventData: any) {
    await this.simulateNetworkDelay();
    
    // Check if batch already has a manufacturing event
    const batch = await supabaseService.getBatch(eventData.batchId);
    const hasManufacturing = batch.events.some((event: any) => event.event_type === 'MANUFACTURING');
    
    if (hasManufacturing) {
      throw new Error('This batch is already manufactured. No further processing allowed.');
    }

    const eventId = this.generateEventId('MANUFACTURING');

    const event = {
      eventId,
      eventType: 'MANUFACTURING',
      batchId: eventData.batchId,
      parentEventId: eventData.parentEventId,
      participant: eventData.manufacturerName || 'Unknown Manufacturer',
      organization: 'Manufacturing Plant',
      data: {
        productName: eventData.productName,
        productType: eventData.productType,
        quantity: eventData.quantity,
        unit: eventData.unit,
        expiryDate: eventData.expiryDate,
        certificationId: eventData.certificationId,
        brandName: eventData.brandName,
        manufacturingLocation: eventData.location
      },
      ipfsHash: eventData.ipfsHash || `Qm${Math.random().toString(36).substr(2, 44)}`,
      qrCodeHash: eventData.qrCodeHash || this.generateHash(`mfg-${eventId}`),
      transactionId: `fabric_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blockNumber: this.blockNumber++,
      gasUsed: Math.floor(Math.random() * 100000) + 50000,
      status: 'confirmed'
    };

    await supabaseService.saveEvent(event);

    // Update batch status to completed
    await supabaseService.updateBatch(eventData.batchId, {
      currentStatus: 'MANUFACTURED',
      isCompleted: true,
      data: batch.data
    });

    // Save SMS notification
    await this.saveSMSNotification('manufacturing', eventData, eventId);

    return {
      success: true,
      data: event,
      transactionId: event.transactionId,
      blockNumber: event.blockNumber,
      network: 'hyperledger-fabric-supabase'
    };
  }

  async getBatchEvents(batchId: string) {
    const events = await supabaseService.getEventsByBatch(batchId);
    return events.map((event: any) => ({
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
    }));
  }

  async getAllBatches() {
    const batches = await supabaseService.getAllBatches();
    
    // Get events for each batch
    const batchesWithEvents = await Promise.all(
      batches.map(async (batch: any) => {
        const events = await this.getBatchEvents(batch.batchId);
        return {
          ...batch,
          events
        };
      })
    );

    return batchesWithEvents;
  }

  async getBatchInfo(eventIdOrBatchId: string) {
    return await supabaseService.getBatchInfo(eventIdOrBatchId);
  }

  generateBatchId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `HERB-${timestamp}-${random}`;
  }

  generateEventId(eventType: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${eventType}-${timestamp}-${random}`;
  }

  private generateHash(data: string): string {
    // Simple hash function for demo
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private async simulateNetworkDelay() {
    // Simulate blockchain transaction time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
  }

  private async saveSMSNotification(type: string, data: any, eventId: string) {
    let message = '';
    switch (type) {
      case 'collection':
        message = `HerbionYX: Collection recorded! Batch: ${data.batchId}, Event: ${eventId}. Track at: ${window.location.origin}/track/${eventId}`;
        break;
      case 'quality_test':
        const status = data.purity >= 95 ? 'PASSED' : 'ATTENTION REQUIRED';
        message = `HerbionYX: Quality test ${status}. Batch: ${data.batchId}, Purity: ${data.purity}%. Track: ${window.location.origin}/track/${eventId}`;
        break;
      case 'processing':
        message = `HerbionYX: Processing completed using ${data.method}. Batch: ${data.batchId}. Track: ${window.location.origin}/track/${eventId}`;
        break;
      case 'manufacturing':
        message = `HerbionYX: Manufacturing complete! Product: ${data.productName}. Final QR: ${eventId}. Track: ${window.location.origin}/track/${eventId}`;
        break;
    }

    const notification = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      eventId,
      batchId: data.batchId,
      phone: data.phone || '+91-9876543210',
      status: 'delivered'
    };

    try {
      await supabaseService.saveSMSNotification(notification);
    } catch (error) {
      console.warn('Failed to save SMS notification:', error);
    }
  }

  getConnectionStatus() {
    return {
      initialized: this.isInitialized,
      backendAvailable: true,
      fabricConnected: true,
      mode: 'supabase',
      network: 'hyperledger-fabric-supabase'
    };
  }

  getFabricNetworkInfo() {
    return {
      name: 'HerbionYX Hyperledger Fabric with Supabase',
      type: 'Hyperledger Fabric (Supabase Backend)',
      version: '2.5.4',
      channelName: 'herbionyx-channel',
      chaincodeName: 'herbionyx-chaincode',
      mspId: 'Org1MSP',
      connected: this.isInitialized
    };
  }

  // Get audit trail
  async getAuditTrail() {
    try {
      const batches = await this.getAllBatches();
      const auditEntries: any[] = [];

      batches.forEach((batch: any) => {
        batch.events.forEach((event: any) => {
          auditEntries.push({
            id: event.eventId,
            transactionId: event.transactionId,
            blockNumber: event.blockNumber,
            timestamp: event.timestamp,
            eventType: event.eventType,
            batchId: event.batchId,
            participant: event.participant,
            organization: event.organization,
            status: event.status,
            gasUsed: event.gasUsed,
            fabricDetails: {
              channelId: 'herbionyx-channel',
              chaincodeId: 'herbionyx-chaincode',
              endorsingPeers: ['peer0.org1.herbionyx.com'],
              mspId: 'Org1MSP'
            }
          });
        });
      });

      return auditEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      return [];
    }
  }

  // Get SMS notifications
  async getSMSNotifications() {
    try {
      const notifications = await supabaseService.getSMSNotifications();
      return notifications.map((notification: any) => ({
        id: notification.notification_id,
        type: notification.type,
        message: notification.message,
        phone: notification.phone,
        eventId: notification.event_id,
        batchId: notification.batch_id,
        timestamp: notification.created_at,
        status: notification.status
      }));
    } catch (error) {
      console.error('Error fetching SMS notifications:', error);
      return [];
    }
  }
}

export const blockchainService = new BlockchainService();
export default blockchainService;