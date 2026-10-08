import { Sequelize } from 'sequelize';
import { dbConnection } from '../index.js';
import getInsurerMake from './getInsurerMake.js';
import { VARIANT_IN_MODEL_INSURERS } from '../utils/constants.js';
import { normalizeModelName, splitInvoiceModelVariant } from './normalizeModelName.js';

const normalizeText = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const levenshteinDistance = (a, b) => {
  if (a === b) {
    return 0;
  }

  if (!a.length) {
    return b.length;
  }

  if (!b.length) {
    return a.length;
  }

  const rows = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost
      );
    }
  }

  return rows[a.length][b.length];
};

const getKeywords = (value) => {
  const normalized = normalizeModelName(String(value || '')).toUpperCase();
  const versionKeywords = (normalized.match(/\d+\.\d+/g) || []).map((token) =>
    token.replace('.', '')
  );
  // Keep codes like I3S / OBD2B whole. Trailing displacement (ACTIVA125) still splits.
  const shields = [];
  const shielded = normalized.replace(/\b([A-Z]+\d+[A-Z][A-Z0-9]*)\b/g, (token) => {
    const mark = `SHIELD${String.fromCharCode(65 + shields.length)}`;
    shields.push(token);
    return mark;
  });
  const wordKeywords = shielded
    .replace(/\d+\.\d+/g, ' ')
    .replace(/([A-Z]+)(\d+)/g, '$1 $2')
    .replace(/(\d+)([A-Z]+)/g, '$1 $2')
    .split(/[^A-Z0-9]+/)
    .filter((keyword) => keyword.length > 1)
    .map((keyword) => {
      const shield = keyword.match(/^SHIELD([A-Z])$/);
      return shield ? shields[shield[1].charCodeAt(0) - 65] : keyword;
    });

  return [...new Set([...wordKeywords, ...versionKeywords])];
};

const getVariantKeywords = getKeywords;

/** Dealer invoice codes that insurers store under a different word. */
const VARIANT_SYNONYMS = {
  CAST: 'ALLOY',
  SS: 'SELF'
};

const EMISSION_VARIANT_TOKENS = new Set([
  'BS', 'VI', 'IV', 'III', 'OBD', 'BSVI', 'BSIV', 'BS6'
]);

const canonicalVariantToken = (token) => {
  const key = String(token || '').toUpperCase();
  return VARIANT_SYNONYMS[key] || key;
};

const variantTokensMatch = (invoiceToken, dbToken) => {
  const invoiceKey = canonicalVariantToken(invoiceToken);
  const dbKey = canonicalVariantToken(dbToken);

  if (invoiceKey === dbKey) {
    return true;
  }

  // Prefer DB tokens that contain the full invoice token (not the reverse),
  // so "400" alone does not fully satisfy invoice "400XC".
  return invoiceKey.length > 1 && dbKey.includes(invoiceKey);
};

const expandVariantSearchKeywords = (keywords) => {
  const expanded = [...keywords];

  for (const keyword of keywords) {
    const canonical = VARIANT_SYNONYMS[String(keyword).toUpperCase()];
    if (canonical) {
      expanded.push(canonical);
    }
  }

  return [...new Set(expanded)];
};

const isIgnorableVariantToken = (keyword) => {
  const key = String(keyword || '').toUpperCase();

  if (COLOR_ONLY_VARIANT_TOKENS.has(key) || EMISSION_VARIANT_TOKENS.has(key)) {
    return true;
  }

  return /^\d{2,4}$/.test(key);
};

const MIN_MODEL_MATCH_SCORE = 0.55;
const MIN_VARIANT_MATCH_SCORE = 0.55;

const COLOR_ONLY_VARIANT_TOKENS = new Set([
  'EBONY',
  'ORANGE',
  'ORG',
  'BLACK',
  'WHITE',
  'RED',
  'BLUE',
  'GREY',
  'GRAY',
  'SILVER',
  'GREEN',
  'YELLOW',
  'METALLIC',
  'METALIC',
  'GLOSS',
  'MATTE',
  'MAT',
  'PEARL'
]);

const getAlphaModelName = (model) => {
  const alpha = getKeywords(model).filter((keyword) => /^[A-Z]+$/.test(keyword));
  return alpha.join(' ').trim();
};

const getModelSearchKeywords = (model) => ({
  alpha: getKeywords(model).filter((keyword) => /^[A-Z]+$/.test(keyword))
});

