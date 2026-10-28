import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { OCR_KEY, OCR_SAMPLE, ENV } from '../env.js';

const OCR_API_URL = 'https://api.ocr.space/parse/image';

const MIME_TYPES = {
  JPG: 'image/jpeg',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif',
  TIF: 'image/tiff',
  TIFF: 'image/tiff',
  BMP: 'image/bmp',
  PDF: 'application/pdf'
};

const FILETYPE_BY_MIME = {
  'image/jpeg': 'JPG',
  'image/jpg': 'JPG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/tiff': 'TIF',
  'image/tif': 'TIF',
  'image/bmp': 'BMP',
  'application/pdf': 'PDF'
};

// Letters, digits, Hindi, and the marks invoices use in addresses and codes.
const DISALLOWED_CHAR_PATTERN = /[^\u0900-\u097Fa-zA-Z0-9\s,./\-:#()&+%]/g;

const filterOcrText = (text) => {
  if (!text) {
    return text;
  }

  return text
    .replace(DISALLOWED_CHAR_PATTERN, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
};

const filterOcrResult = (ocrResult) => {
  if (!ocrResult?.ParsedResults) {
    return ocrResult;
  }

  return {
    ...ocrResult,
    ParsedResults: ocrResult.ParsedResults.map((result) => ({
      ...result,
      ParsedText: filterOcrText(result.ParsedText),
      TextOverlay: result.TextOverlay
        ? {
            ...result.TextOverlay,
            Lines: result.TextOverlay.Lines?.map((line) => ({
              ...line,
              Words: line.Words?.map((word) => ({
                ...word,
                WordText: filterOcrText(word.WordText)
              }))
            }))
          }
        : result.TextOverlay
    }))
  };
};

const detectFromBytes = (buffer) => {
  if (!buffer?.length) {
    return null;
  }

  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('latin1') === '%PDF') {
    return { filetype: 'PDF', mimeType: MIME_TYPES.PDF };
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { filetype: 'JPG', mimeType: MIME_TYPES.JPG };
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { filetype: 'PNG', mimeType: MIME_TYPES.PNG };
  }

  if (buffer.length >= 6 && buffer.subarray(0, 3).toString('latin1') === 'GIF') {
    return { filetype: 'GIF', mimeType: MIME_TYPES.GIF };
  }

  if (buffer.length >= 2 && buffer.subarray(0, 2).toString('latin1') === 'BM') {
    return { filetype: 'BMP', mimeType: MIME_TYPES.BMP };
  }

  const tiffLe = buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00;
  const tiffBe = buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a;

  if (buffer.length >= 4 && (tiffLe || tiffBe)) {
    return { filetype: 'TIF', mimeType: MIME_TYPES.TIF };
  }

  return null;
};

const filetypeFromExtension = (filePath) => {
  const ext = path.extname(filePath).slice(1).toUpperCase();
  if (ext === 'JPEG') return 'JPG';
  if (ext === 'TIFF') return 'TIF';
  return MIME_TYPES[ext] ? ext : 'JPG';
};

const documentFromBuffer = (buffer, fallbackFiletype = 'JPG') => {
  const detected = detectFromBytes(buffer);
  const filetype = detected?.filetype || fallbackFiletype;
  const mimeType = detected?.mimeType || MIME_TYPES[filetype] || MIME_TYPES.JPG;

  return {
    buffer,
    filetype,
    mimeType,
    dataUri: `data:${mimeType};base64,${buffer.toString('base64')}`
  };
};

const decodeBase64Document = (base64String) => {
  const trimmed = String(base64String || '').trim();

  if (!trimmed) {
    return null;
  }

  let payload = trimmed;
  let mimeFromUri = null;

  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:([^;,]+)?(?:;[^,]*)?,([\s\S]+)$/);
    if (match) {
      mimeFromUri = match[1]?.toLowerCase() || null;
      payload = match[2];
    }
  }

  const buffer = Buffer.from(payload.replace(/\s/g, ''), 'base64');
  const fallback = FILETYPE_BY_MIME[mimeFromUri] || 'JPG';
  return documentFromBuffer(buffer, fallback);
};

const readSampleDocument = async () => {
  if (!OCR_SAMPLE) {
    return null;
  }

  const filePath = path.isAbsolute(OCR_SAMPLE)
    ? OCR_SAMPLE
    : path.join(process.cwd(), OCR_SAMPLE);
  const buffer = await readFile(filePath);
  return documentFromBuffer(buffer, filetypeFromExtension(filePath));
};

/**
 * Uploads win in every environment. OCR_SAMPLE is only the development
 * fallback when the request has no base64String.
 */
const resolveOcrDocument = async (base64String) => {
  if (base64String && String(base64String).trim()) {
    return decodeBase64Document(base64String);
  }

  if (ENV === 'development') {
    return readSampleDocument();
  }

  return null;
};

const recognizeDocumentText = async (buffer) => {
  if (!OCR_KEY || !buffer?.length) {
    return null;
  }

  const document = documentFromBuffer(buffer, 'PDF');
  const formData = new FormData();
  formData.append('base64Image', document.dataUri);
  formData.append('language', 'eng');
  formData.append('filetype', document.filetype);
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2');

  const response = await fetch(OCR_API_URL, {
    method: 'POST',
    headers: { apikey: OCR_KEY },
    body: formData
  });
  const ocrResult = await response.json();

  if (!response.ok || ocrResult.IsErroredOnProcessing) {
    return null;
  }

  return filterOcrText(ocrResult.ParsedResults?.[0]?.ParsedText || '') || null;
};

const documentOcr = async (req, res, next) => {
  try {
    const {
      base64String,
      language = 'eng',
      isOverlayRequired = false,
      detectOrientation = true,
      scale = false,
      isTable = false,
      OCREngine
    } = req.body;

    if (!OCR_KEY) {
      return res.status(500).json({ msg: 'OCR API key is not configured' });
    }

    const document = await resolveOcrDocument(base64String);

    if (!document?.buffer?.length) {
      return res.status(400).json({ msg: 'base64String or OCR_SAMPLE is required' });
    }

    const formData = new FormData();
    formData.append('base64Image', document.dataUri);
    formData.append('language', language);
    formData.append('filetype', document.filetype);
    formData.append('isOverlayRequired', String(isOverlayRequired));
    formData.append('detectOrientation', String(detectOrientation));
    formData.append('scale', String(scale));
    formData.append('isTable', String(isTable));

    if (OCREngine) {
      formData.append('OCREngine', String(OCREngine));
    }

    const response = await fetch(OCR_API_URL, {
      method: 'POST',
      headers: {
        apikey: OCR_KEY
      },
      body: formData
    });

    const ocrResult = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        msg: 'OCR request failed',
        ocrResult
      });
    }

    if (ocrResult.IsErroredOnProcessing) {
      return res.status(422).json({
        msg: ocrResult.ErrorMessage || 'OCR processing failed',
        ocrResult
      });
    }

    return res.status(200).json(filterOcrResult(ocrResult));
  } catch (err) {
    if (err?.code === 'ENOENT') {
      return res.status(400).json({ msg: 'OCR_SAMPLE file was not found' });
    }

    console.log({ err });
    return res.status(500).json({ msg: 'Unable to Complete Request' });
  }
};

export { resolveOcrDocument, filterOcrText, recognizeDocumentText };
export default documentOcr;
