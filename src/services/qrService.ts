import QRCode from 'qrcode';
import blockchainService from './blockchainService'; // Adjust import as needed

class QRService {
  private baseUrl = window.location.origin;

  async generateQR(data: any, title: string): Promise<{ success: boolean; dataURL?: string; trackingUrl?: string; qrHash?: string; error?: string }> {
    try {
      // Encode batchId and eventId to handle special characters
      const trackingUrl = `${this.baseUrl}/track/${encodeURIComponent(data.batchId)}/${encodeURIComponent(data.eventId)}`;
      
      const qrData = {
        url: trackingUrl,
        batchId: data.batchId,
        eventId: data.eventId,
        type: data.type,
        timestamp: Date.now(),
        version: '1.0',
        network: 'hyperledger-fabric'
      };

      const qrString = trackingUrl;
      const qrHash = await this.generateHash(JSON.stringify(qrData));
      
      const qrCodeDataURL = await QRCode.toDataURL(qrString, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 2,
        color: {
          dark: '#2D5A27',
          light: '#FFFFFF'
        },
        width: 400,
        scale: 8
      });

      console.log(`✅ Real QR code generated for ${data.type}: ${trackingUrl}`);

      return {
        success: true,
        dataURL: qrCodeDataURL,
        trackingUrl,
        qrHash
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async generateCollectionQR(batchId: string, eventId: string, herbSpecies: string, collectorName: string) {
    const data = {
      type: 'collection',
      batchId,
      eventId,
      herbSpecies,
      collector: collectorName
    };

    return await this.generateQR(data, `Collection-${batchId}`);
  }

  async generateQualityTestQR(batchId: string, eventId: string, testerName: string) {
    const data = {
      type: 'quality_test',
      batchId,
      eventId,
      tester: testerName
    };

    return await this.generateQR(data, `QualityTest-${eventId}`);
  }

  async generateProcessingQR(batchId: string, eventId: string, processorName: string, method: string) {
    const data = {
      type: 'processing',
      batchId,
      eventId,
      processor: processorName,
      method
    };

    return await this.generateQR(data, `Processing-${eventId}`);
  }

  async generateManufacturingQR(batchId: string, eventId: string, manufacturerName: string, productName: string) {
    const data = {
      type: 'manufacturing',
      batchId,
      eventId,
      manufacturer: manufacturerName,
      productName
    };

    return await this.generateQR(data, `Manufacturing-${eventId}`);
  }

  async parseQRData(qrString: string) {
    try {
      console.log('Parsing QR string:', qrString); // Debug: Log the scanned QR content
      let qrData;

      if (qrString.includes('/track/')) {
        const path = qrString.split('/track/')[1];
        const parts = path.split('/');
        
        if (parts.length >= 2) {
          // New format: /track/:batchId/:eventId
          const [batchId, eventId] = parts.map(decodeURIComponent);
          if (!batchId || !eventId) {
            throw new Error('Invalid QR code format - missing batchId or eventId');
          }
          qrData = {
            batchId,
            eventId,
            type: 'tracking_url',
            trackingUrl: qrString
          };
        } else if (parts.length === 1) {
          // Legacy format: /track/:eventId
          const eventId = decodeURIComponent(parts[0]);
          if (!eventId) {
            throw new Error('Invalid QR code format - missing eventId');
          }
          // Check if getEventInfo exists before calling
          if (typeof blockchainService.getEventInfo === 'function') {
            try {
              const batchInfo = await blockchainService.getEventInfo(eventId);
              if (!batchInfo?.batchId) {
                throw new Error(`Failed to retrieve batchId for eventId: ${eventId}`);
              }
              qrData = {
                batchId: batchInfo.batchId,
                eventId,
                type: 'tracking_url',
                trackingUrl: qrString
              };
            } catch (error) {
              console.warn('Failed to fetch batchId from blockchain:', error);
              throw new Error(`Legacy QR detected, but unable to retrieve batchId for eventId: ${eventId}. Please use a new QR code with batchId.`);
            }
          } else {
            throw new Error('Legacy QR format detected, but blockchainService.getEventInfo is not available. Please use a new QR code with batchId.');
          }
        } else {
          throw new Error('Invalid QR code format - unexpected URL structure');
        }
      } else {
        // Try to parse as JSON
        try {
          qrData = JSON.parse(qrString);
        } catch {
          // If not JSON, treat as direct event ID
          const eventId = qrString.trim();
          qrData = { eventId, type: 'direct_id' };
          if (typeof blockchainService.getEventInfo === 'function') {
            try {
              const batchInfo = await blockchainService.getEventInfo(eventId);
              if (batchInfo?.batchId) {
                qrData.batchId = batchInfo.batchId;
              }
            } catch (error) {
              console.warn('Failed to fetch batchId for direct eventId:', error);
            }
          } else {
            console.warn('Skipping batchId lookup: blockchainService.getEventInfo is not available');
          }
        }
      }

      if (!qrData.eventId) {
        throw new Error('Invalid QR code format - missing event ID');
      }

      return {
        success: true,
        data: qrData
      };
    } catch (error) {
      console.error('Error parsing QR data:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async generateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async generatePrintableQR(batchId: string, eventId: string, additionalInfo: any) {
    const trackingUrl = `${this.baseUrl}/track/${encodeURIComponent(batchId)}/${encodeURIComponent(eventId)}`;
    
    return await QRCode.toDataURL(trackingUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1.0,
      margin: 3,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 600,
      scale: 10
    });
  }
}

export const qrService = new QRService();
export default qrService;