const getVariantScore = (invoiceVariant, dbVariant, invoiceModel = null) => {
  const invoice = normalizeText(invoiceVariant);
  const candidate = normalizeText(dbVariant);

  if (!invoice || !candidate) {
    return 0;
  }

  const scores = [];

  if (invoice === candidate) {
    scores.push(1);
  }

  const invoiceKeywords = getVariantKeywords(invoiceVariant);
  const candidateKeywords = getVariantKeywords(dbVariant);

  if (invoiceKeywords.length && candidateKeywords.length) {
    const matchedCount = invoiceKeywords.filter((keyword) =>
      candidateKeywords.some((candidateKeyword) => variantTokensMatch(keyword, candidateKeyword))
    ).length;

    if (matchedCount > 0) {
      scores.push(0.5 + (0.5 * (matchedCount / invoiceKeywords.length)));
    }
  }

  if (invoice.startsWith(candidate) && candidate.length >= 4) {
    scores.push(0.92);
  }

  if (invoice.includes(candidate) || candidate.includes(invoice)) {
    scores.push(
      0.9 * (Math.min(invoice.length, candidate.length) / Math.max(invoice.length, candidate.length))
    );
  }

  const distance = levenshteinDistance(invoice, candidate);
  scores.push(1 - distance / Math.max(invoice.length, candidate.length));

  let score = Math.max(...scores, 0);

  // Pure CC overlap (e.g. "250 EBONY" vs "ADV 250") is not a real variant match
  const matchedMeaningful = invoiceKeywords.filter((keyword) => {
    if (/^\d{2,4}$/.test(keyword)) {
      return false;
    }
    return candidateKeywords.some((candidateKeyword) =>
      variantTokensMatch(keyword, candidateKeyword)
    );
  });

  if (!matchedMeaningful.length) {
    score = Math.min(score, 0.35);
  }

  // Penalize extra feature tokens in the DB variant (I3S, DRUM, ADV) not present on the invoice.
  // Emission tags (BS VI, OBD) and colours are ignored.
  const invoiceCanon = new Set(invoiceKeywords.map((keyword) => canonicalVariantToken(keyword)));
  // Some catalogs keep the family on the variant ("VIDA" / "VX2 PLUS")
  // while the invoice keeps it on the model ("VIDA VX2" / "PLUS").
  const modelCanon = new Set(
    getKeywords(invoiceModel).map((keyword) => canonicalVariantToken(keyword))
  );
  const coveredByInvoice = (canon) =>
    [...invoiceCanon, ...modelCanon].some(
      (inv) => inv.length > 1 && (canon === inv || canon.includes(inv))
    );
  const extraDbAlpha = candidateKeywords.filter((keyword) => {
    if (keyword.length <= 1 || isIgnorableVariantToken(keyword)) {
      return false;
    }

    return !coveredByInvoice(canonicalVariantToken(keyword));
  });

  if (extraDbAlpha.length) {
    score = Math.min(score, 0.4);
  }

  return score;
};

const parseAmount = (value) => {
  if (value == null || value === '') {
    return null;
  }

  const amount = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : null;
};

const getCcDigits = (cc) => {
  const match = String(cc || '').match(/\d{2,4}/);
  return match ? match[0] : null;
};

const getModelDigitsFromName = (model) => {
  const match = String(model || '').match(/(\d{2,4})/);
  return match ? match[1] : null;
};

const getInvoiceCcDigits = (model, cc) =>
  getCcDigits(cc) || getModelDigitsFromName(model);

const rowHasCc = (row, cc) => {
  const digits = getCcDigits(cc);

  if (!digits) {
    return false;
  }

  const haystack = normalizeText(
    `${row.variant || ''} ${row.model || ''} ${row.cc || ''} ${row.cubic_capacity || ''}`
  );

  return haystack.includes(digits);
};

