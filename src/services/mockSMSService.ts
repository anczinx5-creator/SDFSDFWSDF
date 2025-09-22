interface SMSNotification {
  id: string;
  type: string;
  message: string;
  phone: string;
  eventId: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'failed';
}

class MockSMSService {
  private notifications: SMSNotification[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem('herbionyx_sms_notifications');
      if (data) {
        this.notifications = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load SMS notifications:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('herbionyx_sms_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.warn('Failed to save SMS notifications:', error);
    }
  }

  async sendSMS(phone: string, message: string, eventId: string, type: string) {
    // Simulate SMS sending delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    
    const notification: SMSNotification = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      phone,
      eventId,
      timestamp: new Date().toISOString(),
      status: Math.random() > 0.05 ? 'delivered' : 'failed' // 95% success rate
    };

    this.notifications.unshift(notification); // Add to beginning
    this.saveToStorage();

    // Show toast notification with better formatting
    this.showToastNotification(`📱 SMS → ${phone.substring(phone.length - 4)}: ${message.substring(0, 40)}...`);

    console.log(`📱 SMS sent to ${phone}: ${message}`);
    
    return {
      success: notification.status !== 'failed',
      messageId: notification.id,
      status: notification.status
    };
  }

  async sendCollectionConfirmation(phone: string, batchId: string, eventId: string) {
    const message = `HerbionYX: Collection recorded successfully! Batch ID: ${batchId}, Event: ${eventId}. Track: ${window.location.origin}/track/${eventId}`;
    return await this.sendSMS(phone, message, eventId, 'collection');
  }

  async sendQualityTestNotification(phone: string, batchId: string, status: string, eventId: string) {
    const message = `HerbionYX: Quality test ${status} for Batch ${batchId}. Event: ${eventId}. View results: ${window.location.origin}/track/${eventId}`;
    return await this.sendSMS(phone, message, eventId, 'quality_test');
  }

  async sendProcessingNotification(phone: string, batchId: string, method: string, eventId: string) {
    const message = `HerbionYX: Processing completed using ${method} for Batch ${batchId}. Event: ${eventId}. Track: ${window.location.origin}/track/${eventId}`;
    return await this.sendSMS(phone, message, eventId, 'processing');
  }

  async sendManufacturingNotification(phone: string, batchId: string, productName: string, eventId: string) {
    const message = `HerbionYX: Manufacturing completed for ${productName}. Original Batch: ${batchId}. Final Event: ${eventId}. Track: ${window.location.origin}/track/${eventId}`;
    return await this.sendSMS(phone, message, eventId, 'manufacturing');
  }

  getAllNotifications() {
    return this.notifications;
  }

  getNotificationsByType(type: string) {
    return this.notifications.filter(n => n.type === type);
  }

  getNotificationStats() {
    const total = this.notifications.length;
    const delivered = this.notifications.filter(n => n.status === 'delivered').length;
    const failed = this.notifications.filter(n => n.status === 'failed').length;
    
    return {
      total,
      delivered,
      failed,
      successRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : '0'
    };
  }

  private showToastNotification(message: string) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 max-w-sm text-sm';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Parse SMS commands (for offline collection simulation)
  parseSMSCommand(smsText: string, phoneNumber: string) {
    try {
      const lines = smsText.trim().split('\n');
      const command = lines[0].toUpperCase();
      
      const data = {
        phoneNumber,
        command,
        timestamp: Date.now()
      };

      switch (command) {
        case 'COLLECT':
          return this.parseCollectionSMS(lines, data);
        case 'TEST':
          return this.parseTestSMS(lines, data);
        default:
          throw new Error('Invalid SMS command');
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private parseCollectionSMS(lines: string[], data: any) {
    const parsedData = { ...data, type: 'collection' };
    
    for (let i = 1; i < lines.length; i++) {
      const [key, value] = lines[i].split(':');
      if (key && value) {
        switch (key.toUpperCase()) {
          case 'SPECIES':
            parsedData.herbSpecies = value.trim();
            break;
          case 'WEIGHT':
            parsedData.weight = parseFloat(value.trim());
            break;
          case 'ZONE':
            parsedData.zone = value.trim();
            break;
        }
      }
    }

    return { success: true, data: parsedData };
  }

  private parseTestSMS(lines: string[], data: any) {
    const parsedData = { ...data, type: 'quality_test' };
    
    for (let i = 1; i < lines.length; i++) {
      const [key, value] = lines[i].split(':');
      if (key && value) {
        switch (key.toUpperCase()) {
          case 'BATCH':
            parsedData.batchId = value.trim();
            break;
          case 'MOISTURE':
            parsedData.moistureContent = parseFloat(value.trim());
            break;
          case 'PURITY':
            parsedData.purity = parseFloat(value.trim());
            break;
          case 'PESTICIDE':
            parsedData.pesticideLevel = parseFloat(value.trim());
            break;
        }
      }
    }

    return { success: true, data: parsedData };
  }
}

export const mockSMSService = new MockSMSService();
export default mockSMSService;