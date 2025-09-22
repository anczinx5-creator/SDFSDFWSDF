import { v4 as uuidv4 } from 'uuid';

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
}

interface Batch {
  batchId: string;
  herbSpecies: string;
  creator: string;
  creationTime: string;
  lastUpdated: string;
  currentStatus: string;
  events: Event[];
}

class MockBlockchainService {
  private batches: Map<string, Batch> = new Map();
  private events: Map<string, Event> = new Map();
  private blockNumber = 100000;
  private isInitialized = false;

  constructor() {
    this.loadFromStorage();
    // Set up real-time storage listener
    this.setupStorageListener();
  }

  private setupStorageListener() {
    // Listen for storage changes from other tabs/sessions
    window.addEventListener('storage', (e) => {
      if (e.key === 'herbionyx_batches' || e.key === 'herbionyx_events') {
        this.loadFromStorage();
      }
    });
    
    // Also listen for custom events for same-tab updates
    window.addEventListener('herbionyx-data-update', () => {
      this.loadFromStorage();
    });
  }
  private loadFromStorage() {
    try {
      // Use localStorage for persistent cross-session data
      const batchesData = localStorage.getItem('herbionyx_batches');
      const eventsData = localStorage.getItem('herbionyx_events');
      
      if (batchesData) {
        const batches = JSON.parse(batchesData);
        this.batches = new Map(Object.entries(batches));
      }
      
      if (eventsData) {
        const events = JSON.parse(eventsData);
        this.events = new Map(Object.entries(events));
      }

      const blockData = localStorage.getItem('herbionyx_block_number');
      if (blockData) {
        this.blockNumber = parseInt(blockData);
      }
    } catch (error) {
      console.warn('Failed to load from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('herbionyx_batches', JSON.stringify(Object.fromEntries(this.batches)));
      localStorage.setItem('herbionyx_events', JSON.stringify(Object.fromEntries(this.events)));
      localStorage.setItem('herbionyx_block_number', this.blockNumber.toString());
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('herbionyx-data-update'));
    } catch (error) {
      console.warn('Failed to save to storage:', error);
    }
  }

  private generateSampleData() {
    // Remove sample data generation - only show real user-created batches
  }

  async initialize() {
    if (this.isInitialized) return { success: true };
    
    // Simulate network connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.isInitialized = true;
    console.log('✅ Mock Hyperledger Fabric service initialized');
    
    return {
      success: true,
      message: 'Connected to simulated Hyperledger Fabric network',
      network: 'hyperledger-fabric-simulation',
      fabricConnected: true
    };
  }

