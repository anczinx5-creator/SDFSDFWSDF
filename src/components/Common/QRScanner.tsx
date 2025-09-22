import React, { useState, useRef } from 'react';
import { Upload, QrCode, X, AlertCircle } from 'lucide-react';
import jsQR from 'jsqr';
import qrService from '../../services/qrService';

interface QRScannerProps {
  onScanSuccess: (qrData: any) => void;
  onClose: () => void;
  title?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose, title = "Scan QR Code" }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, GIF)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = async () => {
        try {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);

          if (!imageData) {
            throw new Error('Failed to get image data');
          }

          // Decode QR code using jsQR
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
          if (!qrCode?.data) {
            throw new Error('No QR code found in image');
          }

          const qrText = qrCode.data;
          console.log('Scanned QR text:', qrText); // Debug: Log the raw QR content

          const parsedData = await qrService.parseQRData(qrText);
          if (parsedData.success) {
            onScanSuccess(parsedData.data);
          } else {
            setError(parsedData.error || 'Invalid QR code format');
          }
        } catch (err) {
          setError((err as Error).message || 'Failed to read QR code from image');
        } finally {
          setLoading(false);
        }
      };

      img.onerror = () => {
        setError('Failed to load image');
        setLoading(false);
      };

      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to process image');
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close QR scanner"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {loading ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">Reading QR code...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <QrCode className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Upload QR Code Image
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop an image with a QR code, or click to browse
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center space-x-2"
                  aria-label="Choose QR code image"
                >
                  <Upload className="h-5 w-5" />
                  <span>Choose Image</span>
                </button>

                <div className="text-xs text-gray-500">
                  Supported formats: JPG, PNG, GIF
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
                aria-label="Upload QR code image"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;