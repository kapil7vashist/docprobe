import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import dataExtractor from '../helpers/extractor.js';
import { ENV } from '../env.js';
import fs from 'fs';

const getPdfBuffer = async (oem, base64String) => {
  if (ENV === 'development') {
    return readFile(path.join(process.cwd(), 'tmp', `${oem} INVOICE.pdf`));
  }

  if (!base64String) {
    return null;
  }

  const base64Data = base64String.replace(/^data:application\/pdf;base64,/, '');
  return Buffer.from(base64Data, 'base64');
};

const pdfParse = async (req, res, next) => {
  try {
    const { oem, dealerCode, base64String } = req.body;

    const pdfBuffer = await getPdfBuffer(oem, base64String);

    if (!pdfBuffer) {
      return res.status(400).json({ msg: 'base64String is required' });
    }

    const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
    const result = await parser.getText();

    const pdfText = result.text;
    const data = await dataExtractor(pdfText, oem, dealerCode);
    console.log({data});

    await parser.destroy();
    ENV === 'development' && fs.writeFileSync(path.join(process.cwd(), 'tmp', `${oem} INVOICE.txt`), pdfText);

    return res.status(200).json({ text: result.text });
  } catch (err) {
    console.log({ err });
    return res.status(500).json({ msg: 'Unable to Compelte Request' });
  }
};

export default pdfParse;