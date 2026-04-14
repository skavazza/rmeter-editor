/**
 * Encoding utilities for reading/writing files with different character encodings.
 * Mirrors the encoding support from IniEditor (Python).
 */

const SUPPORTED_ENCODINGS = [
  { label: 'UTF-8 com BOM', value: 'utf-8-sig' },
  { label: 'UTF-8', value: 'utf-8' },
  { label: 'UTF-16 LE', value: 'utf-16le' },
  { label: 'UTF-16 BE', value: 'utf-16be' },
  { label: 'Windows-1252 (ANSI)', value: 'windows-1252' },
  { label: 'Latin-1', value: 'iso-8859-1' },
] as const;

export type EncodingValue = typeof SUPPORTED_ENCODINGS[number]['value'];
export const DEFAULT_ENCODING: EncodingValue = 'utf-8-sig';

/**
 * Detect if a Uint8Array starts with a BOM and return the corresponding encoding.
 */
export function detectBOM(bytes: Uint8Array): EncodingValue | null {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'utf-8-sig';
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return 'utf-16le';
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return 'utf-16be';
  }
  return null;
}

/**
 * Try to decode a Uint8Array with a given encoding.
 * Returns null if decoding fails.
 */
function tryDecode(bytes: Uint8Array, encoding: EncodingValue): string | null {
  try {
    const decoder = new TextDecoder(encoding, { fatal: true });
    return decoder.decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Check if a string looks like valid text (not binary garbage).
 */
function looksLikeValidText(str: string): boolean {
  // Check for too many control characters (except common whitespace)
  const controlCharCount = (str.match(/[\x00-\x08\x0e-\x1f\x7f]/g) || []).length;
  if (controlCharCount > str.length * 0.1) {
    return false;
  }
  // Check for replacement character (indicates bad encoding)
  if (str.includes('\uFFFD')) {
    return false;
  }
  return true;
}

/**
 * Auto-detect the encoding of a file and decode its content.
 * Tries BOM detection first, then falls back to trying supported encodings.
 */
export function autoDecodeContent(bytes: Uint8Array): { content: string; encoding: EncodingValue } | null {
  // Step 1: Check for BOM
  const bomEncoding = detectBOM(bytes);
  if (bomEncoding) {
    const decoded = tryDecode(bytes, bomEncoding);
    if (decoded !== null && looksLikeValidText(decoded)) {
      return { content: decoded, encoding: bomEncoding };
    }
  }

  // Step 2: Try supported encodings in priority order
  const fallbackOrder: EncodingValue[] = ['utf-8', 'windows-1252', 'iso-8859-1', 'utf-16le', 'utf-16be'];

  for (const enc of fallbackOrder) {
    const decoded = tryDecode(bytes, enc);
    if (decoded !== null && looksLikeValidText(decoded)) {
      return { content: decoded, encoding: enc };
    }
  }

  // Step 3: Last resort - try UTF-8 with replacement
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const decoded = decoder.decode(bytes);
    return { content: decoded, encoding: 'utf-8' };
  } catch {
    return null;
  }
}

/**
 * Read a file with auto-detect encoding.
 * Uses Tauri's readFile to get raw bytes, then decodes.
 */
export async function readFileWithEncoding(filePath: string, readFileFn: (path: string) => Promise<Uint8Array>): Promise<{ content: string; encoding: EncodingValue } | null> {
  try {
    const bytes = await readFileFn(filePath);
    return autoDecodeContent(bytes);
  } catch {
    return null;
  }
}

/**
 * Encode text to Uint8Array for writing with a specific encoding.
 * Note: TextEncoder only supports UTF-8 natively. For other encodings,
 * a library like iconv-lite would be needed. Since UTF-8 is universally
 * supported, we use it for all writes.
 */
export function encodeContent(_content: string, _encoding: EncodingValue): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(_content);
}

export { SUPPORTED_ENCODINGS };