const getModelScore = (invoiceModel, dbModel, dbCc = null, invoiceCc = null, dbVariant = null) => {
  const invoiceAlpha = getAlphaModelName(invoiceModel);
  const candidateAlpha = getAlphaModelName(dbModel);
  const invoice = normalizeText(invoiceAlpha);
  const candidate = normalizeText(candidateAlpha);

  if (!invoice || !candidate) {
    return 0;
  }

  const scores = [];

  if (invoice === candidate) {
    scores.push(1);
  }

  const invoiceKeywords = getKeywords(invoiceAlpha);
  const candidateKeywords = getKeywords(candidateAlpha);

  if (invoiceKeywords.length && candidateKeywords.length) {
    const matchedCount = invoiceKeywords.filter((keyword) =>
      candidateKeywords.some((candidateKeyword) =>
        candidateKeyword.includes(keyword) || keyword.includes(candidateKeyword)
      )
    ).length;

    if (matchedCount > 0) {
      scores.push(0.5 + (0.5 * (matchedCount / invoiceKeywords.length)));
    }
  }

  if (invoice.includes(candidate) || candidate.includes(invoice)) {
    scores.push(
      0.9 * (Math.min(invoice.length, candidate.length) / Math.max(invoice.length, candidate.length))
    );
  }

  const distance = levenshteinDistance(invoice, candidate);
  scores.push(1 - distance / Math.max(invoice.length, candidate.length));

  let score = Math.max(...scores, 0);
  const { alpha } = getModelSearchKeywords(invoiceModel);
  const primaryAlpha = alpha[0] ? normalizeText(alpha[0]) : null;

  if (primaryAlpha && !candidate.includes(primaryAlpha)) {
    return 0;
  }

  if (invoiceCc) {
    const ccHaystack = normalizeText(`${dbModel} ${dbVariant || ''} ${dbCc || ''}`);

    if (!ccHaystack.includes(invoiceCc)) {
      score = Math.min(score, 0.4);
    }
  }

  const dbAlpha = getKeywords(candidateAlpha).filter((keyword) => /^[A-Z]+$/.test(keyword));
  const extraDbTokens = dbAlpha.filter(
    (token) => !alpha.some((invoiceToken) =>
      token === invoiceToken || token.includes(invoiceToken) || invoiceToken.includes(token)
    )
  );

  if (alpha.length && extraDbTokens.length) {
    const invoiceNorm = normalizeText(invoiceModel);
    const dbNorm = normalizeText(dbModel);

    if (!dbNorm.startsWith(invoiceNorm)) {
      score = Math.min(score, 0.4);
    }
  }

  // Prefer rows whose model name carries the invoice displacement (DUKE 250 UG)
  // over sibling lines like DUKE + ADV 250.
  const invoiceDigits = getModelDigitsFromName(invoiceModel);
  if (invoiceDigits) {
    const modelHasDigits = normalizeText(dbModel).includes(invoiceDigits);
    const variantNorm = normalizeText(dbVariant);
    const variantLooksLikeOtherFamily =
      variantNorm.includes('ADV') && !normalizeText(invoiceModel).includes('ADV');

    if (!modelHasDigits && variantLooksLikeOtherFamily) {
      score = Math.min(score, 0.4);
    } else if (modelHasDigits) {
      score = Math.max(score, Math.min(1, score + 0.15));
    }
  }

  return score;
};

const enrichVariantWithCc = (variant, ccDigits) => {
  if (!variant || !ccDigits) {
    return variant;
  }

  if (normalizeText(variant).includes(ccDigits)) {
    return variant;
  }

  return `${ccDigits} ${variant}`.trim();
};

const isStandardVariant = (variant) => {
  const normalized = normalizeText(variant);
  return normalized === 'STD' || normalized === 'STANDARD' || normalized === '';
};

/** Colour / empty variants should not drive variant matching (e.g. EBONY → ADV 250). */
const isNonDistinctiveVariant = (variant, ccDigits = null) => {
  if (!variant || isStandardVariant(variant)) {
    return true;
  }

  const keywords = getVariantKeywords(variant).filter((keyword) => {
    if (/^\d{2,4}$/.test(keyword) && (!ccDigits || keyword === String(ccDigits))) {
      return false;
    }
    return true;
  });

  if (!keywords.length) {
    return true;
  }

  return keywords.every((keyword) => COLOR_ONLY_VARIANT_TOKENS.has(keyword));
};

const getCcFilteredModels = (models, cc) => {
  if (!cc) {
    return models;
  }

  const ccMatchedModels = models.filter((row) => rowHasCc(row, cc));
  return ccMatchedModels.length ? ccMatchedModels : models;
};

