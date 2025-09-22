import React, { useState, useEffect } from 'react';
import { Server, AlertTriangle, Link, XCircle } from 'lucide-react';
import blockchainService from '../../services/blockchainService';

const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      await blockchainService.initialize();
      const connectionStatus = blockchainService.getConnectionStatus();
      const fabricInfo = blockchainService.getFabricNetworkInfo();
      setStatus({
        ...connectionStatus,
        fabricInfo,
        error: null
      });
    } catch (error) {
      setStatus({
        initialized: false,
        fabricInfo: blockchainService.getFabricNetworkInfo(),
        backendAvailable: false,
        fabricConnected: true, // Always true for simulation
        mode: 'error',
        network: 'hyperledger-fabric',
        error: (error as Error).message,
      });
    }
  };

  if (!status) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div 
        className={`p-3 rounded-lg shadow-lg border cursor-pointer transition-all duration-200 ${
          status.fabricConnected 
            ? 'bg-green-50 border-green-200 hover:bg-green-100' 
            : 'bg-red-50 border-red-200 hover:bg-red-100'
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center space-x-2">
          {status.fabricConnected ? (
            <Link className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          <span className={`text-sm font-medium ${
            status.fabricConnected ? 'text-green-700' : 'text-red-700'
          }`}>
            {status.fabricConnected ? 'Fabric Simulation Active' : 'Simulation Error'}
          </span>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-gray-200 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Backend:</span>
              <span className={status.backendAvailable ? 'text-green-600' : 'text-red-600'}>
                {status.backendAvailable ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Hyperledger Fabric:</span>
              <span className={status.fabricConnected ? 'text-green-600' : 'text-red-600'}>
                {status.fabricConnected ? 'Simulated' : 'Error'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Network:</span>
              <span className="text-blue-600">Simulation</span>
            </div>
            {status.fabricInfo && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Channel:</span>
                <span className="text-purple-600">{status.fabricInfo.channelName}</span>
              </div>
            )}
            {!status.fabricConnected && (
              <div className="mt-2 p-2 bg-red-100 rounded text-red-800">
                <div className="flex items-center space-x-1">
                  <XCircle className="h-3 w-3" />
                  <span>Simulation error - please refresh</span>
                </div>
                {status.error && (
                  <div className="mt-1 text-xs text-red-700">
                    {status.error}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
