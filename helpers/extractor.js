import {
  extractionTemplates,
  extractionTemplateKTM,
  extractionTemplateHONDA,
  extractionTemplateBAJAJ,
  extractionTemplateTVS
} from './templates.js';

const OEM_TEMPLATES = {
  KTM: extractionTemplateKTM,
  HONDA: extractionTemplateHONDA,
  BAJAJ: extractionTemplateBAJAJ,
  TVS: extractionTemplateTVS
};

// Fields extracted directly from regex templates
const TEMPLATE_FIELDS = [
  'customerName',
  'customerAddress',
  'pincode',
  'hypothecation',
  'chassisNo',
  'engineNo',
  'model',
  'variant',
  'exshowroom',
  'cc'
];

const getTemplates = (oem) => {
  const oemTemplate = OEM_TEMPLATES[oem?.toUpperCase()];
  if (!oemTemplate) {
    return extractionTemplates;
  }

  // OEM patterns first, then shared fallbacks
  return mergeTemplates(oemTemplate, extractionTemplates);
};

const mergeTemplates = (primary, fallback) => {
  const fields = new Set([
    ...Object.keys(primary),
    ...Object.keys(fallback)
  ]);

  const merged = {};
  for (const field of fields) {
    merged[field] = [
      ...(primary[field] || []),
      ...(fallback[field] || [])
    ];
  }

  return merged;
};

const extractField = (text, patterns = []) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    // Pattern has capture groups — use them; skip if all empty
    if (match.length > 1) {
      const groups = match.slice(1).filter((g) => g != null && String(g).trim());
      if (groups.length > 0) {
        return groups.map((g) => g.trim()).join(' ').replace(/\s+/g, ' ');
      }
      continue;
    }

    // Pattern with no capture groups — return full match
    if (match[0]) {
      return match[0].trim().replace(/\s+/g, ' ');
    }
  }

  return null;
};

const extractFromTemplates = (text, templates) => {
  const extracted = {};

  for (const field of TEMPLATE_FIELDS) {
    extracted[field] = extractField(text, templates[field]);
  }

  return extracted;
};

const sanitizeHypothecation = (value) => {
  if (!value) {
    return null;
  }

  const cleaned = value.trim().replace(/\s+/g, ' ');

  if (!cleaned || /^[,.\-\s]+$/.test(cleaned)) {
    return null;
  }

  if (/not held under hire-purchase/i.test(cleaned)) {
    return null;
  }

  if (/^credit note/i.test(cleaned)) {
    return null;
  }

  return cleaned;
};

const normalizeRelation = (value) => {
  if (!value) {
    return null;
  }

  const cleaned = value.trim().replace(/\s+/g, ' ');

  if (!cleaned) {
    return null;
  }

  if (/^(S\/O|W\/O|D\/O|C\/O|S\/W\/D)\b/i.test(cleaned)) {
    return cleaned;
  }

  return `S/W/D:${cleaned}`;
};

const splitFirstLastName = (customerName, relation) => {
  if (!customerName) {
    return { firstName: null, lastName: null };
  }

  const parts = customerName.trim().split(/\s+/);

  if (parts.length >= 3) {
    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts[parts.length - 1]
    };
  }

  return {
    firstName: customerName,
    lastName: relation || null
  };
};

const extractCustomerIdentity = (text, customerName) => {
  let name = customerName;

  const dedicatedRelation = extractField(text, [
    /S\/O\s*\|\s*D\/O\s*\|\s*W\/O\s*:\s*([^\n\r]+)/i,
    /S\/W\/D\s*:?\s*([^\n\r\t]+)/i
  ]);

  let relation = normalizeRelation(dedicatedRelation);

  if (name) {
    const split = name.match(
      /^(.*?)\s+((?:S\/O|W\/O|D\/O|C\/O)\s+.+)$/i
    );

    if (split) {
      name = split[1].trim().replace(/\s+/g, ' ');
      relation = relation || split[2].trim().replace(/\s+/g, ' ');
    }
  }

  return {
    customerName: name || null,
    relation: relation || null
  };
};

const normalizeCc = (value) => {
  if (!value) {
    return null;
  }

  // Prefer whole CC digits, e.g. 109.51 -> 109, 110 -> 110
  const match = String(value).match(/(\d{2,4})/);
  return match ? match[1] : null;
};

// Post-processors applied after raw template extraction
const enrichExtractedData = (text, oem, raw) => {
  const { customerName, relation } = extractCustomerIdentity(text, raw.customerName);
  const { firstName, lastName } = splitFirstLastName(customerName, relation);

  return {
    make: oem?.toUpperCase() || null,
    customerName,
    firstName,
    lastName,
    relation,
    customerAddress: raw.customerAddress,
    pincode: raw.pincode,
    hypothecation: sanitizeHypothecation(raw.hypothecation),
    chassisNo: raw.chassisNo,
    engineNo: raw.engineNo,
    model: raw.model,
    variant: raw.variant,
    exshowroom: raw.exshowroom,
    cc: normalizeCc(raw.cc)
  };
};

const dataExtractor = async (text, oem, dealerCode) => {
  const templates = getTemplates(oem);
  const raw = extractFromTemplates(text, templates);
  return enrichExtractedData(text, oem, raw);
};

export default dataExtractor;
