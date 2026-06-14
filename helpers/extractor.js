import { extractionTemplates, extractionTemplateKTM, extractionTemplateHONDA, extractionTemplateBAJAJ, extractionTemplateTVS } from './templates.js';

const getTemplates = (oem) => {
  const normalizedOem = oem?.toUpperCase();

  if (normalizedOem === 'KTM') {
    return extractionTemplateKTM;
  }

  if (normalizedOem === 'HONDA') {
    return extractionTemplateHONDA;
  }

  if (normalizedOem === 'BAJAJ') {
    return extractionTemplateBAJAJ;
  }

  if (normalizedOem === 'TVS') {
    return extractionTemplateTVS;
  }

  return extractionTemplates;
};

//? Generic Function to extract data
const dataExtractor = async (text, oem, dealerCode) => {
  const normalizedOem = oem?.toUpperCase();
  const templates = getTemplates(oem);

  const result = {
    customerName: normalizedOem === 'BAJAJ'
      ? extractBajajCustomerName(text, templates.customerName)
      : normalizedOem === 'TVS'
        ? extractTvsCustomerName(text, templates.customerName)
        : extractField(text, templates.customerName),

    customerAddress: normalizedOem === 'TVS'
      ? extractTvsCustomerAddress(text, templates.customerAddress)
      : extractField(text, templates.customerAddress),

    pincode: extractField(
      text,
      templates.pincode
    ),

    hypothecation: extractField(
      text,
      templates.hypothecation
    ),

    chassisNo: extractField(
      text,
      templates.chassisNo
    ),

    engineNo: extractField(
      text,
      templates.engineNo
    ),

    model: extractField(
      text,
      templates.model
    ),

    variant: extractField(
      text,
      templates.variant
    ),

    exshowroom: extractField(
      text,
      templates.exshowroom
    )

  };

  return result;

};
 
//? Function to Extract Fields
const extractField = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].trim().replace(/\s+/g, " ");
    }

    if (match?.[0]) {
      return match[0].trim().replace(/\s+/g, " ");
    }
  }

  return null;
};

const extractBajajCustomerName = (text, patterns) => {
  const name = extractField(text, patterns);
  const relation = extractField(text, [
    /S\/O\s*\|\s*D\/O\s*\|\s*W\/O\s*:\s*([^\n\r]+)/i
  ]);

  if (!name) {
    return null;
  }

  return relation ? `${name} ${relation}` : name;
};

const extractTvsCustomerName = (text, patterns) => {
  const name = extractField(text, patterns);
  const relation = extractField(text, [
    /S\/W\/D\s*:?\s*([^\n\r\t]+)/i
  ]);

  if (!name) {
    return null;
  }

  return relation ? `${name} S/W/D:${relation}` : name;
};

const extractTvsCustomerAddress = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1] && match?.[2]) {
      return `${match[1].trim()} ${match[2].trim()}`.replace(/\s+/g, " ");
    }

    if (match?.[1]) {
      return match[1].trim().replace(/\s+/g, " ");
    }
  }

  return null;
};

export default dataExtractor;


