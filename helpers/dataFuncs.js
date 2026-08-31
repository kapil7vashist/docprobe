import { Sequelize } from 'sequelize';
import { dbConnection } from '../index.js';

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

const getKeywords = (value) =>
  String(value || '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((keyword) => keyword.length > 1);

const getVariantKeywords = getKeywords;

const MIN_MODEL_MATCH_SCORE = 0.55;

const getModelDigitsFromName = (model) => {
  const match = String(model || '').match(/(\d{2,4})/);
  return match ? match[1] : null;
};

const getModelSearchKeywords = (model) => {
  const keywords = getKeywords(model);
  const alpha = keywords.filter((keyword) => /^[A-Z]+$/.test(keyword));
  const digits = [...new Set(
    keywords.flatMap((keyword) => {
      const match = keyword.match(/(\d{2,4})/);
      return match ? [match[1]] : [];
    })
  )];

  return { alpha, digits };
};

const getVariantScore = (invoiceVariant, dbVariant) => {
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

  return Math.max(...scores);
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

const getModelScore = (invoiceModel, dbModel) => {
  const invoice = normalizeText(invoiceModel);
  const candidate = normalizeText(dbModel);

  if (!invoice || !candidate) {
    return 0;
  }

  const scores = [];

  if (invoice === candidate) {
    scores.push(1);
  }

  const invoiceKeywords = getKeywords(invoiceModel);
  const candidateKeywords = getKeywords(dbModel);

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
  const { alpha, digits } = getModelSearchKeywords(invoiceModel);
  const primaryAlpha = alpha[0] ? normalizeText(alpha[0]) : null;

  if (primaryAlpha && !candidate.includes(primaryAlpha)) {
    return 0;
  }

  const invoiceCc = digits[0] || getModelDigitsFromName(invoiceModel);

  if (invoiceCc && !candidate.includes(invoiceCc)) {
    score = Math.min(score, 0.4);
  }

  return score;
};

const isStandardVariant = (variant) => {
  const normalized = normalizeText(variant);
  return normalized === 'STD' || normalized === 'STANDARD';
};

const getCcFilteredModels = (models, cc) => {
  if (!cc) {
    return models;
  }

  const ccMatchedModels = models.filter((row) => rowHasCc(row, cc));
  return ccMatchedModels.length ? ccMatchedModels : models;
};

const filterByModelScore = (models, invoiceModel, minScore = MIN_MODEL_MATCH_SCORE) => {
  if (!invoiceModel || !models.length) {
    return models;
  }

  const filtered = models.filter(
    (row) => getModelScore(invoiceModel, row.model) >= minScore
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

  let candidates = getCcFilteredModels(models, cc);
  candidates = filterByModelScore(candidates, invoiceModel);

  if (!candidates.length) {
    return [];
  }

  const ranked = [];

  for (const current of candidates) {
    const score = invoiceModel ? getModelScore(invoiceModel, current.model) : 0;
    ranked.push({ ...current, matchScore: score, matchBy: 'model' });
  }

  ranked.sort((a, b) => b.matchScore - a.matchScore);
  return takeTopMatches(ranked);
};

const findClosestVariant = (models, invoiceVariant, invoiceModel, cc) => {
  if (!models.length) {
    return [];
  }

  let candidates = getCcFilteredModels(models, cc);
  candidates = filterByModelScore(candidates, invoiceModel);

  if (!candidates.length) {
    return [];
  }

  const ranked = [];

  for (const current of candidates) {
    const score = invoiceVariant ? getVariantScore(invoiceVariant, current.variant) : 0;
    ranked.push({ ...current, matchScore: score, matchBy: 'variant' });
  }

  ranked.sort((a, b) => b.matchScore - a.matchScore);
  return takeTopMatches(ranked);
};

const fetchModels = async (
  tableName,
  oem,
  model,
  variantKeywords,
  ccDigits,
  applyVariantFilter,
  useModelKeywordSearch = false
) => {
  const replacements = { oem };
  let sql = `SELECT * FROM ${tableName} WHERE make = :oem`;
  const modelClauses = [];

  if (useModelKeywordSearch) {
    const { alpha, digits } = getModelSearchKeywords(model);

    alpha.forEach((keyword, index) => {
      replacements[`mka${index}`] = `%${keyword}%`;
      modelClauses.push(`model LIKE :mka${index}`);
    });

    digits.forEach((digit, index) => {
      replacements[`mkd${index}`] = `%${digit}%`;
      modelClauses.push(`model LIKE :mkd${index}`);
    });

    if (!modelClauses.length) {
      replacements.model = `%${model}%`;
      modelClauses.push('model LIKE :model');
    }
  } else {
    replacements.model = `%${model}%`;
    modelClauses.push('model LIKE :model');
  }

  sql += ` AND (${useModelKeywordSearch ? modelClauses.join(' AND ') : modelClauses.join(' OR ')})`;

  const searchClauses = [];

  if (applyVariantFilter && variantKeywords.length > 1) {
    variantKeywords.forEach((keyword, index) => {
      replacements[`kw${index}`] = `%${keyword}%`;
      searchClauses.push(`variant LIKE :kw${index}`);
    });
  }

  if (ccDigits) {
    replacements.cc = `%${ccDigits}%`;
    searchClauses.push('variant LIKE :cc');
    searchClauses.push('model LIKE :cc');
  }

  if (searchClauses.length) {
    sql += ` AND (${searchClauses.join(' OR ')})`;
  }

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
  applyVariantFilter
) => {
  let models = await fetchModels(
    tableName,
    oem,
    model,
    variantKeywords,
    ccDigits,
    applyVariantFilter,
    false
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
    true
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
  matches.length > 0 && (matches[0].matchScore ?? 0) > 0;

const hasUsableMatch = (matches) =>
  matches.length > 0 && (matches[0].matchScore ?? 0) >= MIN_MODEL_MATCH_SCORE;

export const getModelVariant = async (oem, model, variant, insurer, isIdvRangeRequired, exshowroom, cc) => {
  try {
    const tableName = `${insurer}_models${insurer === 'national' ? '_NF' : ''}`;
    let useModelMatch = isStandardVariant(variant);
    const variantKeywords = useModelMatch ? [] : getVariantKeywords(variant);
    const ccDigits = getCcDigits(cc);

    let { models, usedModelKeywordFallback } = await fetchModelsWithFallback(
      tableName,
      oem,
      model,
      variantKeywords,
      ccDigits,
      !useModelMatch
    );

    const exshowroomAmount = parseAmount(exshowroom);
    const targetIdv = exshowroomAmount != null ? exshowroomAmount * 0.95 : null;

    let topMatches = useModelMatch
      ? findClosestByModel(models, model, cc)
      : findClosestVariant(models, variant, model, cc);

    let usedModelMatchFallback = false;

    if (!useModelMatch && !hasVariantMatch(topMatches)) {
      useModelMatch = true;
      usedModelMatchFallback = true;
      ({ models, usedModelKeywordFallback } = await fetchModelsWithFallback(
        tableName,
        oem,
        model,
        variantKeywords,
        ccDigits,
        false
      ));
      topMatches = findClosestByModel(models, model, cc);
    }

    if (useModelMatch && !hasUsableMatch(topMatches)) {
      topMatches = [];
    }

    topMatches = attachIdvDiff(topMatches, targetIdv);

    let closestModel = null;
    let selectionReason = null;
    const matchLabel = useModelMatch ? 'model' : 'variant';

    if (isIdvRangeRequired) {
      closestModel = pickClosestByDefaultIdv(topMatches, exshowroom, cc);
      selectionReason = Number.isFinite(targetIdv)
        ? usedModelMatchFallback
          ? `No variant match found; selected from top ${topMatches.length} model matches because isIdvRangeRequired=true and default_idv (${closestModel?.default_idv}) is closest to targetIdv (${targetIdv})`
          : usedModelKeywordFallback
            ? `No full model-name match found; selected from top ${topMatches.length} model keyword matches because isIdvRangeRequired=true and default_idv (${closestModel?.default_idv}) is closest to targetIdv (${targetIdv})`
            : `Selected from top ${topMatches.length} ${matchLabel} matches because isIdvRangeRequired=true and default_idv (${closestModel?.default_idv}) is closest to targetIdv (${targetIdv})`
        : `Selected from top ${topMatches.length} ${matchLabel} matches because isIdvRangeRequired=true (targetIdv unavailable, first match used)`;

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
      invoiceVariant: variant,
      useModelMatch,
      usedModelMatchFallback,
      usedModelKeywordFallback,
      cc,
      variantKeywords,
      modelKeywords: getKeywords(model),
      isIdvRangeRequired,
      targetIdv,
      closestModel: closestModel
        ? {
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
