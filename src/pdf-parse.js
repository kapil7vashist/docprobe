import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import dataExtractor, { isMakeMismatch, MAKE_MISMATCH_MSG } from '../helpers/extractor.js';
import { ENV } from '../env.js';
import fs from 'fs';
import findRelatedMappingData from '../helpers/findRelatedMappingData.js';
import getRtoDetails from '../helpers/getRtoDetails.js';
import getFinancerName from '../helpers/getFinancerName.js';
import { recognizeDocumentText } from './documentOcr.js';

const getPdfBuffer = async (oem, base64String) => {
  const hasBase64 = base64String && String(base64String).trim();

  if (hasBase64) {
    const base64Data = base64String.replace(/^data:application\/pdf;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  if (ENV === 'development') {
    return readFile(path.join(process.cwd(), 'tmp', `SHISA ${oem} 2.pdf`));
  }

  return null;
};

const readInvoice = async (pdfBuffer, oem, dealerCode) => {
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
  const result = await parser.getText();

  let pdfText = result.text;
  let data = await dataExtractor(pdfText, oem, dealerCode);

  if (!String(data?.model || '').trim()) {
    const ocrText = await recognizeDocumentText(pdfBuffer);
    if (ocrText) {
      pdfText = ocrText;
      data = await dataExtractor(ocrText, oem, dealerCode);
    }
  }

  await parser.destroy();
  return { pdfText, data };
};

const invoiceError = (oem, pdfText, data) => {
  if (isMakeMismatch(oem, pdfText, data?.model)) {
    return { status: 400, body: { msg: MAKE_MISMATCH_MSG } };
  }

  if (!String(data?.model || '').trim()) {
    return {
      status: 400,
      body: { msg: 'Unable to extract model/variant from the invoice. Please upload the correct invoice.' }
    };
  }

  return null;
};

const pdfParse = async (req, res, next) => {
  try {
    const { oem, dealerCode, base64String, insurer, models } = req.body;

    const pdfBuffer = await getPdfBuffer(oem, base64String);

    if (!pdfBuffer) {
      return res.status(400).json({ msg: 'base64String is required' });
    }

    const { pdfText, data } = await readInvoice(pdfBuffer, oem, dealerCode);
    console.log({ data });

    const rejected = invoiceError(oem, pdfText, data);
    if (rejected) {
      return res.status(rejected.status).json(rejected.body);
    }

    const matchVariant = [data?.variant, data?.productCode].filter(Boolean).join(' ') || 'STD';

    const mapping = await findRelatedMappingData(
      oem,
      data?.model,
      matchVariant,
      insurer,
      data?.hypothecation || null,
      data?.exshowroom,
      data?.cc,
      models
    );

    const rtoDetails = await getRtoDetails(insurer, data?.pincode, dealerCode);
    console.log({ rtoDetails });

    const financerDetails = await getFinancerName(insurer, data?.hypothecation, rtoDetails);
    console.log({ financerDetails });

    const final = {
      ...data,
      rtoDetails,
      financerDetails,
      closestModel: mapping?.closestModel || null,
      topMatches: mapping?.topMatches || []
    };

    console.log({ final });
    ENV === 'development' && fs.writeFileSync(path.join(process.cwd(), 'tmp', `${oem} INVOICE.txt`), pdfText);

    return res.status(200).json(final);
  } catch (err) {
    console.log({ err });
    return res.status(500).json({ msg: 'Unable to Compelte Request' });
  }
};

const certificateInvoice = async (req, res, next) => {
  try {
    const { oem, dealerCode, base64String } = req.body;

    const pdfBuffer = await getPdfBuffer(oem, base64String);

    if (!pdfBuffer) {
      return res.status(400).json({ msg: 'base64String is required' });
    }

    const { pdfText, data } = await readInvoice(pdfBuffer, oem, dealerCode);
    console.log({ data });

    const rejected = invoiceError(oem, pdfText, data);
    if (rejected) {
      return res.status(rejected.status).json(rejected.body);
    }

    ENV === 'development' && fs.writeFileSync(path.join(process.cwd(), 'tmp', `${oem} CERTIFICATE INVOICE.txt`), pdfText);

    return res.status(200).json(data);
  } catch (err) {
    console.log({ err });
    return res.status(500).json({ msg: 'Unable to Compelte Request' });
  }
};

export { certificateInvoice };
export default pdfParse;
