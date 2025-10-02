import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wifi, WifiOff, Signal } from 'lucide-react';
import { getConnectionSpeed } from '@/lib/pwa';

export function NetworkAwareIndicator() {
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'fast' | 'unknown'>('unknown');
  const [showSlowConnection, setShowSlowConnection] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      const speed = getConnectionSpeed();
      setConnectionSpeed(speed);
      
      if (speed === 'slow') {
        setShowSlowConnection(true);
        setTimeout(() => setShowSlowConnection(false), 5000);
      }
    };

    checkConnection();

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', checkConnection);
      return () => connection.removeEventListener('change', checkConnection);
    }
  }, []);

  if (!showSlowConnection || connectionSpeed !== 'slow') {
    return null;
  }

  return (
    <div className="fixed top-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md" data-testid="slow-connection-indicator">
      <Alert>
        <Signal className="h-4 w-4" />
        <AlertTitle>Slow Connection Detected</AlertTitle>
        <AlertDescription>
          You're on a slow connection. Some images and content may load more slowly.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function useNetworkAware() {
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'fast' | 'unknown'>('unknown');
  const [saveData, setSaveData] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      const speed = getConnectionSpeed();
      setConnectionSpeed(speed);
      
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection && 'saveData' in connection) {
        setSaveData(connection.saveData);
      }
    };

    checkConnection();

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', checkConnection);
      return () => connection.removeEventListener('change', checkConnection);
    }
  }, []);

  return {
    connectionSpeed,
    isSlowConnection: connectionSpeed === 'slow',
    saveData,
    shouldLoadImages: !saveData && connectionSpeed !== 'slow',
    shouldLoadHeavyContent: connectionSpeed === 'fast',
  };
}