const filterByModelScore = (models, invoiceModel, invoiceCc = null, minScore = MIN_MODEL_MATCH_SCORE) => {
  if (!invoiceModel || !models.length) {
    return models;
  }

  const filtered = models.filter(
    (row) => getModelScore(invoiceModel, row.model, row.cc, invoiceCc, row.variant) >= minScore
  );

  return filtered.length ? filtered : [];
};

const takeTopMatches = (ranked, limit = 3) => ranked.slice(0, limit);

const pickClosestByDefaultIdv = (matches, exshowroom, cc) => {
  if (!matches.length) {
    return null;
  }

  const exshowroomAmount = parseAmount(exshowroom);
  const targetIdv = exshowroomAmount != null ? exshowroomAmount * 0.95 : null;

  if (!Number.isFinite(targetIdv)) {
    return matches[0];
  }

  let best = null;
  let bestDiff = Infinity;

  for (const current of matches) {
    const currentIdv = parseAmount(current.default_idv);

    if (!Number.isFinite(currentIdv) || currentIdv <= 0) {
      continue;
    }

    const idvDiff = Math.abs(currentIdv - targetIdv);
    const hasCc = cc ? rowHasCc(current, cc) : false;

    current.idvDiff = idvDiff;
    current.targetIdv = targetIdv;

    if (!best || idvDiff < bestDiff) {
      best = current;
      bestDiff = idvDiff;
      continue;
    }

    if (idvDiff === bestDiff && cc) {
      const bestHasCc = rowHasCc(best, cc);
      if (hasCc && !bestHasCc) {
        best = current;
        bestDiff = idvDiff;
      }
    }
  }

  return best || matches[0];
};

const getMatchKey = (row) => `${row?.model}|${row?.variant}|${row?.default_idv}`;

const moveClosestFirst = (matches, selected) => {
  if (!selected || !matches.length) {
    return matches;
  }

  const selectedKey = getMatchKey(selected);
  const rest = matches.filter((row) => getMatchKey(row) !== selectedKey);
  const selectedRow = matches.find((row) => getMatchKey(row) === selectedKey) || selected;

  return [selectedRow, ...rest];
};

const findClosestByModel = (models, invoiceModel, cc) => {
  if (!models.length) {
    return [];
  }

  const invoiceCcDigits = getInvoiceCcDigits(invoiceModel, cc);
  let candidates = getCcFilteredModels(models, invoiceCcDigits);
  candidates = filterByModelScore(candidates, invoiceModel, invoiceCcDigits);

  if (!candidates.length) {
    return [];
  }

  const ranked = [];

  for (const current of candidates) {
    const score = invoiceModel
      ? getModelScore(invoiceModel, current.model, current.cc, invoiceCcDigits, current.variant)
      : 0;
    ranked.push({ ...current, matchScore: score, matchBy: 'model' });
  }

  ranked.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }

    const invoiceDigits = getModelDigitsFromName(invoiceModel);
    if (invoiceDigits) {
      const aHas = normalizeText(a.model).includes(invoiceDigits) ? 1 : 0;
      const bHas = normalizeText(b.model).includes(invoiceDigits) ? 1 : 0;
      if (bHas !== aHas) {
        return bHas - aHas;
      }
    }

    return 0;
  });
  return takeTopMatches(ranked);
};

const findClosestVariant = (models, invoiceVariant, invoiceModel, cc, variantInModel = false) => {
  if (!models.length) {
    return [];
  }

  const invoiceCcDigits = getInvoiceCcDigits(invoiceModel, cc);
  let candidates = getCcFilteredModels(models, invoiceCcDigits);
  candidates = filterByModelScore(candidates, invoiceModel, invoiceCcDigits);

  if (!candidates.length) {
    return [];
  }

  const ranked = [];

  for (const current of candidates) {
    const dbVariantValue = variantInModel ? current.model : current.variant;
    const score = invoiceVariant ? getVariantScore(invoiceVariant, dbVariantValue, invoiceModel) : 0;
    ranked.push({ ...current, matchScore: score, matchBy: 'variant' });
  }

  const invoiceNorm = normalizeText(invoiceVariant);
  ranked.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }

    const aVariant = variantInModel ? a.model : a.variant;
    const bVariant = variantInModel ? b.model : b.variant;
    const aExact = normalizeText(aVariant) === invoiceNorm ? 1 : 0;
    const bExact = normalizeText(bVariant) === invoiceNorm ? 1 : 0;

    if (bExact !== aExact) {
      return bExact - aExact;
    }

    return String(bVariant || '').length - String(aVariant || '').length;
  });

  return takeTopMatches(ranked);
};

