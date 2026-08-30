import { Sequelize } from 'sequelize';
import { dbConnection } from '../index.js';
import { FINANCER_OEM } from '../utils/constants.js';

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

const getFinancerScore = (hypothecation, financerName) => {
  const invoice = normalizeText(hypothecation);
  const candidate = normalizeText(financerName);

  if (!invoice || !candidate) {
    return 0;
  }

  const scores = [];

  if (invoice === candidate) {
    scores.push(1);
  }

  const invoiceKeywords = getKeywords(hypothecation);
  const candidateKeywords = getKeywords(financerName);

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

const buildFinancerDetails = ({ hypothecation, name, matchScore = null, isMapped = false, ...rest }) => {
  if (!name && !hypothecation) {
    return null;
  }

  return {
    ...rest,
    name: name ?? hypothecation ?? null,
    hypothecation: hypothecation ?? null,
    matchScore,
    isMapped
  };
};

const getFinancerName = async (insurer, hypothecation) => {
  try {
    const insurerKey = String(insurer || '').toLowerCase().trim();

    if (!hypothecation || hypothecation === 'N/A') {
      return null;
    }

    if (!FINANCER_OEM.includes(insurerKey)) {
      return buildFinancerDetails({
        hypothecation,
        name: hypothecation,
        isMapped: false
      });
    }

    const keywords = getKeywords(hypothecation);

    if (!keywords.length) {
      return buildFinancerDetails({
        hypothecation,
        name: hypothecation,
        isMapped: false
      });
    }

    const replacements = {};
    const searchClauses = keywords.map((keyword, index) => {
      replacements[`kw${index}`] = `%${keyword}%`;
      return `name LIKE :kw${index}`;
    });

    const sql = `SELECT * FROM ${insurerKey}_financers WHERE ${searchClauses.join(' OR ')}`;
    const candidates = (await dbConnection.query(sql, {
      replacements,
      type: Sequelize.QueryTypes.SELECT
    })) || [];

    if (!candidates.length) {
      return buildFinancerDetails({
        hypothecation,
        name: hypothecation,
        isMapped: false
      });
    }

    const ranked = candidates.map((row) => ({
      ...row,
      matchScore: getFinancerScore(hypothecation, row.name)
    }));

    ranked.sort((a, b) => b.matchScore - a.matchScore);

    const best = ranked[0];

    return buildFinancerDetails({
      ...best,
      hypothecation,
      name: best.name,
      matchScore: best.matchScore,
      isMapped: true
    });
  } catch (error) {
    console.error(error);
    return null;
  }
};

export default getFinancerName;
