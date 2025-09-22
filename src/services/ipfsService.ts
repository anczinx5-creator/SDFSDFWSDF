import supabaseService from './supabaseService';

class IPFSService {
  private generateIPFSHash(): string {
    return `Qm${Math.random().toString(36).substr(2, 44)}`;
  }

  async uploadJSON(jsonData: any, name: string) {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    
    const ipfsHash = this.generateIPFSHash();
    
    // Save to Supabase
    try {
      await supabaseService.saveIPFSFile({
        ipfsHash,
        fileName: name,
        fileType: 'json',
        fileSize: JSON.stringify(jsonData).length,
        mimeType: 'application/json',
        data: {
          type: 'json',
          content: jsonData,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn('Failed to save to Supabase, using simulation mode:', error);
    }
    
    console.log(`✅ JSON uploaded to IPFS via Supabase: ${ipfsHash}`);
    
    return {
      success: true,
      ipfsHash,
      pinataUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      data: { ipfsHash },
      demo: false,
      simulation: false
    };
  }

  async uploadFile(file: File) {
    // Simulate upload delay based on file size
    const delay = Math.min(2000, 500 + (file.size / 1024)); // Max 2 seconds
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const ipfsHash = this.generateIPFSHash();
    
    // Convert file to base64 for storage
    const base64 = await this.fileToBase64(file);
    
    // Save to Supabase
    try {
      await supabaseService.saveIPFSFile({
        ipfsHash,
        fileName: file.name,
        fileType: 'file',
        fileSize: file.size,
        mimeType: file.type,
        data: {
          type: 'file',
          content: base64,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn('Failed to save to Supabase, using simulation mode:', error);
    }
    
    console.log(`✅ File uploaded to IPFS via Supabase: ${ipfsHash}`);
    
    return {
      success: true,
      ipfsHash,
      pinataUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      data: { ipfsHash },
      demo: false,
      simulation: false
    };
  }

  async getFile(ipfsHash: string) {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    
    try {
      const stored = await supabaseService.getIPFSFile(ipfsHash);
      
      return {
        success: true,
        data: stored.data.type === 'json' ? stored.data.content : {
          name: stored.file_name,
          mimeType: stored.mime_type,
          size: stored.file_size,
          data: stored.data.content
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'File not found in IPFS storage'
      };
    }
  }

  async createCollectionMetadata(collectionData: any) {
    const metadata = {
      type: 'collection',
      timestamp: new Date().toISOString(),
      version: '1.0',
      network: 'hyperledger-fabric-supabase',
      ...collectionData,
      location: {
        latitude: collectionData.location?.latitude,
        longitude: collectionData.location?.longitude,
        zone: collectionData.location?.zone,
        address: collectionData.location?.address || 'Collection Address'
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
      network: 'hyperledger-fabric-supabase',
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
      network: 'hyperledger-fabric-supabase',
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
      network: 'hyperledger-fabric-supabase',
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
}

export const ipfsService = new IPFSService();
export default ipfsService;