const fetchModels = async (
  tableName,
  oem,
  model,
  variantKeywords,
  ccDigits,
  applyVariantFilter,
  useModelKeywordSearch = false,
  variantInModel = false
) => {
  const replacements = { oem };
  let sql = `SELECT * FROM ${tableName} WHERE make = :oem`;
  const modelClauses = [];
  const modelSearchName = getAlphaModelName(model) || model;

  if (useModelKeywordSearch) {
    const { alpha } = getModelSearchKeywords(model);

    alpha.forEach((keyword, index) => {
      replacements[`mka${index}`] = `%${keyword}%`;
      modelClauses.push(`model LIKE :mka${index}`);
    });

    if (!modelClauses.length) {
      replacements.model = `%${modelSearchName}%`;
      modelClauses.push('model LIKE :model');
    }
  } else {
    replacements.model = `%${modelSearchName}%`;
    modelClauses.push('model LIKE :model');
  }

  sql += ` AND (${useModelKeywordSearch ? modelClauses.join(' AND ') : modelClauses.join(' OR ')})`;

  const searchClauses = [];

  if (applyVariantFilter && variantKeywords.length >= 1) {
    variantKeywords.forEach((keyword, index) => {
      replacements[`kw${index}`] = `%${keyword}%`;
      searchClauses.push(`${variantInModel ? 'model' : 'variant'} LIKE :kw${index}`);
    });
  }

  if (ccDigits) {
    replacements.cc = `%${ccDigits}%`;
    searchClauses.push('model LIKE :cc');
    searchClauses.push('variant LIKE :cc');
    searchClauses.push('cc LIKE :cc');
  }

  if (searchClauses.length) {
    sql += ` AND (${searchClauses.join(' OR ')})`;
  }

  return (await dbConnection.query(sql, {
    replacements,
    type: Sequelize.QueryTypes.SELECT
  })) || [];
};

/**
 * Invoice model "VIDA VX2" is stored by some insurers as model "VIDA"
 * and variant "VX2 PLUS". Search the leading token on model and the
 * remaining family tokens on variant, together with the invoice variant.
 */
const fetchModelsWithFamilyOnVariant = async (
  tableName,
  oem,
  model,
  variantKeywords
) => {
  const alpha = getModelSearchKeywords(model).alpha;

  if (alpha.length < 2) {
    return [];
  }

  const replacements = { oem };
  let sql = `SELECT * FROM ${tableName} WHERE make = :oem`;

  replacements.familyModel = `%${alpha[0]}%`;
  sql += ' AND model LIKE :familyModel';

  [...alpha.slice(1), ...variantKeywords].forEach((keyword, index) => {
    replacements[`familyVariant${index}`] = `%${keyword}%`;
    sql += ` AND variant LIKE :familyVariant${index}`;
  });

  return (await dbConnection.query(sql, {
    replacements,
    type: Sequelize.QueryTypes.SELECT
  })) || [];
};

const fetchModelsWithFallback = async (
  tableName,
  oem,
  model,
  variantKeywords,
  ccDigits,
  applyVariantFilter,
  variantInModel = false
) => {
  let models = await fetchModels(
    tableName,
    oem,
    model,
    variantKeywords,
    ccDigits,
    applyVariantFilter,
    false,
    variantInModel
  );

  if (models.length) {
    return { models, usedModelKeywordFallback: false };
  }

  models = await fetchModels(
    tableName,
    oem,
    model,
    variantKeywords,
    ccDigits,
    applyVariantFilter,
    true,
    variantInModel
  );

  if (models.length || variantInModel || !applyVariantFilter) {
    return {
      models,
      usedModelKeywordFallback: models.length > 0
    };
  }

  models = await fetchModelsWithFamilyOnVariant(
    tableName,
    oem,
    model,
    variantKeywords
  );

  return {
    models,
    usedModelKeywordFallback: models.length > 0
  };
};

const attachIdvDiff = (matches, targetIdv) =>
  matches.map((row) => {
    const currentIdv = parseAmount(row.default_idv);
    const idvDiff = Number.isFinite(currentIdv) && Number.isFinite(targetIdv)
      ? Math.abs(currentIdv - targetIdv)
      : null;

    return {
      ...row,
      idvDiff,
      targetIdv
    };
  });

