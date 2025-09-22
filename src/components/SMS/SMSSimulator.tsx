import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Phone, Clock, CheckCircle, XCircle } from 'lucide-react';
import mockSMSService from '../../services/mockSMSService';
import mockBlockchainService from '../../services/mockBlockchainService';

const SMSSimulator: React.FC = () => {
  const [smsText, setSmsText] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+91-9876543210');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = () => {
    const allNotifications = mockSMSService.getAllNotifications();
    setNotifications(allNotifications.slice(0, 10)); // Show last 10
  };

  const handleSendSMS = async () => {
    if (!smsText.trim()) return;
    
    setLoading(true);
    setResult(null);

    try {
      // Parse SMS command
      const parsed = mockSMSService.parseSMSCommand(smsText, phoneNumber);
      
      if (!parsed.success) {
        setResult({ success: false, error: parsed.error });
        return;
      }

      const smsData = parsed.data;

      if (smsData.type === 'collection') {
        // Process collection via SMS
        const batchId = mockBlockchainService.generateBatchId();
        const eventId = mockBlockchainService.generateEventId('COLLECTION');

        const batchData = {
          batchId,
          herbSpecies: smsData.herbSpecies,
          collectorName: `SMS User (${phoneNumber})`,
          weight: smsData.weight,
          location: { zone: smsData.zone },
          qualityGrade: 'Standard',
          notes: 'Created via SMS',
          phone: phoneNumber
        };

        const result = await mockBlockchainService.createBatch('sms_user', batchData);
        
        // Send confirmation SMS
        await mockSMSService.sendCollectionConfirmation(phoneNumber, batchId, eventId);
        
        setResult({
          success: true,
          message: 'Collection recorded via SMS',
          batchId,
          eventId,
          transactionId: result.transactionId
        });
      } else if (smsData.type === 'quality_test') {
        // Process quality test via SMS
        const testEventId = mockBlockchainService.generateEventId('QUALITY_TEST');
        
        const eventData = {
          batchId: smsData.batchId,
          eventId: testEventId,
          parentEventId: smsData.batchId, // Simplified for SMS
          testerName: `SMS User (${phoneNumber})`,
          moistureContent: smsData.moistureContent,
          purity: smsData.purity,
          pesticideLevel: smsData.pesticideLevel,
          testMethod: 'SMS Test',
          ipfsHash: `Qm${Math.random().toString(36).substr(2, 44)}`,
          qrCodeHash: `sms_test_${testEventId}`,
          location: { latitude: '0', longitude: '0', zone: 'SMS Laboratory' }
        };

        const result = await mockBlockchainService.addQualityTestEvent('sms_user', eventData);
        
        // Send test result SMS
        const status = smsData.purity >= 95 ? 'PASSED' : 'ATTENTION REQUIRED';
        await mockSMSService.sendQualityTestNotification(phoneNumber, smsData.batchId, status, testEventId);
        
        setResult({
          success: true,
          message: 'Quality test recorded via SMS',
          batchId: smsData.batchId,
          eventId: testEventId,
          transactionId: result.transactionId
        });
      }

      setSmsText('');
    } catch (error) {
      setResult({ success: false, error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const smsTemplates = [
    {
      name: 'Collection',
      template: `COLLECT
SPECIES:Ashwagandha
WEIGHT:500
ZONE:Rajasthan Desert Region`
    },
    {
      name: 'Quality Test',
      template: `TEST
BATCH:HERB-1234567890-1234
MOISTURE:10.5
PURITY:98.7
PESTICIDE:0.005`
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-blue-800">SMS Integration Simulator</h2>
            <p className="text-blue-600">Test offline collection and notifications via SMS</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SMS Sender */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMS Message
              </label>
              <textarea
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                rows={6}
                placeholder="Enter SMS command..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleSendSMS}
                disabled={loading || !smsText.trim()}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Send SMS</span>
                  </>
                )}
              </button>
            </div>

            {/* SMS Templates */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Templates</h3>
              <div className="space-y-2">
                {smsTemplates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => setSmsText(template.template)}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-xs text-gray-600 font-mono mt-1">
                      {template.template.split('\n')[0]}...
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {result.success ? (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-800">SMS Processed Successfully</span>
                    </div>
                    <div className="text-sm text-green-700">
                      <p>Batch ID: {result.batchId}</p>
                      <p>Event ID: {result.eventId}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-700">{result.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SMS Notifications Log */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent SMS Notifications</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <div key={notification.id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(notification.status)}
                      <span className="text-sm font-medium text-gray-900">
                        {notification.phone}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {notification.type}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 font-mono bg-white p-2 rounded border">
                    {notification.message}
                  </p>
                </div>
              ))}
            </div>

            {notifications.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No SMS notifications yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SMSSimulator;