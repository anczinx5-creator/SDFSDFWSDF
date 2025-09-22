import mockIPFSService from './mockIPFSService';

class IPFSService {

  async uploadJSON(jsonData: any, name: string) {
    return await mockIPFSService.uploadJSON(jsonData, name);
  }

  async uploadFile(file: File) {
    return await mockIPFSService.uploadFile(file);
  }

  async getFile(ipfsHash: string) {
    return await mockIPFSService.getFile(ipfsHash);
  }

  async createCollectionMetadata(collectionData: any) {
    return await mockIPFSService.createCollectionMetadata(collectionData);
  }

  async createQualityTestMetadata(testData: any) {
    return await mockIPFSService.createQualityTestMetadata(testData);
  }

  async createProcessingMetadata(processData: any) {
    return await mockIPFSService.createProcessingMetadata(processData);
  }

  async createManufacturingMetadata(mfgData: any) {
    return await mockIPFSService.createManufacturingMetadata(mfgData);
  }
}

export const ipfsService = new IPFSService();
export default ipfsService;