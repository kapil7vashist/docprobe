import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { OCR_KEY, ENV } from '../env.js';

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

// English, Hindi (Devanagari), digits, and whitespace only
const DISALLOWED_CHAR_PATTERN = /[^\u0900-\u097Fa-zA-Z0-9\s]/g;

const filterOcrText = (text) => {
  if (!text) {
    return text;
  }

  return text
    .replace(DISALLOWED_CHAR_PATTERN, '')
    .replace(/\s+/g, ' ')
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

const normalizeBase64Image = (base64String, filetype = 'JPG') => {
  const trimmed = base64String.trim();

  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  const mimeType = MIME_TYPES[filetype.toUpperCase()] || MIME_TYPES.JPG;
  return `data:${mimeType};base64,${trimmed}`;
};

const getBase64Image = async (base64String, filetype) => {
  if (ENV === 'development') {
    const buffer = await readFile(path.join(process.cwd(), 'tmp', 'AADHAR.png'));
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  }

  if (!base64String) {
    return null;
  }

  return normalizeBase64Image(base64String, filetype);
};

const documentOcr = async (req, res, next) => {
  try {
    const {
      base64String,
      language = 'eng',
      filetype = 'JPEG',
      isOverlayRequired = false,
      detectOrientation = true,
      scale = false,
      isTable = false,
      OCREngine
    } = req.body;

    if (!OCR_KEY) {
      return res.status(500).json({ msg: 'OCR API key is not configured' });
    }

    const base64Image = await getBase64Image(base64String, filetype);

    if (!base64Image) {
      return res.status(400).json({ msg: 'base64String is required' });
    }

    const formData = new FormData();
    formData.append('base64Image', base64Image);
    formData.append('language', language);
    formData.append('filetype', filetype);
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
    console.log({ err });
    return res.status(500).json({ msg: 'Unable to Complete Request' });
  }
};

export default documentOcr;
