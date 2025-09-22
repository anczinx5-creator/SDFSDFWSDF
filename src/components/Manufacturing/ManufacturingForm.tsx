import React, { useState, useEffect } from 'react';
import { Package, Upload, AlertCircle, CheckCircle, Loader2, QrCode, MapPin, Calendar, Camera } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import blockchainService from '../../services/blockchainService';
import ipfsService from '../../services/ipfsService';
import qrService from '../../services/qrService';
import QRCodeDisplay from '../Common/QRCodeDisplay';
import QRScanner from '../Common/QRScanner';

interface FormData {
  batchId: string;
  productName: string;
  productType: string;
  quantity: string;
  unit: string;
  manufacturingDate: string;
  expiryDate: string;
  certificationId: string;
  brandName: string;
  manufacturingLocation: string;
  notes: string;
  manufacturerName: string;
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
  product: {
    name: string;
    type: string;
    quantity: number;
    unit: string;
    expiryDate: string;
    certificationId: string;
    brandName: string;
  };
  qr: {
    dataURL: string;
    trackingUrl: string;
    qrHash: string;
  };
  hyperledgerFabric: any;
}

const ManufacturingForm: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [qrResult, setQrResult] = useState<QRResult | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    batchId: '',
    productName: '',
    productType: '',
    quantity: '',
    unit: 'tablets',
    manufacturingDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    certificationId: '',
    brandName: '',
    manufacturingLocation: '',
    notes: '',
    manufacturerName: user?.name || '',
    image: null,
  });

  useEffect(() => {
    getCurrentLocation();
  }, []);

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
    try {
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
        !formData.productName ||
        !formData.productType ||
        !formData.quantity ||
        !formData.manufacturingDate ||
        !formData.manufacturingLocation ||
        !formData.manufacturerName
      ) {
        throw new Error('Please fill in all required fields.');
      }

      // Verify the batch exists
      try {
        await blockchainService.getBatchInfo(formData.batchId);
      } catch (error) {
        throw new Error(`Batch ${formData.batchId} not found. Please check the batch ID.`);
      }

      const manufacturingEventId = blockchainService.generateEventId('MANUFACTURING');

      let imageHash: string | null = null;
      if (formData.image) {
        const imageUpload = await ipfsService.uploadFile(formData.image);
        if (!imageUpload.success) {
          throw new Error('Failed to upload image to IPFS.');
        }
        imageHash = imageUpload.ipfsHash;
      }

      // Create manufacturing metadata
      const manufacturingData = {
        batchId: formData.batchId,
        eventId: manufacturingEventId,
        manufacturer: formData.manufacturerName,
        productName: formData.productName,
        productType: formData.productType,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        manufacturingDate: formData.manufacturingDate,
        expiryDate: formData.expiryDate,
        certificationId: formData.certificationId,
        brandName: formData.brandName,
        manufacturingLocation: formData.manufacturingLocation,
        location,
        notes: formData.notes,
        images: imageHash ? [imageHash] : [],
      };

      const metadataUpload = await ipfsService.createManufacturingMetadata(manufacturingData);
      if (!metadataUpload.success) {
        console.warn('IPFS upload warning:', metadataUpload.warning || 'Upload failed');
        throw new Error('Failed to upload metadata to IPFS.');
      }

      // Generate QR code
      const qrResult = await qrService.generateManufacturingQR(
        formData.batchId,
        manufacturingEventId,
        formData.manufacturerName,
        formData.productName
      );

      if (!qrResult.success) {
        throw new Error('Failed to generate QR code: ' + (qrResult.error || 'Unknown error'));
      }

      // Add event to blockchain
      const eventData = {
        batchId: formData.batchId,
        eventId: manufacturingEventId,
        manufacturerName: formData.manufacturerName,
        productName: formData.productName,
        productType: formData.productType,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        expiryDate: formData.expiryDate,
        certificationId: formData.certificationId,
        brandName: formData.brandName,
        notes: formData.notes,
        ipfsHash: metadataUpload.data.ipfsHash,
        location: {
          latitude: location?.latitude || '0',
          longitude: location?.longitude || '0',
          zone: formData.manufacturingLocation || 'Manufacturing Plant',
        },
        qrCodeHash: qrResult.qrHash,
      };

      const blockchainResult = await blockchainService.addManufacturingEvent(
        user?.address || '',
        eventData
      );

      if (!blockchainResult?.success) {
        throw new Error('Failed to record on Hyperledger Fabric: ' + (blockchainResult?.error || 'Unknown error'));
      }

      setSuccess(true);
      setQrResult({
        batchId: formData.batchId,
        eventId: manufacturingEventId,
        product: {
          name: formData.productName,
          type: formData.productType,
          quantity: parseFloat(formData.quantity),
          unit: formData.unit,
          expiryDate: formData.expiryDate,
          certificationId: formData.certificationId,
          brandName: formData.brandName,
        },
        qr: qrResult,
        hyperledgerFabric: blockchainResult,
      });

      // Reset form
      setFormData({
        batchId: '',
        productName: '',
        productType: '',
        quantity: '',
        unit: 'tablets',
        manufacturingDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        certificationId: '',
        brandName: '',
        manufacturingLocation: '',
        notes: '',
        manufacturerName: user?.name || '',
        image: null,
      });
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
      productName: '',
      productType: '',
      quantity: '',
      unit: 'tablets',
      manufacturingDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      certificationId: '',
      brandName: '',
      manufacturingLocation: '',
      notes: '',
      manufacturerName: user?.name || '',
      image: null,
    });
  };

  if (success && qrResult) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Manufacturing Completed!</h2>
            <p className="text-green-600">Product manufacturing has been recorded on the blockchain</p>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-orange-700">Batch ID:</span>
                <p className="text-orange-900 font-mono">{qrResult.batchId}</p>
              </div>
              <div>
                <span className="font-medium text-orange-700">Manufacturing Event ID:</span>
                <p className="text-orange-900 font-mono">{qrResult.eventId}</p>
              </div>
              <div>
                <span className="font-medium text-orange-700">Product Name:</span>
                <p className="text-orange-900">{qrResult.product.name}</p>
              </div>
              <div>
                <span className="font-medium text-orange-700">Product Type:</span>
                <p className="text-orange-900">{qrResult.product.type}</p>
              </div>
              <div>
                <span className="font-medium text-orange-700">Quantity:</span>
                <p className="text-orange-900">{qrResult.product.quantity} {qrResult.product.unit}</p>
              </div>
              <div>
                <span className="font-medium text-orange-700">Brand:</span>
                <p className="text-orange-900">{qrResult.product.brandName || 'Not specified'}</p>
              </div>
              {qrResult.product.expiryDate && (
                <div>
                  <span className="font-medium text-orange-700">Expiry Date:</span>
                  <p className="text-orange-900">{qrResult.product.expiryDate}</p>
                </div>
              )}
              {qrResult.product.certificationId && (
                <div>
                  <span className="font-medium text-orange-700">Certification ID:</span>
                  <p className="text-orange-900">{qrResult.product.certificationId}</p>
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
            title="Final Product QR Code"
            subtitle="Consumer verification QR - scan to view complete journey"
          />

          <button
            onClick={handleReset}
            className="w-full mt-6 bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-4 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium"
            aria-label="Manufacture new product"
          >
            Manufacture New Product
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
            <Package className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-orange-800">Manufacturing Plant</h2>
            <p className="text-orange-600">Record final product manufacturing with location and timestamps</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2" role="alert">
            <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {locationLoading && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center space-x-2" role="status">
            <Loader2 className="h-5 w-5 text-orange-600 animate-spin" aria-hidden="true" />
            <p className="text-orange-700">Fetching location...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" aria-label="Manufacturing Form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-orange-700 mb-2">
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
                    className="flex-1 px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowQRScanner(true)}
                    className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
                    aria-label="Scan QR code for batch ID"
                  >
                    <Camera className="h-5 w-5" aria-hidden="true" />
                    <span>Scan QR</span>
                  </button>
                </div>
                <p className="text-xs text-orange-600">
                  Enter the Batch ID or scan any QR code from this batch
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                name="productName"
                value={formData.productName}
                onChange={handleInputChange}
                required
                placeholder="Enter product name"
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                aria-required="true"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Product Type *
              </label>
              <select
                name="productType"
                value={formData.productType}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                aria-required="true"
              >
                <option value="">Select Product Type</option>
                <option value="tablets">Tablets</option>
                <option value="capsules">Capsules</option>
                <option value="powder">Powder</option>
                <option value="syrup">Syrup</option>
                <option value="oil">Oil</option>
                <option value="cream">Cream</option>
                <option value="extract">Extract</option>
                <option value="tea">Tea</option>
                <option value="tincture">Tincture</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                step="0.1"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                required
                placeholder="100"
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                aria-required="true"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Unit *
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                aria-required="true"
              >
                <option value="tablets">Tablets</option>
                <option value="capsules">Capsules</option>
                <option value="grams">Grams</option>
                <option value="ml">Milliliters</option>
                <option value="bottles">Bottles</option>
                <option value="packets">Packets</option>
                <option value="pieces">Pieces</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Manufacturing Date *
              </label>
              <input
                type="date"
                name="manufacturingDate"
                value={formData.manufacturingDate}
                onChange={handleInputChange}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                aria-required="true"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Expiry Date
              </label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                min={formData.manufacturingDate}
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Brand Name
              </label>
              <input
                type="text"
                name="brandName"
                value={formData.brandName}
                onChange={handleInputChange}
                placeholder="Enter brand name"
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Certification ID
              </label>
              <input
                type="text"
                name="certificationId"
                value={formData.certificationId}
                onChange={handleInputChange}
                placeholder="Enter certification ID"
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Manufacturing Location *
              </label>
              <input
                type="text"
                name="manufacturingLocation"
                value={formData.manufacturingLocation}
                onChange={handleInputChange}
                required
                placeholder="Enter manufacturing facility location"
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                aria-required="true"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Manufacturer Name *
              </label>
              <input
                type="text"
                name="manufacturerName"
                value={formData.manufacturerName}
                onChange={handleInputChange}
                required
                placeholder="Enter manufacturer name"
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                aria-required="true"
              />
            </div>
          </div>

          {location && !locationLoading && (
            <div
              className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200"
              aria-label="Manufacturing Location Information"
            >
              <h3 className="text-sm font-semibold text-orange-800 mb-2 flex items-center">
                <MapPin className="h-4 w-4 mr-2" aria-hidden="true" />
                Manufacturing Location & Timestamp
              </h3>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-medium text-orange-600">Latitude:</span>
                  <p className="text-orange-900">{parseFloat(location.latitude).toFixed(6)}</p>
                </div>
                <div>
                  <span className="font-medium text-orange-600">Longitude:</span>
                  <p className="text-orange-900">{parseFloat(location.longitude).toFixed(6)}</p>
                </div>
                <div>
                  <span className="font-medium text-orange-600">Timestamp:</span>
                  <p className="text-orange-900">{new Date(location.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-orange-700 mb-2">
              Upload Product Image (optional)
            </label>
            <div className="border-2 border-dashed border-orange-200 rounded-lg p-6">
              <div className="text-center">
                <Package className="h-12 w-12 text-orange-400 mx-auto mb-4" aria-hidden="true" />
                <div className="flex text-sm text-orange-600">
                  <label
                    className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500"
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
                      aria-label="Upload product image"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-orange-500">PNG, JPG, JPEG up to 10MB</p>
                {formData.image && (
                  <p className="mt-2 text-sm font-medium text-orange-700">
                    Selected: {formData.image.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-orange-700 mb-2">
              Manufacturing Notes (optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Add any additional notes about this manufacturing process..."
              className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              aria-label="Additional manufacturing notes"
            />
          </div>

          <button
            type="submit"
            disabled={loading || locationLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 px-6 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            aria-label="Record manufacturing details"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Recording Manufacturing...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" aria-hidden="true" />
                <span>Record Manufacturing</span>
              </>
            )}
          </button>
        </form>

        {showQRScanner && (
          <QRScanner
            title="Scan QR Code from Processing Step"
            onScanSuccess={handleQRScanSuccess}
            onClose={() => setShowQRScanner(false)}
          />
        )}
      </div>
    </div>
  );
};

export default ManufacturingForm;