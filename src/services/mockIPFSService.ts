class MockIPFSService {
  private storage: Map<string, any> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem('herbionyx_ipfs_storage');
      if (data) {
        const parsed = JSON.parse(data);
        this.storage = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.warn('Failed to load IPFS storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('herbionyx_ipfs_storage', JSON.stringify(Object.fromEntries(this.storage)));
    } catch (error) {
      console.warn('Failed to save IPFS storage:', error);
    }
  }

  private generateIPFSHash(): string {
    return `Qm${Math.random().toString(36).substr(2, 44)}`;
  }

  async uploadJSON(jsonData: any, name: string) {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    
    const ipfsHash = this.generateIPFSHash();
    
    this.storage.set(ipfsHash, {
      type: 'json',
      data: jsonData,
      name,
      timestamp: new Date().toISOString(),
      size: JSON.stringify(jsonData).length
    });
    
    this.saveToStorage();
    
    console.log(`✅ JSON uploaded to simulated IPFS: ${ipfsHash}`);
    
    return {
      success: true,
      ipfsHash,
      pinataUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      data: { ipfsHash },
      demo: false,
      simulation: true
    };
  }

  async uploadFile(file: File) {
    // Simulate upload delay based on file size
    const delay = Math.min(2000, 500 + (file.size / 1024)); // Max 2 seconds
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const ipfsHash = this.generateIPFSHash();
    
    // Convert file to base64 for storage
    const base64 = await this.fileToBase64(file);
    
    this.storage.set(ipfsHash, {
      type: 'file',
      data: base64,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      timestamp: new Date().toISOString()
    });
    
    this.saveToStorage();
    
    console.log(`✅ File uploaded to simulated IPFS: ${ipfsHash}`);
    
    return {
      success: true,
      ipfsHash,
      pinataUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      data: { ipfsHash },
      demo: false,
      simulation: true
    };
  }

  async getFile(ipfsHash: string) {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    const stored = this.storage.get(ipfsHash);
    if (!stored) {
      return {
        success: false,
        error: 'File not found in simulated IPFS'
      };
    }

    return {
      success: true,
      data: stored.type === 'json' ? stored.data : {
        name: stored.name,
        mimeType: stored.mimeType,
        size: stored.size,
        data: stored.data
      }
    };
  }

  async createCollectionMetadata(collectionData: any) {
    const metadata = {
      type: 'collection',
      timestamp: new Date().toISOString(),
      version: '1.0',
      network: 'hyperledger-fabric-simulation',
      ...collectionData,
      location: {
        latitude: collectionData.location?.latitude,
        longitude: collectionData.location?.longitude,
        zone: collectionData.location?.zone,
        address: collectionData.location?.address || 'Simulated Address'
      },
      qualityGrade: collectionData.qualityGrade || '',
      notes: collectionData.notes || '',
      images: collectionData.images || []
    };

    return await this.uploadJSON(metadata, `collection-${collectionData.batchId}`);
  }

  async createQualityTestMetadata(testData: any) {
    const metadata = {
      type: 'quality_test',
      timestamp: new Date().toISOString(),
      version: '1.0',
      network: 'hyperledger-fabric-simulation',
      ...testData,
      testResults: {
        moistureContent: testData.moistureContent,
        purity: testData.purity,
        pesticideLevel: testData.pesticideLevel,
        customParameters: testData.customParameters || []
      },
      testMethod: testData.testMethod || '',
      notes: testData.notes || '',
      images: testData.images || []
    };

    return await this.uploadJSON(metadata, `quality-test-${testData.eventId}`);
  }

  async createProcessingMetadata(processData: any) {
    const metadata = {
      type: 'processing',
      timestamp: new Date().toISOString(),
      version: '1.0',
      network: 'hyperledger-fabric-simulation',
      ...processData,
      processingDetails: {
        method: processData.method,
        temperature: processData.temperature,
        duration: processData.duration,
        yield: processData.yield,
        yieldPercentage: processData.yieldPercentage
      },
      notes: processData.notes || '',
      images: processData.images || []
    };

    return await this.uploadJSON(metadata, `processing-${processData.eventId}`);
  }

  async createManufacturingMetadata(mfgData: any) {
    const metadata = {
      type: 'manufacturing',
      timestamp: new Date().toISOString(),
      version: '1.0',
      network: 'hyperledger-fabric-simulation',
      ...mfgData,
      product: {
        name: mfgData.productName,
        type: mfgData.productType,
        quantity: mfgData.quantity,
        unit: mfgData.unit,
        expiryDate: mfgData.expiryDate,
        certificationId: mfgData.certificationId
      },
      notes: mfgData.notes || '',
      images: mfgData.images || []
    };

    return await this.uploadJSON(metadata, `manufacturing-${mfgData.eventId}`);
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  // Get storage statistics
  getStorageStats() {
    const totalFiles = this.storage.size;
    let totalSize = 0;
    let fileTypes = { json: 0, file: 0 };

    for (const [hash, data] of this.storage.entries()) {
      totalSize += data.size || 0;
      fileTypes[data.type as keyof typeof fileTypes]++;
    }

    return {
      totalFiles,
      totalSize,
      fileTypes,
      storageUsed: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
    };
  }
}

export const mockIPFSService = new MockIPFSService();
export default mockIPFSService;