import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import dataExtractor, { isMakeMismatch, MAKE_MISMATCH_MSG } from '../helpers/extractor.js';
import { ENV } from '../env.js';
import fs from 'fs';
import findRelatedMappingData from '../helpers/findRelatedMappingData.js';
import getRtoDetails from '../helpers/getRtoDetails.js';
import getFinancerName from '../helpers/getFinancerName.js';

const getPdfBuffer = async (oem, base64String) => {
  const hasBase64 = base64String && String(base64String).trim();

  if (hasBase64) {
    const base64Data = base64String.replace(/^data:application\/pdf;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  if (ENV === 'development') {
    return readFile(path.join(process.cwd(), 'tmp', `${oem} INVOICE.pdf`));
  }

  return null;
};

const pdfParse = async (req, res, next) => {
  try {
    const { oem, dealerCode, base64String, insurer } = req.body;

    const pdfBuffer = await getPdfBuffer(oem, base64String);

    if (!pdfBuffer) {
      return res.status(400).json({ msg: 'base64String is required' });
    }

    const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
    const result = await parser.getText();

    const pdfText = result.text;
    const data = await dataExtractor(pdfText, oem, dealerCode);
    console.log({ data });

    await parser.destroy();

    if (isMakeMismatch(oem, pdfText, data?.model)) {
      return res.status(400).json({ msg: MAKE_MISMATCH_MSG });
    }

    const hasModel = Boolean(String(data?.model || '').trim());
    if (!hasModel) {
      return res.status(400).json({
        msg: 'Unable to extract model/variant from the invoice. Please upload the correct invoice.'
      });
    }

    const mapping = await findRelatedMappingData(
      oem,
      data?.model,
      data?.variant || 'STD',
      insurer,
      data?.hypothecation || null,
      data?.exshowroom,
      data?.cc
    );

    const rtoDetails = await getRtoDetails(insurer, data?.pincode);
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

export default pdfParse;