  async createBatch(userAddress: string, batchData: any) {
    await this.simulateNetworkDelay();
    
    const batchId = batchData.batchId || this.generateBatchId();
    const eventId = this.generateEventId('COLLECTION');
    
    const event: Event = {
      eventId,
      eventType: 'COLLECTION',
      batchId,
      timestamp: new Date().toISOString(),
      participant: batchData.collectorName || batchData.collectorGroupName || 'Unknown Collector',
      organization: 'Collector Group',
      data: {
        herbSpecies: batchData.herbSpecies,
        weight: batchData.weight,
        location: batchData.location,
        qualityGrade: batchData.qualityGrade,
        notes: batchData.notes,
        weather: batchData.weather
      },
      ipfsHash: batchData.ipfsHash || `Qm${Math.random().toString(36).substr(2, 44)}`,
      qrCodeHash: batchData.qrCodeHash || this.generateHash(`collection-${eventId}`),
      transactionId: `fabric_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blockNumber: this.blockNumber++,
      gasUsed: Math.floor(Math.random() * 100000) + 50000,
      status: 'confirmed'
    };

    const batch: Batch = {
      batchId,
      herbSpecies: batchData.herbSpecies,
      creator: batchData.collectorName || batchData.collectorGroupName || 'Unknown',
      creationTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      currentStatus: 'COLLECTED',
      events: [event]
    };

    this.events.set(eventId, event);
    this.batches.set(batchId, batch);
    this.saveToStorage();

    // Simulate SMS notification
    this.simulateSMSNotification('collection', batchData, eventId);

    return {
      success: true,
      data: event,
      transactionId: event.transactionId,
      blockNumber: event.blockNumber,
      network: 'hyperledger-fabric-simulation'
    };
  }

  async addQualityTestEvent(userAddress: string, eventData: any) {
    await this.simulateNetworkDelay();
    
    // Check if batch already has a quality test event
    const batch = this.batches.get(eventData.batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }
    
    const hasQualityTest = batch.events.some(event => event.eventType === 'QUALITY_TEST');
    if (hasQualityTest) {
      throw new Error('This batch already has a quality test recorded. Only one quality test per batch is allowed.');
    }

    const eventId = this.generateEventId('QUALITY_TEST');

    const event: Event = {
      eventId,
      eventType: 'QUALITY_TEST',
      batchId: eventData.batchId,
      parentEventId: eventData.parentEventId,
      timestamp: new Date().toISOString(),
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

    batch.events.push(event);
    batch.lastUpdated = new Date().toISOString();
    batch.currentStatus = 'QUALITY_TESTED';

    this.events.set(eventId, event);
    this.batches.set(eventData.batchId, batch);
    this.saveToStorage();

    // Simulate SMS notification
    this.simulateSMSNotification('quality_test', eventData, eventId);

    return {
      success: true,
      data: event,
      transactionId: event.transactionId,
      blockNumber: event.blockNumber,
      network: 'hyperledger-fabric-simulation'
    };
  }

  async addProcessingEvent(userAddress: string, eventData: any) {
    await this.simulateNetworkDelay();
    
    // Check if batch already has a processing event
    const batch = this.batches.get(eventData.batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }
    
    const hasProcessing = batch.events.some(event => event.eventType === 'PROCESSING');
    if (hasProcessing) {
      throw new Error('This batch already has processing recorded. Only one processing step per batch is allowed.');
    }

    const eventId = this.generateEventId('PROCESSING');

    const event: Event = {
      eventId,
      eventType: 'PROCESSING',
      batchId: eventData.batchId,
      parentEventId: eventData.parentEventId,
      timestamp: new Date().toISOString(),
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

    batch.events.push(event);
    batch.lastUpdated = new Date().toISOString();
    batch.currentStatus = 'PROCESSED';

    this.events.set(eventId, event);
    this.batches.set(eventData.batchId, batch);
    this.saveToStorage();

    // Simulate SMS notification
    this.simulateSMSNotification('processing', eventData, eventId);

    return {
      success: true,
      data: event,
      transactionId: event.transactionId,
      blockNumber: event.blockNumber,
      network: 'hyperledger-fabric-simulation'
    };
  }

  async addManufacturingEvent(userAddress: string, eventData: any) {
    await this.simulateNetworkDelay();
    
    // Check if batch already has a manufacturing event
    const batch = this.batches.get(eventData.batchId);
    if (!batch) {
      throw new Error('Batch not found');
    }
    
    const hasManufacturing = batch.events.some(event => event.eventType === 'MANUFACTURING');
    if (hasManufacturing) {
      throw new Error('This batch is already manufactured. No further processing allowed.');
    }

    const eventId = this.generateEventId('MANUFACTURING');

    const event: Event = {
      eventId,
      eventType: 'MANUFACTURING',
      batchId: eventData.batchId,
      parentEventId: eventData.parentEventId,
      timestamp: new Date().toISOString(),
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

    batch.events.push(event);
    batch.lastUpdated = new Date().toISOString();
    batch.currentStatus = 'MANUFACTURED';
    batch.isCompleted = true; // Mark batch as completed

    this.events.set(eventId, event);
    this.batches.set(eventData.batchId, batch);
    this.saveToStorage();

    // Simulate SMS notification
    this.simulateSMSNotification('manufacturing', eventData, eventId);

    return {
      success: true,
      data: event,
      transactionId: event.transactionId,
      blockNumber: event.blockNumber,
      network: 'hyperledger-fabric-simulation'
    };
  }

  async getBatchEvents(batchId: string) {
    const batch = this.batches.get(batchId);
    if (!batch) {
      // Try to find by event ID
      const event = this.events.get(batchId);
      if (event) {
        const eventBatch = this.batches.get(event.batchId);
        return eventBatch ? eventBatch.events : [];
      }
      return [];
    }
    return batch.events;
  }

  async getAllBatches() {
    // Always reload from storage to get latest data
    this.loadFromStorage();
    return Array.from(this.batches.values()).map(batch => ({
      batchId: batch.batchId,
      herbSpecies: batch.herbSpecies,
      creator: batch.creator,
      creationTime: batch.creationTime,
      lastUpdated: batch.lastUpdated,
      currentStatus: batch.currentStatus,
      eventCount: batch.events.length,
      events: batch.events
    }));
  }

  async getBatchInfo(eventIdOrBatchId: string) {
    // Always reload from storage to get latest data
    this.loadFromStorage();
    // Always reload from storage to get latest data
    this.loadFromStorage();
    
    // Try as batch ID first
    let batch = this.batches.get(eventIdOrBatchId);
    
    // If not found, try as event ID
    if (!batch) {
      const event = this.events.get(eventIdOrBatchId);
      if (event) {
        batch = this.batches.get(event.batchId);
      }
    }
    
    // If still not found, try partial matching for manufacturing events
    if (!batch) {
      // Look for any event that contains this ID as parent
      for (const [eventId, event] of this.events.entries()) {
        if (event.parentEventId === eventIdOrBatchId || eventId.includes(eventIdOrBatchId)) {
          batch = this.batches.get(event.batchId);
          if (batch) break;
        }
      }
    }

    if (!batch) {
      throw new Error('Batch not found');
    }

    return {
      success: true,
      batch: {
        ...batch,
        events: batch.events.map(event => ({
          ...event,
          collectorName: event.eventType === 'COLLECTION' ? event.participant : undefined,
          testerName: event.eventType === 'QUALITY_TEST' ? event.participant : undefined,
          processorName: event.eventType === 'PROCESSING' ? event.participant : undefined,
          manufacturerName: event.eventType === 'MANUFACTURING' ? event.participant : undefined,
          herbSpecies: event.eventType === 'COLLECTION' ? event.data.herbSpecies : undefined,
          weight: event.eventType === 'COLLECTION' ? event.data.weight : undefined,
          location: event.data.location,
          qualityGrade: event.eventType === 'COLLECTION' ? event.data.qualityGrade : undefined,
          notes: event.data.notes,
          testResults: event.eventType === 'QUALITY_TEST' ? {
            moistureContent: event.data.moistureContent,
            purity: event.data.purity,
            pesticideLevel: event.data.pesticideLevel
          } : undefined,
          processingDetails: event.eventType === 'PROCESSING' ? {
            method: event.data.method,
            temperature: event.data.temperature,
            yield: event.data.yield,
            duration: event.data.duration
          } : undefined,
          productDetails: event.eventType === 'MANUFACTURING' ? {
            productName: event.data.productName,
            productType: event.data.productType,
            quantity: event.data.quantity,
            unit: event.data.unit,
            expiryDate: event.data.expiryDate
          } : undefined
        }))
      }
    };
  }

  // Check if batch can accept new events
  canAddEvent(batchId: string, eventType: string): { canAdd: boolean; reason?: string } {
    const batch = this.batches.get(batchId);
    if (!batch) {
      return { canAdd: false, reason: 'Batch not found' };
    }

    if (batch.isCompleted) {
      return { canAdd: false, reason: 'Batch is completed after manufacturing. No more events can be added.' };
    }

    const existingEventTypes = batch.events.map(e => e.eventType);
    
    if (existingEventTypes.includes(eventType as any)) {
      return { canAdd: false, reason: `This batch already has a ${eventType.toLowerCase().replace('_', ' ')} event.` };
    }

    return { canAdd: true };
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

  private simulateSMSNotification(type: string, data: any, eventId: string) {
    // Store SMS notifications in localStorage for demo
    const notifications = JSON.parse(localStorage.getItem('herbionyx_sms_notifications') || '[]');
    
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

    notifications.push({
      id: uuidv4(),
      type,
      message,
      eventId,
      timestamp: new Date().toISOString(),
      phone: data.phone || '+91-9876543210'
    });

    localStorage.setItem('herbionyx_sms_notifications', JSON.stringify(notifications));
    
    // Show toast notification
    this.showToastNotification(`Data Recorded: ${message.substring(0, 50)}...`);
  }

  private showToastNotification(message: string) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 max-w-sm';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  getConnectionStatus() {
    return {
      initialized: this.isInitialized,
      backendAvailable: true,
      fabricConnected: true,
      mode: 'simulation',
      network: 'hyperledger-fabric-simulation'
    };
  }

  getFabricNetworkInfo() {
    return {
      name: 'HerbionYX Hyperledger Fabric Simulation',
      type: 'Hyperledger Fabric (Simulated)',
      version: '2.5.4',
      channelName: 'herbionyx-channel',
      chaincodeName: 'herbionyx-chaincode',
      mspId: 'Org1MSP',
      connected: this.isInitialized
    };
  }

  // Get audit trail
  getAuditTrail() {
    return Array.from(this.events.values()).map(event => ({
      id: event.eventId,
      transactionId: `fabric_${this.generateHash(event.eventId + event.timestamp)}`,
      blockNumber: event.blockNumber,
      timestamp: event.timestamp,
      eventType: event.eventType,
      batchId: event.batchId,
      participant: event.participant,
      organization: event.organization,
      status: event.status,
      gasUsed: Math.floor(Math.random() * 100000) + 50000,
      fabricDetails: {
        channelId: 'herbionyx-channel',
        chaincodeId: 'herbionyx-chaincode',
        endorsingPeers: ['peer0.org1.herbionyx.com'],
        mspId: 'Org1MSP'
      }
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Get SMS notifications
  getSMSNotifications() {
    return JSON.parse(localStorage.getItem('herbionyx_sms_notifications') || '[]');
  }

  // Clear all data (for demo reset)
  clearAllData() {
    this.batches.clear();
    this.events.clear();
    this.blockNumber = 100000;
    localStorage.removeItem('herbionyx_batches');
    localStorage.removeItem('herbionyx_events');
    localStorage.removeItem('herbionyx_block_number');
    localStorage.removeItem('herbionyx_sms_notifications');
    this.generateSampleData();
  }
}

export const mockBlockchainService = new MockBlockchainService();
export default mockBlockchainService;