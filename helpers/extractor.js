import {
  extractionTemplates,
  extractionTemplateKTM,
  extractionTemplateHONDA,
  extractionTemplateBAJAJ,
  extractionTemplateTRIUMPH,
  extractionTemplateHERO,
  extractionTemplateTVS
} from './templates.js';
import { normalizeModelName } from './normalizeModelName.js';

const OEM_TEMPLATES = {
  KTM: extractionTemplateKTM,
  HONDA: extractionTemplateHONDA,
  BAJAJ: extractionTemplateBAJAJ,
  TRIUMPH: extractionTemplateTRIUMPH,
  HERO: extractionTemplateHERO,
  'HERO MOTOCORP': extractionTemplateHERO,
  TVS: extractionTemplateTVS
};

// Fields extracted directly from regex templates
const TEMPLATE_FIELDS = [
  'customerName',
  'customerAddress',
  'customerMobile',
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

  if (/^branch address\b/i.test(cleaned) || /^original for recipient$/i.test(cleaned)) {
    return null;
  }

  return cleaned;
};

const sanitizeAddress = (value) => {
  if (!value) {
    return null;
  }

  const cleaned = String(value)
    .replace(/\s*\[State Code\s*:\s*\d+\]/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/,(?:\s*,)+/g, ',')
    .replace(/^,\s*|\s*,$/g, '')
    .trim();

  return cleaned || null;
};

const isRelationFieldLabel = (value) =>
  /^(Customer\s*GSTIN|Phone|Aadhar|Bill\s*To|Institution|GSTIN|Mobile|Email|Hypothecated|H\.?P\.?Name)\b/i.test(value);

