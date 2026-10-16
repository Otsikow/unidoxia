import { sanitizeFileName } from './validation';
import { validatePdfIntegrity } from '../../supabase/functions/_shared/pdfIntegrity.ts';

type MagicSignature = {
  mimeType: string;
  bytes: number[];
  offset?: number;
  verifier?: (dataView: Uint8Array) => boolean;
};

const MAGIC_SIGNATURES: MagicSignature[] = [
  { mimeType: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { mimeType: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mimeType: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mimeType: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  {
    mimeType: 'image/webp',
    bytes: [0x52, 0x49, 0x46, 0x46], // RIFF
    verifier: (data) =>
      data.length >= 12 &&
      data[8] === 0x57 &&
      data[9] === 0x45 &&
      data[10] === 0x42 &&
      data[11] === 0x50, // WEBP
  },
  {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    bytes: [0x50, 0x4b, 0x03, 0x04], // ZIP container used by DOCX
  },
  { mimeType: 'application/msword', bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }, // Legacy DOC
];

function matchesSignature(data: Uint8Array, signature: MagicSignature): boolean {
  const offset = signature.offset ?? 0;
  if (data.length < signature.bytes.length + offset) return false;
  return signature.bytes.every((byte, index) => data[offset + index] === byte);
}

async function detectMimeTypeFromMagicBytes(file: File | Blob): Promise<string | null> {
  const probe = file.slice(0, 16);
  const buffer = await probe.arrayBuffer();
  const data = new Uint8Array(buffer);

  for (const signature of MAGIC_SIGNATURES) {
    if (matchesSignature(data, signature) && (!signature.verifier || signature.verifier(data))) {
      return signature.mimeType;
    }
  }

  return null;
}

export type UploadValidationOptions = {
  allowedMimeTypes: string[];
  allowedExtensions?: string[];
  maxSizeBytes?: number;
};

export type UploadValidationResult = {
  detectedMimeType: string;
  sanitizedFileName: string;
  preparedFile: File;
};

function isMimeAllowed(
  allowedMimeTypes: string[],
  candidateMimeTypes: string[],
  extension: string | null
): boolean {
  const normalizedCandidates = candidateMimeTypes.filter(Boolean);
  if (normalizedCandidates.some((candidate) => allowedMimeTypes.includes(candidate))) {
    return true;
  }

  if (extension === 'docx' && allowedMimeTypes.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
    // Some browsers report generic zip mimetype for DOCX; allow based on extension as a fallback.
    return true;
  }

  return false;
}

export async function validateFileUpload(
  file: File,
  options: UploadValidationOptions
): Promise<UploadValidationResult> {
  const sanitizedFileName = sanitizeFileName(file.name);
  const extension = sanitizedFileName.split('.').pop()?.toLowerCase() ?? null;

  if (options.allowedExtensions && extension && !options.allowedExtensions.includes(extension)) {
    throw new Error('This file extension is not allowed.');
  }

  // FIX: Reject empty files (0 bytes)
  // Root cause: Browser file pickers can select empty files if the source is corrupted
  // or if the file was truncated during download/transfer
  if (file.size === 0) {
    throw new Error('This file appears to be empty. Please check the file and try again.');
  }

  // FIX: Reject suspiciously small files that claim to be PDFs or documents
  // Root cause: Truncated or corrupted uploads can result in files with headers only
  if (file.size < 100 && (extension === 'pdf' || extension === 'docx' || extension === 'doc')) {
    throw new Error('This document appears to be corrupted or incomplete. Please check the file and try again.');
  }

  if (options.maxSizeBytes && file.size > options.maxSizeBytes) {
    throw new Error('File size exceeds the allowed limit.');
  }

  const magicMime = await detectMimeTypeFromMagicBytes(file);
  const detectedMimeType = magicMime ?? file.type;

  if (!detectedMimeType) {
    throw new Error('We could not determine this file type.');
  }

  const contentTypeMatches = isMimeAllowed(options.allowedMimeTypes, [detectedMimeType, file.type], extension);

  if (!contentTypeMatches) {
    throw new Error('Unsupported file type.');
  }

  // FIX: Additional integrity check for PDFs
  // Root cause: Valid PDF files must have at minimum a header, body, and trailer
  // Files smaller than 200 bytes are almost certainly corrupted
  if (detectedMimeType === 'application/pdf' && file.size < 200) {
    throw new Error('This PDF appears to be corrupted or truncated. Please check the file and try again.');
  }

  // Check both PDF identity and completeness, including padded and incremental PDFs.
  if (detectedMimeType === 'application/pdf' || file.type === 'application/pdf' || extension === 'pdf') {
    const isValidPdf = await validatePdfIntegrity(file);
    if (!isValidPdf) {
      throw new Error('This PDF file appears to be truncated or corrupted (invalid header or missing end marker). Please check the original file and try uploading again.');
    }
  }

  const preparedFile = new File([file], sanitizedFileName, { type: detectedMimeType });

  return { detectedMimeType, sanitizedFileName, preparedFile };
}

/**
 * Verifies that an uploaded file in Supabase storage matches the expected size.
 * This catches truncation that occurs during the upload process itself.
 * 
 * @param bucket - Supabase storage bucket name
 * @param path - Object path in the bucket
 * @param expectedSize - Original file size in bytes
 * @returns true if sizes match, false otherwise
 */
export async function verifyUploadedFileSize(
  supabaseClient: any,
  bucket: string,
  path: string,
  expectedSize: number
): Promise<{ valid: boolean; actualSize?: number; error?: string }> {
  try {
    // Get file metadata from storage
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .list(path.split('/').slice(0, -1).join('/'), {
        search: path.split('/').pop(),
      });

    if (error) {
      return { valid: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { valid: false, error: 'Uploaded file not found in storage' };
    }

    const fileMetadata = data[0];
    const actualSize = fileMetadata.metadata?.size ?? 0;

    if (actualSize !== expectedSize) {
      return {
        valid: false,
        actualSize,
        error: `Upload verification failed: file was truncated (expected ${expectedSize} bytes, got ${actualSize} bytes)`,
      };
    }

    return { valid: true, actualSize };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Unknown verification error',
    };
  }
}

