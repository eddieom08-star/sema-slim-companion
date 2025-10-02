import { useState, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (priority) {
      loadImage();
      return;
    }

    if (!imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, priority]);

  const loadImage = () => {
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      onLoad?.();
    };

    img.onerror = () => {
      setError(true);
      setIsLoading(false);
      onError?.();
    };

    img.src = src;
  };

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ width, height }}
        data-testid="image-error"
      >
        <span className="text-muted-foreground text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <Skeleton
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
          data-testid="image-loading"
        />
      )}
      <img
        ref={imgRef}
        src={imageSrc || undefined}
        alt={alt}
        className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ${className}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        loading={priority ? 'eager' : 'lazy'}
        data-testid="optimized-image"
      />
    </div>
  );
}

export function useImageOptimization() {
  const canUseWebP = useRef<boolean | null>(null);

  useEffect(() => {
    const checkWebPSupport = async () => {
      if (canUseWebP.current !== null) return;

      const webpData = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoCAAEAAQAcJaQAA3AA/v3AgAA=';
      
      try {
        const img = new Image();
        img.src = webpData;
        await img.decode();
        canUseWebP.current = true;
      } catch {
        canUseWebP.current = false;
      }
    };

    checkWebPSupport();
  }, []);

  const getOptimizedImageUrl = (url: string, options?: { width?: number; quality?: number }) => {
    if (!url) return url;

    const supportsWebP = canUseWebP.current ?? false;
    
    if (url.includes('openfoodfacts.org') || url.includes('cloudinary') || url.includes('imgix')) {
      const params = new URLSearchParams();
      
      if (options?.width) params.append('w', options.width.toString());
      if (options?.quality) params.append('q', options.quality.toString());
      if (supportsWebP) params.append('fm', 'webp');
      
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}${params.toString()}`;
    }

    return url;
  };

  return { getOptimizedImageUrl, supportsWebP: canUseWebP.current };
}