const normalizeRelation = (value) => {
  if (!value) {
    return null;
  }

  const cleaned = value.trim().replace(/\s+/g, ' ');

  if (!cleaned || isRelationFieldLabel(cleaned)) {
    return null;
  }

  if (/^(S\/O|W\/O|D\/O|C\/O|S\/W\/D)\s*:?\s*$/i.test(cleaned)) {
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

const stripSalutation = (value) => {
  if (!value) {
    return null;
  }

  const salutation = /^(?:Mr|Mrs|Ms|Miss|Dr|Prof|Sri|Smt|Shri|Shree|Kumari|Km|Master|Mx)\.?\s+/i;
  let name = String(value).trim().replace(/\s+/g, ' ');

  while (salutation.test(name)) {
    name = name.replace(salutation, '').trim();
  }

  return name || null;
};

const extractCustomerIdentity = (text, customerName) => {
  let name = customerName;

  const dedicatedRelation = extractField(text, [
    /S\/O\s*\|\s*D\/O\s*\|\s*W\/O\s*:[ \t]*([^\n\r]*)/i,
    /S\/W\/D\s*:[ \t]*([^\n\r\t]*)/i,
    /Father\s*:\s*(?:S\/O\s*)?([^\n\r]+)/i
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

  name = stripSalutation(name);

  return {
    customerName: name || null,
    relation: relation || null
  };
};

const normalizeCc = (value) => {
  if (!value) {
    return null;
  }

  const text = String(value);

  // Prefer whole CC digits, e.g. 109.51 -> 109, 110 -> 110
  const whole = text.match(/(\d{2,4})/);
  if (whole) {
    return whole[1];
  }

  // Chetak / EV battery capacity, e.g. 3.5 kWh -> 3.5
  const decimal = text.match(/(\d+\.\d+)/);
  return decimal ? decimal[1] : null;
};

const HERO_OEMS = new Set(['HERO', 'HERO MOTOCORP']);

const COLOR_SUFFIX_WORDS = new Set([
  'BLUE', 'GREY', 'GRAY', 'RED', 'BLACK', 'WHITE', 'SILVER', 'GREEN',
  'YELLOW', 'ORANGE', 'BROWN', 'GOLD', 'METALLIC'
]);

const MULTI_WORD_COLOR_PREFIXES = new Set(['GUN', 'DARK', 'LIGHT', 'PEARL']);

const getHeroColorWordCount = (words) => {
  if (words.length < 2 || !COLOR_SUFFIX_WORDS.has(words[words.length - 1])) {
    return 0;
  }

  const w2 = words[words.length - 2];

  if (words.length >= 3 && w2 === 'MET' && MULTI_WORD_COLOR_PREFIXES.has(words[words.length - 3])) {
    return 3;
  }

  return 2;
};

const extractHeroDescriptionLine = (text) => {
  const match = text.match(
    /^\d+\.\s+.+\s+PC\s+[A-Z0-9]+\s+[A-Z0-9]{17}[\s\S]*?\n([^\n]+)\s*\n(?:Sub Total|Taxable Value)/im
  );

  return match?.[1]?.trim() || null;
};

const extractHeroVariant = (text, model) => {
  const descriptionLine = extractHeroDescriptionLine(text);

  if (!descriptionLine || !model || !descriptionLine.startsWith(model)) {
    return null;
  }

  const remainder = descriptionLine.slice(model.length).trim();
  const words = remainder.split(/\s+/);

  if (!words.length) {
    return null;
  }

  let colorWordCount = getHeroColorWordCount(words);

  if (colorWordCount >= words.length) {
    return null;
  }

  return words.slice(0, words.length - colorWordCount).join(' ') || null;
};

const extractHeroCc = (model, rawCc) => {
  if (rawCc) {
    return rawCc;
  }

  if (!model) {
    return null;
  }

  const match = model.match(/(?:^|\s)(\d{2,3})(?:\s|$)/);
  return match?.[1] || null;
};

const isHeroOem = (oem) => HERO_OEMS.has(oem?.toUpperCase());

const isHondaOem = (oem) => oem?.toUpperCase() === 'HONDA';

const CLUBBED_VARIANT_OEMS = new Set(['BAJAJ', 'KTM', 'TRIUMPH']);

const isClubbedVariantOem = (oem) => CLUBBED_VARIANT_OEMS.has(oem?.toUpperCase());

const isChetakModel = (model, text) =>
  /\bCHETAK\b/i.test(model || '') || /chetak-india\.com|www\.chetak\.com/i.test(text || '');

// Chetak invoices club variant into the model with no engine CC
// e.g. "CHETAK C35 01" → model "CHETAK", variant "C3501"
const splitChetakModelVariant = (model) => {
  const normalized = normalizeModelName(model);

  if (!normalized) {
    return { model: null, variant: null };
  }

  const match = normalized.match(/^CHETAK(?:\s+(.+))?$/i);

  if (!match) {
    return { model: normalized, variant: null };
  }

  let variant = match[1]?.trim() || null;
  const compact = variant?.match(/^C(\d{2})\s+(\d{2})$/i);

  if (compact) {
    variant = `C${compact[1]}${compact[2]}`;
  }

  return {
    model: 'CHETAK',
    variant
  };
};

// Bajaj/KTM/Triumph invoices have no Variant field — it is clubbed into the model
// e.g. "PLATINA 100 ES DRUM" → model "PLATINA 100", variant "ES DRUM"
// e.g. "Duke 160 Pro" → model "Duke 160", variant "Pro"
// e.g. "SCRAMBLER 400XC" → model "SCRAMBLER", variant "400XC"
const splitClubbedModelVariant = (model) => {
  let normalized = normalizeModelName(model);

  if (!normalized) {
    return { model: null, variant: null, cc: null };
  }

  normalized = normalized.replace(/^(?:KTM|TRIUMPH|BAJAJ)\s+/i, '').trim();

  // Glued displacement+variant (400XC) — DB usually stores CC inside variant
  const glued = normalized.match(/^(.+?)\s+(\d{2,3})([A-Z][A-Z0-9\-]*)$/i);
  if (glued) {
    return {
      model: glued[1].trim(),
      variant: `${glued[2]}${glued[3]}`.trim(),
      cc: glued[2]
    };
  }

  const match = normalized.match(/^(.+?\s+(\d{2,3}))(?:\s+(.+))?$/);

  if (!match) {
    return { model: normalized, variant: null, cc: null };
  }

  return {
    model: match[1].trim(),
    variant: match[3]?.trim() || null,
    cc: match[2]
  };
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Honda Type/Variant often repeats the full commercial name.
 * e.g. model "SHINE 100 DX" + variant "SHINE 100 DX" → "SHINE 100" / "DX"
 * e.g. model "ACTIVA 125" + variant "ACTIVA 125 DISC" → "ACTIVA 125" / "DISC"
 * Also strip trailing colour / paint codes from Description-of-Goods variants.
 */
const splitHondaModelVariant = (model, variant) => {
  let normalizedModel = normalizeModelName(model);
  let normalizedVariant = normalizeModelName(variant);

  if (!normalizedModel) {
    return { model: null, variant: null, cc: null };
  }

  if (normalizedVariant) {
    normalizedVariant = normalizedVariant
      .replace(
        /\s+(?:MAT|PEARL|METALLIC|BLACK|GRAY|GREY|WHITE|RED|BLUE|SILVER|BROWN|GREEN|YELLOW|ORANGE|NHA\d+)\b.*$/i,
        ''
      )
      .trim();
  }

  if (normalizedVariant) {
    const prefixRe = new RegExp(`^${escapeRegExp(normalizedModel)}\\s*`, 'i');
    if (prefixRe.test(normalizedVariant)) {
      normalizedVariant = normalizedVariant.replace(prefixRe, '').trim() || null;
    }
  }

  // Full name was in both fields — split after displacement (keep CC with model)
  // e.g. "SHINE 100 DX" → model "SHINE 100", variant "DX"
  if (!normalizedVariant) {
    const match = normalizedModel.match(/^(.+?\s+(\d{2,3}))(?:\s+(.+))?$/);
    if (match) {
      return {
        model: match[1].trim(),
        variant: match[3]?.trim() || null,
        cc: match[2]
      };
    }

    return { model: normalizedModel, variant: null, cc: null };
  }

  const ccMatch = normalizedModel.match(/(?:^|\s)(\d{2,3})(?:\s|$)/);
  return {
    model: normalizedModel,
    variant: normalizedVariant,
    cc: ccMatch?.[1] || null
  };
};

const extractPincodeFromAddress = (address, existingPincode) => {
  if (existingPincode) {
    return existingPincode;
  }

  if (!address) {
    return null;
  }

  const match = String(address).match(/(?:^|[\s,])(\d{6})(?:\s*(?:INDIA)?)?\s*$/i);
  return match?.[1] || null;
};

const normalizeMobile = (value) => {
  if (!value) {
    return null;
  }

  const digits = String(value).replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
};

// Post-processors applied after raw template extraction
const enrichExtractedData = (text, oem, raw) => {
  const { customerName, relation } = extractCustomerIdentity(text, raw.customerName);
  const { firstName, lastName } = splitFirstLastName(customerName, relation);
  let model = normalizeModelName(raw.model);
  let variant = raw.variant;
  let ccSource = raw.cc;

  if (isHeroOem(oem)) {
    variant = extractHeroVariant(text, raw.model) || variant;
    ccSource = extractHeroCc(raw.model, null);
  } else if (isHondaOem(oem)) {
    const split = splitHondaModelVariant(model, variant);
    model = split.model;
    variant = split.variant;
    ccSource = ccSource || split.cc;
  } else if (isChetakModel(raw.model, text)) {
    const split = splitChetakModelVariant(raw.model);
    model = split.model;
    variant = variant || split.variant;
    ccSource = raw.cc;
  } else if (isClubbedVariantOem(oem)) {
    const split = splitClubbedModelVariant(raw.model);
    model = split.model;
    variant = variant || split.variant;
    ccSource = ccSource || split.cc;
  }

  const address = sanitizeAddress(raw.customerAddress);
  const pincode = extractPincodeFromAddress(address, raw.pincode);

  return {
    make: oem?.toUpperCase() || null,
    customerName,
    firstName,
    lastName,
    relation,
    customerAddress: address,
    customerMobile: normalizeMobile(raw.customerMobile),
    pincode,
    hypothecation: sanitizeHypothecation(raw.hypothecation),
    chassisNo: raw.chassisNo,
    engineNo: raw.engineNo,
    model,
    variant,
    exshowroom: raw.exshowroom,
    cc: normalizeCc(ccSource)
  };
};

/**
 * Infer vehicle make from invoice text / model when brand markers are present.
 * Returns null when inconclusive.
 * Prefer model/product signals over dealer-network wording (e.g. Bajaj Auto selling KTM).
 */
const detectInvoiceMake = (text = '', model = '') => {
  const haystack = `${model} ${text}`.toUpperCase();
  const hasKtmSignal =
    /\bKTM\b/.test(haystack) || /KHIVRAJKTM/.test(haystack) || /\bDUKE\b/.test(haystack);

  if (/\bTRIUMPH\b/.test(haystack) || /\bSCRAMBLER\b/.test(haystack) || /\bTHRUXTON\b/.test(haystack)) {
    return 'TRIUMPH';
  }
  if (/\bHONDA\b/.test(haystack) || /\bACTIVA\b/.test(haystack)) {
    return 'HONDA';
  }
  if (/\bHERO\b/.test(haystack) || /\bSPLENDOR\b/.test(haystack) || /\bDESTINI\b/.test(haystack)) {
    return 'HERO';
  }
  if (/\bTVS\b/.test(haystack) || /\bAPACHE\b/.test(haystack) || /\bJUPITER\b/.test(haystack)) {
    return 'TVS';
  }
  if (
    /\bCHETAK\b/.test(haystack) ||
    /\bPULSAR\b/.test(haystack) ||
    /\bPLATINA\b/.test(haystack) ||
    /\bDOMINAR\b/.test(haystack) ||
    /\bAVENGER\b/.test(haystack)
  ) {
    return 'BAJAJ';
  }
  if (hasKtmSignal) {
    return 'KTM';
  }

  return null;
};

const MAKE_MISMATCH_MSG =
  'The Invoice Uploaded is of other Manufacturer. Please select MAKE according to the Invoice';

export const isMakeMismatch = (requestedMake, text, model) => {
  const requested = String(requestedMake || '').toUpperCase();
  const extractedMake = detectInvoiceMake(text, model);
  if (!requested || !extractedMake) return false;
  return requested !== extractedMake;
};

const dataExtractor = async (text, oem, dealerCode) => {
  const templates = getTemplates(oem);
  const raw = extractFromTemplates(text, templates);
  return enrichExtractedData(text, oem, raw);
};

export { MAKE_MISMATCH_MSG };
export default dataExtractor;
