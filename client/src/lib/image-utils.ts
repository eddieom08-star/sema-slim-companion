/**
 * Image utilities for Claude API compatibility
 * 
 * Claude API has a 2000px limit on any dimension when sending multiple images.
 * This utility ensures images are resized before being sent to the API.
 */

export interface ResizeOptions {
    maxDimension?: number;  // Max width or height (default: 1920 to leave margin below 2000)
    quality?: number;       // JPEG quality 0-1 (default: 0.9)
    format?: 'jpeg' | 'png' | 'webp';  // Output format (default: jpeg)
}

export interface ProcessedImage {
    base64: string;          // Base64 encoded image data (without data: prefix)
    base64WithPrefix: string; // Full data URL with prefix
    mediaType: string;       // MIME type (e.g., 'image/jpeg')
    width: number;
    height: number;
    wasResized: boolean;
}

/**
 * Resize an image file to fit within Claude API limits
 * Returns a Promise with the processed image data
 */
export async function resizeImageForClaude(
    file: File | Blob,
    options: ResizeOptions = {}
): Promise<ProcessedImage> {
    const {
        maxDimension = 1920,  // Leave margin below 2000px limit
        quality = 0.9,
        format = 'jpeg'
    } = options;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let { width, height } = img;
            let wasResized = false;

            // Check if resizing is needed
            if (width > maxDimension || height > maxDimension) {
                wasResized = true;
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            // Draw to canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            // Use high-quality image rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // Get media type and base64
            const mediaType = `image/${format}`;
            const base64WithPrefix = canvas.toDataURL(mediaType, quality);
            const base64 = base64WithPrefix.split(',')[1];

            resolve({
                base64,
                base64WithPrefix,
                mediaType,
                width,
                height,
                wasResized
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

/**
 * Process multiple images for Claude API
 * Ensures all images are within size limits
 */
export async function processImagesForClaude(
    files: (File | Blob)[],
    options: ResizeOptions = {}
): Promise<ProcessedImage[]> {
    return Promise.all(files.map(file => resizeImageForClaude(file, options)));
}

/**
 * Format a processed image for Claude API message content
 * Returns the image block format required by Claude's API
 */
export function formatImageForClaudeAPI(processedImage: ProcessedImage) {
    return {
        type: 'image' as const,
        source: {
            type: 'base64' as const,
            media_type: processedImage.mediaType,
            data: processedImage.base64,
        },
    };
}

/**
 * Check if an image file likely exceeds Claude's size limits
 * This is a quick heuristic check without loading the full image
 */
export function mightExceedClaudeLimits(file: File): boolean {
    // Very rough heuristic: images over 5MB are likely to be high resolution
    // This is just a warning, actual check happens during processing
    return file.size > 5 * 1024 * 1024;
}

/**
 * Get image dimensions from a file without fully loading it
 */
export async function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}
