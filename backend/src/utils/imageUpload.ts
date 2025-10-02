/**
 * Image Upload Utility
 * Handles image processing, validation, and storage
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface ProcessedImage {
  filename: string;
  path: string;
  url: string;
  size: number;
  width: number;
  height: number;
}

/**
 * Process and optimize uploaded image
 */
export async function processImage(
  inputPath: string,
  outputDir: string,
  filename: string,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  try {
    const {
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 85,
      format = 'jpeg'
    } = options;

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, filename);
    
    // Process image with Sharp
    const processedImage = sharp(inputPath)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });

    // Apply format-specific options
    switch (format) {
      case 'jpeg':
        processedImage.jpeg({ quality });
        break;
      case 'png':
        processedImage.png({ quality });
        break;
      case 'webp':
        processedImage.webp({ quality });
        break;
    }

    // Save processed image
    const info = await processedImage.toFile(outputPath);
    
    // Get file stats
    const stats = await fs.stat(outputPath);
    
    // Generate URL (relative to uploads directory)
    const relativePath = path.relative('uploads', outputPath);
    const url = `/uploads/${relativePath.replace(/\\/g, '/')}`;

    logger.debug(`Image processed: ${filename} (${info.width}x${info.height}, ${stats.size} bytes)`);

    return {
      filename,
      path: outputPath,
      url,
      size: stats.size,
      width: info.width,
      height: info.height,
    };

  } catch (error) {
    logger.error(`Error processing image ${filename}:`, error);
    throw error;
  }
}

/**
 * Generate multiple image sizes (thumbnail, medium, large)
 */
export async function generateImageSizes(
  inputPath: string,
  outputDir: string,
  baseFilename: string
): Promise<{
  thumbnail: ProcessedImage;
  medium: ProcessedImage;
  large: ProcessedImage;
}> {
  try {
    const ext = path.extname(baseFilename);
    const name = path.basename(baseFilename, ext);

    const [thumbnail, medium, large] = await Promise.all([
      processImage(inputPath, outputDir, `${name}_thumb${ext}`, {
        maxWidth: 150,
        maxHeight: 150,
        quality: 80,
        format: 'jpeg'
      }),
      processImage(inputPath, outputDir, `${name}_medium${ext}`, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 85,
        format: 'jpeg'
      }),
      processImage(inputPath, outputDir, `${name}_large${ext}`, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 90,
        format: 'jpeg'
      })
    ]);

    return { thumbnail, medium, large };

  } catch (error) {
    logger.error(`Error generating image sizes for ${baseFilename}:`, error);
    throw error;
  }
}

/**
 * Delete image file
 */
export async function deleteImage(imagePath: string): Promise<void> {
  try {
    await fs.unlink(imagePath);
    logger.debug(`Image deleted: ${imagePath}`);
  } catch (error) {
    if ((error as any).code !== 'ENOENT') {
      logger.error(`Error deleting image ${imagePath}:`, error);
      throw error;
    }
  }
}

/**
 * Delete multiple image files
 */
export async function deleteImages(imagePaths: string[]): Promise<void> {
  try {
    await Promise.all(imagePaths.map(path => deleteImage(path)));
    logger.debug(`Deleted ${imagePaths.length} images`);
  } catch (error) {
    logger.error('Error deleting multiple images:', error);
    throw error;
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file: Express.Multer.File): {
  isValid: boolean;
  error?: string;
} {
  // Check file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'File size must be less than 5MB'
    };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: 'File must be a valid image (JPEG, PNG, GIF, or WebP)'
    };
  }

  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return {
      isValid: false,
      error: 'File must have a valid image extension'
    };
  }

  return { isValid: true };
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  
  // Sanitize filename
  const sanitizedName = name
    .replace(/[^a-zA-Z0-9\-_]/g, '_')
    .substring(0, 50);
  
  return `${sanitizedName}_${timestamp}_${random}${ext}`;
}

/**
 * Get image metadata
 */
export async function getImageMetadata(imagePath: string): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
}> {
  try {
    const metadata = await sharp(imagePath).metadata();
    const stats = await fs.stat(imagePath);

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: stats.size,
    };

  } catch (error) {
    logger.error(`Error getting image metadata for ${imagePath}:`, error);
    throw error;
  }
}

/**
 * Create image placeholder/fallback
 */
export async function createImagePlaceholder(
  width: number,
  height: number,
  text: string,
  outputPath: string
): Promise<void> {
  try {
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 240, g: 240, b: 240 }
      }
    })
    .png()
    .composite([{
      input: Buffer.from(`
        <svg width="${width}" height="${height}">
          <rect width="100%" height="100%" fill="#f0f0f0"/>
          <text x="50%" y="50%" text-anchor="middle" dy="0.3em" 
                font-family="Arial, sans-serif" font-size="16" fill="#666">
            ${text}
          </text>
        </svg>
      `),
      top: 0,
      left: 0
    }])
    .toFile(outputPath);

    logger.debug(`Image placeholder created: ${outputPath}`);

  } catch (error) {
    logger.error(`Error creating image placeholder:`, error);
    throw error;
  }
}