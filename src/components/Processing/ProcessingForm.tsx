import React, { useState, useEffect } from 'react';
import { Cpu, Upload, AlertCircle, CheckCircle, Loader2, QrCode, MapPin, Calculator, Camera } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PROCESSING_METHODS } from '../../config/herbs';
import blockchainService from '../../services/blockchainService';
import ipfsService from '../../services/ipfsService';
import qrService from '../../services/qrService';
import QRCodeDisplay from '../Common/QRCodeDisplay';
import QRScanner from '../Common/QRScanner';

interface FormData {
  batchId: string;
  inputWeight: string;
  method: string;
  temperature: string;
  yield: string;
  startDate: string;
  endDate: string;
  duration: string;
  processingLocation: string;
  notes: string;
  processorName: string;
  image: File | null;
}

interface LocationData {
  latitude: string;
  longitude: string;
  timestamp: string;
  accuracy: number;
}

interface QRResult {
  batchId: string;
  eventId: string;
  processing: {
    method: string;
    temperature: number | null;
    yield: number;
    duration: string;
    yieldPercentage: number | null;
  };
  qr: {
    dataURL: string;
    trackingUrl: string;
    qrHash: string;
  };
  hyperledgerFabric: any;
}

const ProcessingForm: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [qrResult, setQrResult] = useState<QRResult | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false); // Added missing state
  const [yieldPercentage, setYieldPercentage] = useState<number | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    batchId: '',
    inputWeight: '',
    method: '',
    temperature: '',
    yield: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    duration: '',
    processingLocation: '',
    notes: '',
    processorName: user?.name || '',
    image: null,
  });

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    // Calculate yield percentage when input weight and yield change
    if (formData.inputWeight && formData.yield) {
      const inputWeight = parseFloat(formData.inputWeight);
      const outputWeight = parseFloat(formData.yield);
      if (inputWeight > 0) {
        setYieldPercentage((outputWeight / inputWeight) * 100);
      }
    } else {
      setYieldPercentage(null);
    }
  }, [formData.inputWeight, formData.yield]);

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
            timestamp: new Date().toISOString(),
            accuracy: position.coords.accuracy,
          });
          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get location. Please ensure location services are enabled.');
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      setLocationLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setFormData((prev) => ({
        ...prev,
        image: file,
      }));
      setError('');
    } else {
      setError('Please upload a valid image file (PNG, JPG, JPEG).');
    }
  };

  const handleQRScanSuccess = (qrData: any) => {
    try { // Added try-catch to handle QR parsing errors
      console.log('QR Data received:', qrData);
      setFormData((prev) => ({
        ...prev,
        batchId: qrData.batchId || '',
      }));
      setShowQRScanner(false);
      setError('');
    } catch (err) {
      setError('Error processing QR code: ' + (err as Error).message);
      setShowQRScanner(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Validate required fields
      if (!formData.batchId) {
        throw new Error('Batch ID is required. Please enter the batch ID or scan a QR code.');
      }
      if (
        !formData.inputWeight ||
        !formData.yield ||
        !formData.method ||
        !formData.startDate ||
        !formData.endDate ||
        !formData.processingLocation ||
        !formData.processorName
      ) {
        throw new Error('Please fill in all required fields.');
      }

      // Verify the batch exists
      try {
        await blockchainService.getBatchInfo(formData.batchId);
      } catch (error) {
        throw new Error(`Batch ${formData.batchId} not found. Please check the batch ID.`);
      }

      const processEventId = blockchainService.generateEventId('PROCESSING');

      let imageHash: string | null = null;
      if (formData.image) {
        const imageUpload = await ipfsService.uploadFile(formData.image);
        if (!imageUpload.success) {
          throw new Error('Failed to upload image to IPFS.');
        }
        imageHash = imageUpload.ipfsHash;
      }

      // Create processing metadata
      const processData = {
        batchId: formData.batchId,
        eventId: processEventId,
        processor: formData.processorName,
        inputWeight: parseFloat(formData.inputWeight),
        method: formData.method,
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        duration: formData.duration,
        startDate: formData.startDate,
        endDate: formData.endDate,
        yield: parseFloat(formData.yield),
        yieldPercentage: yieldPercentage,
        processingLocation: formData.processingLocation,
        location,
        processDate: new Date().toISOString().split('T')[0],
        notes: formData.notes,
        images: imageHash ? [imageHash] : [],
      };

      const metadataUpload = await ipfsService.createProcessingMetadata(processData);
      if (!metadataUpload.success) {
        console.warn('IPFS upload warning:', metadataUpload.warning || 'Upload failed');
        throw new Error('Failed to upload metadata to IPFS.');
      }

      // Generate QR code
      const qrResult = await qrService.generateProcessingQR(
        formData.batchId,
        processEventId,
        formData.processorName,
        formData.method
      );

      if (!qrResult.success) {
        throw new Error('Failed to generate QR code: ' + (qrResult.error || 'Unknown error'));
      }

      // Add event to blockchain
      const eventData = {
        batchId: formData.batchId,
        eventId: processEventId,
        processorName: formData.processorName,
        method: formData.method,
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        duration: formData.duration,
        yield: parseFloat(formData.yield),
        yieldPercentage: yieldPercentage,
        notes: formData.notes,
        ipfsHash: metadataUpload.data.ipfsHash,
        location: {
          latitude: location?.latitude || '0',
          longitude: location?.longitude || '0',
          zone: formData.processingLocation || 'Processing Facility',
        },
        qrCodeHash: qrResult.qrHash,
      };

      const blockchainResult = await blockchainService.addProcessingEvent(
        user?.address || '',
        eventData
      );

      if (!blockchainResult?.success) {
        throw new Error('Failed to record on Hyperledger Fabric: ' + (blockchainResult?.error || 'Unknown error'));
      }

      setSuccess(true);
      setQrResult({
        batchId: formData.batchId,
        eventId: processEventId,
        processing: {
          method: formData.method,
          temperature: formData.temperature ? parseFloat(formData.temperature) : null,
          yield: parseFloat(formData.yield),
          duration: formData.duration,
          yieldPercentage: yieldPercentage,
        },
        qr: qrResult,
        hyperledgerFabric: blockchainResult,
      });

      // Reset form
      setFormData({
        batchId: '',
        inputWeight: '',
        method: '',
        temperature: '',
        yield: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        duration: '',
        processingLocation: '',
        notes: '',
        processorName: user?.name || '',
        image: null,
      });
      setYieldPercentage(null);
    } catch (error) {
      setError((error as Error).message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setQrResult(null);
    setError('');
    setFormData({
      batchId: '',
      inputWeight: '',
      method: '',
      temperature: '',
      yield: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      duration: '',
      processingLocation: '',
      notes: '',
      processorName: user?.name || '',
      image: null,
    });
    setYieldPercentage(null);
  };

  if (success && qrResult) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Processing Completed!</h2>
            <p className="text-green-600">Processing details have been recorded on the blockchain</p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-purple-700">Batch ID:</span>
                <p className="text-purple-900 font-mono">{qrResult.batchId}</p>
              </div>
              <div>
                <span className="font-medium text-purple-700">Process Event ID:</span>
                <p className="text-purple-900 font-mono">{qrResult.eventId}</p>
              </div>
              <div>
                <span className="font-medium text-purple-700">Method:</span>
                <p className="text-purple-900">{qrResult.processing.method}</p>
              </div>
              <div>
                <span className="font-medium text-purple-700">Yield:</span>
                <p className="text-purple-900">{qrResult.processing.yield}g</p>
              </div>
              {qrResult.processing.temperature && (
                <div>
                  <span className="font-medium text-purple-700">Temperature:</span>
                  <p className="text-purple-900">{qrResult.processing.temperature}°C</p>
                </div>
              )}
              <div>
                <span className="font-medium text-purple-700">Duration:</span>
                <p className="text-purple-900">{qrResult.processing.duration}</p>
              </div>
              {qrResult.processing.yieldPercentage && (
                <div>
                  <span className="font-medium text-purple-700">Yield %:</span>
                  <p className="text-purple-900">{qrResult.processing.yieldPercentage.toFixed(2)}%</p>
                </div>
              )}
            </div>
          </div>

          <QRCodeDisplay
            qrData={{
              dataURL: qrResult.qr.dataURL,
              trackingUrl: qrResult.qr.trackingUrl,
              eventId: qrResult.eventId,
            }}
            title="Processing QR Code"
            subtitle="Scan to view processing details"
          />

          <button
            onClick={handleReset}
            className="w-full mt-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 font-medium"
            aria-label="Process new batch"
          >
            Process New Batch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
            <Cpu className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-purple-800">Processing Unit</h2>
            <p className="text-purple-600">Record processing operations with location and timestamps</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2" role="alert">
            <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {locationLoading && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-center space-x-2" role="status">
            <Loader2 className="h-5 w-5 text-purple-600 animate-spin" aria-hidden="true" />
            <p className="text-purple-700">Fetching location...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" aria-label="Processing Form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Batch ID *
              </label>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    name="batchId"
                    value={formData.batchId}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter Batch ID (HERB-1234567890-1234)"
                    className="flex-1 px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowQRScanner(true)}
                    className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center space-x-2"
                    aria-label="Scan QR code for batch ID"
                  >
                    <Camera className="h-5 w-5" aria-hidden="true" />
                    <span>Scan QR</span>
                  </button>
                </div>
                <p className="text-xs text-purple-600">
                  Enter the Batch ID or scan any QR code from this batch
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Input Weight (grams) *
              </label>
              <input
                type="number"
                step="0.1"
                name="inputWeight"
                value={formData.inputWeight}
                onChange={handleInputChange}
                required
                placeholder="500.0"
                className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-required="true"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Processing Location *
              </label>
              <input
                type="text"
                name="processingLocation"
                value={formData.processingLocation}
                onChange={handleInputChange}
                required
                placeholder="Enter processing facility location"
                className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-required="true"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-required="true"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-required="true"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Processing Method *
              </label>
              <select
                name="method"
                value={formData.method}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-required="true"
              >
                <option value="">Select Processing Method</option>
                {PROCESSING_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Output Yield (grams) *
              </label>
              <input
                type="number"
                step="0.1"
                name="yield"
                value={formData.yield}
                onChange={handleInputChange}
                required
                placeholder="250.5"
                className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-required="true"
              />
              {yieldPercentage !== null && (
                <div className="mt-2 flex items-center space-x-2 text-sm">
                  <Calculator className="h-4 w-4 text-purple-600" aria-hidden="true" />
                  <span className="text-purple-700">
                    Yield Percentage: <strong>{yieldPercentage.toFixed(2)}%</strong>
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                name="temperature"
                value={formData.temperature}
                onChange={handleInputChange}
                placeholder="60.0"
                className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Duration
              </label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                placeholder="2 hours"
                className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                Processor Name *
              </label>
              <input
                type="text"
                name="processorName"
                value={formData.processorName}
                onChange={handleInputChange}
                required
                placeholder="Enter processor name"
                className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-required="true"
              />
            </div>
          </div>

          {location && !locationLoading && (
            <div
              className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200"
              aria-label="Processing Location Information"
            >
              <h3 className="text-sm font-semibold text-purple-800 mb-2 flex items-center">
                <MapPin className="h-4 w-4 mr-2" aria-hidden="true" />
                Processing Location & Timestamp
              </h3>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-medium text-purple-600">Latitude:</span>
                  <p className="text-purple-900">{parseFloat(location.latitude).toFixed(6)}</p>
                </div>
                <div>
                  <span className="font-medium text-purple-600">Longitude:</span>
                  <p className="text-purple-900">{parseFloat(location.longitude).toFixed(6)}</p>
                </div>
                <div>
                  <span className="font-medium text-purple-600">Timestamp:</span>
                  <p className="text-purple-900">{new Date(location.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-purple-700 mb-2">
              Upload Processing Image (optional)
            </label>
            <div className="border-2 border-dashed border-purple-200 rounded-lg p-6">
              <div className="text-center">
                <Cpu className="h-12 w-12 text-purple-400 mx-auto mb-4" aria-hidden="true" />
                <div className="flex text-sm text-purple-600">
                  <label
                    className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500"
                    htmlFor="imageUpload"
                  >
                    <span>Upload a file</span>
                    <input
                      id="imageUpload"
                      type="file"
                      name="image"
                      onChange={handleFileChange}
                      accept="image/png,image/jpeg,image/jpg"
                      className="sr-only"
                      aria-label="Upload processing image"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-purple-500">PNG, JPG, JPEG up to 10MB</p>
                {formData.image && (
                  <p className="mt-2 text-sm font-medium text-purple-700">
                    Selected: {formData.image.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-700 mb-2">
              Processing Notes (optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Add any additional notes about this processing operation..."
              className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              aria-label="Additional processing notes"
            />
          </div>

          <button
            type="submit"
            disabled={loading || locationLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-4 px-6 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            aria-label="Record processing details"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Recording Processing...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" aria-hidden="true" />
                <span>Record Processing</span>
              </>
            )}
          </button>
        </form>

        {showQRScanner && (
          <QRScanner
            title="Scan QR Code from Quality Test"
            onScanSuccess={handleQRScanSuccess}
            onClose={() => setShowQRScanner(false)}
          />
        )}
      </div>
    </div>
  );
};

export default ProcessingForm;