const hasVariantMatch = (matches) =>
  matches.length > 0 && (matches[0].matchScore ?? 0) >= MIN_VARIANT_MATCH_SCORE;

// 0.4 is a real trim match with an extra catalog token (for example ZX plus DSSC).
// 0.35 is CC-only overlap and should fall back to model matching.
const hasPartialVariantMatch = (matches) =>
  matches.length > 0 && (matches[0].matchScore ?? 0) > 0.35;

const hasUsableMatch = (matches) =>
  matches.length > 0 && (matches[0].matchScore ?? 0) >= MIN_MODEL_MATCH_SCORE;

/**
 * Normalize payload `models` into the row shape used by scoring.
 * When present, matching is restricted to this list only (no insurer DB fetch).
 */
const normalizeAllowedModels = (models) => {
  if (!Array.isArray(models) || !models.length) {
    return null;
  }

  return models
    .map((row) => {
      if (!row || typeof row !== 'object') {
        return null;
      }

      const model = row.model != null ? String(row.model).trim() : '';
      if (!model) {
        return null;
      }

      return {
        ...row,
        id: row.id ?? null,
        vehicle_code: row.id ?? row.vehicle_code ?? null,
        model,
        variant: row.variant != null ? String(row.variant).trim() : null,
        cc: row.cc != null ? String(row.cc) : null,
        default_idv: row.default_idv ?? row.exShowroomPrice ?? null,
        exShowroomPrice: row.exShowroomPrice ?? null
      };
    })
    .filter(Boolean);
};

