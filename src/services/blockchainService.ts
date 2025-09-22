import mockBlockchainService from './mockBlockchainService';

class BlockchainService {

  async initialize() {
    return await mockBlockchainService.initialize();
  }

  async createBatch(userAddress: string, batchData: any) {
    return await mockBlockchainService.createBatch(userAddress, batchData);
  }

  async addQualityTestEvent(userAddress: string, eventData: any) {
    return await mockBlockchainService.addQualityTestEvent(userAddress, eventData);
  }

  async addProcessingEvent(userAddress: string, eventData: any) {
    return await mockBlockchainService.addProcessingEvent(userAddress, eventData);
  }

  async addManufacturingEvent(userAddress: string, eventData: any) {
    return await mockBlockchainService.addManufacturingEvent(userAddress, eventData);
  }

  async getBatchEvents(batchId: string) {
    return await mockBlockchainService.getBatchEvents(batchId);
  }

  async getAllBatches() {
    return await mockBlockchainService.getAllBatches();
  }

  generateBatchId(): string {
    return mockBlockchainService.generateBatchId();
  }

  generateEventId(eventType: string): string {
    return mockBlockchainService.generateEventId(eventType);
  }

  getConnectionStatus() {
    return mockBlockchainService.getConnectionStatus();
  }

  getFabricNetworkInfo() {
    return mockBlockchainService.getFabricNetworkInfo();
  }

  async getBatchInfo(eventIdOrBatchId: string) {
    return await mockBlockchainService.getBatchInfo(eventIdOrBatchId);
  }

  getAuditTrail() {
    return mockBlockchainService.getAuditTrail();
  }
}

export const blockchainService = new BlockchainService();
export default blockchainService;