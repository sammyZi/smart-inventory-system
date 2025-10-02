/**
 * Tracking Codes Utility
 * Generates QR codes, barcodes, RFID, and NFC identifiers for products
 */

import QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import { logger } from './logger';

export interface TrackingCodes {
  qr?: string;
  rfid?: string;
  nfc?: string;
  barcode?: string;
}

/**
 * Generate all tracking codes for a product
 */
export async function generateTrackingCodes(sku: string): Promise<TrackingCodes> {
  try {
    const codes: TrackingCodes = {
      qr: await generateQRCode(sku),
      barcode: generateBarcode(sku),
      rfid: generateRFIDCode(sku),
      nfc: generateNFCCode(sku),
    };

    logger.debug(`Generated tracking codes for SKU: ${sku}`);
    return codes;

  } catch (error) {
    logger.error(`Error generating tracking codes for SKU ${sku}:`, error);
    throw error;
  }
}

/**
 * Generate QR code data URL
 */
export async function generateQRCode(sku: string): Promise<string> {
  try {
    const qrData = {
      type: 'product',
      sku,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };

    const qrString = JSON.stringify(qrData);
    const qrCodeDataURL = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });

    return qrCodeDataURL;

  } catch (error) {
    logger.error(`Error generating QR code for SKU ${sku}:`, error);
    throw error;
  }
}

/**
 * Generate barcode (Code 128 format)
 */
export function generateBarcode(sku: string): string {
  // Generate a 12-digit UPC-A compatible barcode
  const prefix = '123'; // Company prefix (would be assigned by GS1)
  const productCode = sku.replace(/[^0-9]/g, '').padStart(8, '0').slice(0, 8);
  const baseCode = prefix + productCode;
  
  // Calculate check digit using UPC-A algorithm
  let sum = 0;
  for (let i = 0; i < baseCode.length; i++) {
    const digit = parseInt(baseCode[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  const barcode = baseCode + checkDigit;
  
  return barcode;
}

/**
 * Generate RFID code (EPC format)
 */
export function generateRFIDCode(sku: string): string {
  // Generate EPC (Electronic Product Code) format
  // Format: urn:epc:id:sgtin:CompanyPrefix.ItemReference.SerialNumber
  
  const companyPrefix = '0123456'; // 7-digit company prefix
  const itemReference = sku.replace(/[^0-9A-Za-z]/g, '').padStart(5, '0').slice(0, 5);
  const serialNumber = randomBytes(4).toString('hex').toUpperCase();
  
  const epcCode = `urn:epc:id:sgtin:${companyPrefix}.${itemReference}.${serialNumber}`;
  
  return epcCode;
}

/**
 * Generate NFC code (NDEF format)
 */
export function generateNFCCode(sku: string): string {
  // Generate NDEF (NFC Data Exchange Format) URI
  const baseUrl = process.env.APP_BASE_URL || 'https://inventory.app';
  const nfcUri = `${baseUrl}/product/${sku}`;
  
  return nfcUri;
}

/**
 * Validate QR code data
 */
export function validateQRCode(qrData: string): { isValid: boolean; sku?: string; error?: string } {
  try {
    const parsed = JSON.parse(qrData);
    
    if (parsed.type !== 'product') {
      return { isValid: false, error: 'Invalid QR code type' };
    }
    
    if (!parsed.sku) {
      return { isValid: false, error: 'Missing SKU in QR code' };
    }
    
    return { isValid: true, sku: parsed.sku };
    
  } catch (error) {
    return { isValid: false, error: 'Invalid QR code format' };
  }
}

/**
 * Validate barcode format
 */
export function validateBarcode(barcode: string): { isValid: boolean; error?: string } {
  // Check if it's a valid UPC-A format (12 digits)
  if (!/^\d{12}$/.test(barcode)) {
    return { isValid: false, error: 'Barcode must be 12 digits' };
  }
  
  // Validate check digit
  const baseCode = barcode.slice(0, 11);
  const checkDigit = parseInt(barcode[11]);
  
  let sum = 0;
  for (let i = 0; i < baseCode.length; i++) {
    const digit = parseInt(baseCode[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  
  if (checkDigit !== calculatedCheckDigit) {
    return { isValid: false, error: 'Invalid barcode check digit' };
  }
  
  return { isValid: true };
}

/**
 * Validate RFID code format
 */
export function validateRFIDCode(rfidCode: string): { isValid: boolean; error?: string } {
  // Check EPC format
  const epcPattern = /^urn:epc:id:sgtin:\d{7}\.[A-Za-z0-9]{5}\.[A-F0-9]{8}$/;
  
  if (!epcPattern.test(rfidCode)) {
    return { isValid: false, error: 'Invalid RFID EPC format' };
  }
  
  return { isValid: true };
}

/**
 * Validate NFC code format
 */
export function validateNFCCode(nfcCode: string): { isValid: boolean; error?: string } {
  try {
    const url = new URL(nfcCode);
    
    if (!url.protocol.startsWith('http')) {
      return { isValid: false, error: 'NFC code must be a valid HTTP(S) URL' };
    }
    
    return { isValid: true };
    
  } catch (error) {
    return { isValid: false, error: 'Invalid NFC URL format' };
  }
}

/**
 * Generate batch tracking codes for multiple products
 */
export async function generateBatchTrackingCodes(skus: string[]): Promise<Record<string, TrackingCodes>> {
  const results: Record<string, TrackingCodes> = {};
  
  // Process in batches to avoid overwhelming the system
  const batchSize = 10;
  for (let i = 0; i < skus.length; i += batchSize) {
    const batch = skus.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (sku) => {
      try {
        const codes = await generateTrackingCodes(sku);
        return { sku, codes };
      } catch (error) {
        logger.error(`Failed to generate codes for SKU ${sku}:`, error);
        return { sku, codes: {} };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(({ sku, codes }) => {
      results[sku] = codes;
    });
  }
  
  logger.info(`Generated tracking codes for ${Object.keys(results).length} products`);
  return results;
}

/**
 * Parse tracking code to determine type and extract data
 */
export function parseTrackingCode(code: string): {
  type: 'qr' | 'barcode' | 'rfid' | 'nfc' | 'unknown';
  isValid: boolean;
  data?: any;
  error?: string;
} {
  // Try QR code first (JSON format)
  if (code.startsWith('{') || code.startsWith('data:image')) {
    const qrResult = validateQRCode(code);
    return {
      type: 'qr',
      isValid: qrResult.isValid,
      data: qrResult.sku ? { sku: qrResult.sku } : undefined,
      error: qrResult.error
    };
  }
  
  // Try barcode (12 digits)
  if (/^\d{12}$/.test(code)) {
    const barcodeResult = validateBarcode(code);
    return {
      type: 'barcode',
      isValid: barcodeResult.isValid,
      data: { barcode: code },
      error: barcodeResult.error
    };
  }
  
  // Try RFID (EPC format)
  if (code.startsWith('urn:epc:id:sgtin:')) {
    const rfidResult = validateRFIDCode(code);
    return {
      type: 'rfid',
      isValid: rfidResult.isValid,
      data: { rfid: code },
      error: rfidResult.error
    };
  }
  
  // Try NFC (URL format)
  if (code.startsWith('http')) {
    const nfcResult = validateNFCCode(code);
    return {
      type: 'nfc',
      isValid: nfcResult.isValid,
      data: { nfc: code },
      error: nfcResult.error
    };
  }
  
  return {
    type: 'unknown',
    isValid: false,
    error: 'Unknown tracking code format'
  };
}