export const getModelVariant = async (
  oem,
  model,
  variant,
  insurer,
  isIdvRangeRequired,
  exshowroom,
  cc,
  allowedModels = null
) => {
  try {
    model = normalizeModelName(model);
    const { baseModel, combinedVariant } = splitInvoiceModelVariant(model, variant);
    model = baseModel;
    variant = combinedVariant;
    const insurerKey = String(insurer || '').toLowerCase().trim();
    const tableName = `${insurer}_models${insurer === 'national' ? '_NF' : ''}`;
    const insurerMake = getInsurerMake(oem, insurer);
    const variantInModel = VARIANT_IN_MODEL_INSURERS.includes(insurerKey);
    const ccDigits = getInvoiceCcDigits(model, cc);
    // Colour-only / STD variants must not be CC-enriched into fake variant matches
    let useModelMatch = isNonDistinctiveVariant(variant, ccDigits);
    if (!useModelMatch) {
      variant = enrichVariantWithCc(variant, ccDigits);
    }
    const variantKeywords = useModelMatch
      ? []
      : expandVariantSearchKeywords(getVariantKeywords(variant));

    const payloadModels = normalizeAllowedModels(allowedModels);
    let models = [];
    let usedModelKeywordFallback = false;

    if (payloadModels) {
      // Restrict selection to payload models only
      models = payloadModels;
    } else {
      ({ models, usedModelKeywordFallback } = await fetchModelsWithFallback(
        tableName,
        insurerMake,
        model,
        variantKeywords,
        ccDigits,
        !useModelMatch,
        variantInModel
      ));
    }

    const exshowroomAmount = parseAmount(exshowroom);
    const targetIdv = exshowroomAmount != null ? exshowroomAmount * 0.95 : null;

    let topMatches = useModelMatch
      ? findClosestByModel(models, model, cc)
      : findClosestVariant(models, variant, model, cc, variantInModel);

    let usedModelMatchFallback = false;

    if (!useModelMatch && !hasVariantMatch(topMatches) && !hasPartialVariantMatch(topMatches)) {
      useModelMatch = true;
      usedModelMatchFallback = true;

      if (!payloadModels) {
        ({ models, usedModelKeywordFallback } = await fetchModelsWithFallback(
          tableName,
          insurerMake,
          model,
          variantKeywords,
          ccDigits,
          false,
          variantInModel
        ));
      }

      topMatches = findClosestByModel(models, model, cc);
    }

    if (useModelMatch && !hasUsableMatch(topMatches)) {
      topMatches = [];
    }

    topMatches = attachIdvDiff(topMatches, targetIdv);

    let closestModel = null;
    let selectionReason = null;
    const matchLabel = useModelMatch ? 'model' : 'variant';
    const sourceLabel = payloadModels ? 'payload models' : matchLabel;
    const minMatchScore = useModelMatch ? MIN_MODEL_MATCH_SCORE : MIN_VARIANT_MATCH_SCORE;
    const bestScore = topMatches[0]?.matchScore ?? 0;
    const bestTier = topMatches.filter((row) => Math.abs((row.matchScore ?? 0) - bestScore) < 0.001);
    const qualifiedMatches = bestTier.filter((row) => (row.matchScore ?? 0) >= minMatchScore);
    const idvCandidates = qualifiedMatches.length ? qualifiedMatches : bestTier;

    if (isIdvRangeRequired) {
      closestModel = pickClosestByDefaultIdv(idvCandidates, exshowroom, cc);
      selectionReason = Number.isFinite(targetIdv)
        ? usedModelMatchFallback
          ? `No variant match found; selected from top ${idvCandidates.length} model matches because isIdvRangeRequired=true and default_idv (${closestModel?.default_idv}) is closest to targetIdv (${targetIdv})`
          : usedModelKeywordFallback
            ? `No full model-name match found; selected from top ${idvCandidates.length} model keyword matches because isIdvRangeRequired=true and default_idv (${closestModel?.default_idv}) is closest to targetIdv (${targetIdv})`
            : `Selected from top ${idvCandidates.length} ${sourceLabel} matches because isIdvRangeRequired=true and default_idv (${closestModel?.default_idv}) is closest to targetIdv (${targetIdv})`
        : `Selected from top ${idvCandidates.length} ${sourceLabel} matches because isIdvRangeRequired=true (targetIdv unavailable, first match used)`;

      topMatches = moveClosestFirst(topMatches, closestModel).map((row) => ({
        ...row,
        matchBy: `${matchLabel}+idv`
      }));
    } else if (topMatches[0]) {
      closestModel = topMatches[0];
      selectionReason = usedModelMatchFallback
        ? `No variant match found; selected as best model-name match (matchScore=${closestModel.matchScore})`
        : usedModelKeywordFallback
          ? `No full model-name match found; selected using individual model keywords (matchScore=${closestModel.matchScore})`
          : useModelMatch
            ? `Selected as best model-name match (matchScore=${closestModel.matchScore})`
            : `Selected as best variant-name match (matchScore=${closestModel.matchScore})`;

      if (payloadModels) {
        selectionReason = `${selectionReason} [from payload models]`;
      }
    }

    if (closestModel) {
      closestModel = {
        ...topMatches[0],
        selectionReason
      };
    }

    const formattedTopMatches = topMatches.map((row, index) => ({
      ...row,
      rank: index + 1,
      id: row.id ?? row.vehicle_code ?? null,
      model: row.model ?? null,
      variant: row.variant ?? null,
      default_idv: row.default_idv ?? null,
      cc: row.cc ?? null,
      matchScore: row.matchScore ?? null,
      idvDiff: row.idvDiff ?? null,
      targetIdv: row.targetIdv ?? targetIdv,
      matchBy: row.matchBy ?? null
    }));

    console.log({
      oem,
      insurerMake,
      variantInModel,
      invoiceVariant: variant,
      useModelMatch,
      usedModelMatchFallback,
      usedModelKeywordFallback,
      usedPayloadModels: Boolean(payloadModels),
      payloadModelCount: payloadModels?.length || 0,
      cc,
      variantKeywords,
      modelKeywords: getModelSearchKeywords(model).alpha,
      isIdvRangeRequired,
      targetIdv,
      closestModel: closestModel
        ? {
            id: closestModel.id ?? closestModel.vehicle_code ?? null,
            model: closestModel.model,
            variant: closestModel.variant,
            default_idv: closestModel.default_idv,
            cc: closestModel.cc,
            matchScore: closestModel.matchScore,
            idvDiff: closestModel.idvDiff ?? null,
            selectionReason: closestModel.selectionReason
          }
        : null,
      topMatches: formattedTopMatches.map((row) => ({
        rank: row.rank,
        id: row.id,
        model: row.model,
        variant: row.variant,
        default_idv: row.default_idv,
        cc: row.cc,
        matchScore: row.matchScore,
        idvDiff: row.idvDiff,
        targetIdv: row.targetIdv,
        matchBy: row.matchBy
      }))
    });

    return {
      closestModel,
      topMatches: formattedTopMatches
    };
  } catch (err) {
    console.log({ err });
    throw Error(err);
  }
};
