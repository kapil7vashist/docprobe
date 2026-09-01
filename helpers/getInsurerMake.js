import makesDb from '../utils/MAKES_DB.json' with { type: 'json' };

const { makes } = makesDb;

const OEM_ALIASES = {
  HERO: 'HERO MOTOCORP'
};

const normalizeMakeKey = (value) =>
  String(value || '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');

const resolveMakeRow = (oem) => {
  const normalizedOem = normalizeMakeKey(oem);

  if (!normalizedOem) {
    return null;
  }

  const aliasTarget = OEM_ALIASES[normalizedOem];
  if (aliasTarget) {
    const aliased = makes.find(
      (row) => normalizeMakeKey(row.make) === aliasTarget
    );
    if (aliased) {
      return aliased;
    }
  }

  const exact = makes.find(
    (row) => normalizeMakeKey(row.make) === normalizedOem
  );
  if (exact) {
    return exact;
  }

  const prefixMatches = makes.filter((row) => {
    const make = normalizeMakeKey(row.make);
    return make.startsWith(`${normalizedOem} `) || normalizedOem.startsWith(`${make} `);
  });

  if (prefixMatches.length === 1) {
    return prefixMatches[0];
  }

  if (prefixMatches.length > 1) {
    return prefixMatches.sort(
      (a, b) => normalizeMakeKey(a.make).length - normalizeMakeKey(b.make).length
    )[0];
  }

  return null;
};

const getInsurerMake = (oem, insurer) => {
  const row = resolveMakeRow(oem);

  if (!row) {
    return normalizeMakeKey(oem) || null;
  }

  const insurerKey = String(insurer || '').toLowerCase().trim();
  const mapped = row[insurerKey];

  if (mapped == null || String(mapped).trim() === '') {
    return row.make;
  }

  return mapped;
};

export default getInsurerMake;
