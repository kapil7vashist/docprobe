import { Sequelize } from 'sequelize';
import { dbConnection } from '../index.js';

/** Map request insurer key → Insurance Provider LIKE pattern in insurance_policies */
const INSURER_PROVIDER_PATTERNS = {
  national: '%national%',
  united: '%united india%',
  kotak: '%kotak%',
  newindia: '%new india%',
  shriram: '%shriram%',
  tata: '%tata%',
  icici: '%icici%',
  reliance: '%reliance%',
  oriental: '%oriental%',
  bajaj: '%bajaj allianz%',
  ksheema: '%ksheema%'
};

const getProviderPattern = (insurer) => {
  const key = String(insurer || '').toLowerCase().trim();
  return INSURER_PROVIDER_PATTERNS[key] || `%${key}%`;
};

/**
 * Most-used RTO previously selected for this pincode + insurer (+ dealer when provided).
 */
const getHistoricalRtoCode = async (insurer, pincode, dealerCode) => {
  const providerPattern = getProviderPattern(insurer);
  const replacements = { pincode, providerPattern };
  const dealerFilter = dealerCode
    ? 'AND `Dealer Code` = :dealerCode'
    : '';

  if (dealerCode) {
    replacements.dealerCode = dealerCode;
  }

  const rows = await dbConnection.query(
    `
      SELECT \`RTO\` AS rto_code, COUNT(*) AS cnt, MAX(\`Created At\`) AS last_used
      FROM insurance_policies
      WHERE \`Pincode\` = :pincode
        AND LOWER(\`Insurance Provider\`) LIKE LOWER(:providerPattern)
        AND \`RTO\` IS NOT NULL
        AND TRIM(\`RTO\`) <> ''
        ${dealerFilter}
      GROUP BY \`RTO\`
      ORDER BY cnt DESC, last_used DESC
      LIMIT 1
    `,
    { replacements, type: Sequelize.QueryTypes.SELECT }
  );

  return rows?.[0]?.rto_code || null;
};

const getRtoByCode = async (insurer, rtoCode) => {
  if (!rtoCode) return null;

  const rows = await dbConnection.query(
    `
      SELECT * FROM ${insurer}_rto
      WHERE rto_code = :rtoCode
        AND city IS NOT NULL
        AND TRIM(city) <> ''
      LIMIT 1
    `,
    {
      replacements: { rtoCode },
      type: Sequelize.QueryTypes.SELECT
    }
  );

  return rows?.[0] || null;
};

/**
 * Old logic: resolve pincode → city from insurer pincode master,
 * then pick RTO whose city matches / contains / is contained in that city name.
 */
const compactCitySql = (expression) =>
  `REPLACE(UPPER(${expression}), ' ', '')`;

const getRtoByPincodeCity = async (insurer, pincode) => {
  const pincodeResult = await dbConnection.query(
    `SELECT * FROM ${insurer}_pincodes WHERE pincode = :pincode`,
    {
      replacements: { pincode },
      type: Sequelize.QueryTypes.SELECT
    }
  );
  const pincodeCity = String(pincodeResult?.[0]?.city || '').trim();
  const pincodeState = String(pincodeResult?.[0]?.state || '').trim();
  if (!pincodeCity) return null;

  const rtoCity = compactCitySql('city');
  const pinCity = compactCitySql(':city');

  // Ignore blank RTO cities — `LIKE '%%'` would otherwise match every row.
  // Spaces are ignored so "BANAS KANTHA" matches Reliance "Banaskantha".
  const rtoDetailsResult = await dbConnection.query(
    `
      SELECT * FROM ${insurer}_rto
      WHERE city IS NOT NULL
        AND TRIM(city) <> ''
        AND (
          ${rtoCity} = ${pinCity}
          OR ${rtoCity} LIKE CONCAT('%', ${pinCity}, '%')
          OR ${pinCity} LIKE CONCAT('%', ${rtoCity}, '%')
        )
      ORDER BY
        CASE
          WHEN ${rtoCity} = ${pinCity} THEN 0
          WHEN ${rtoCity} LIKE CONCAT('%', ${pinCity}, '%') THEN 1
          ELSE 2
        END,
        CASE
          WHEN :state <> '' AND UPPER(TRIM(state)) = UPPER(TRIM(:state)) THEN 0
          ELSE 1
        END,
        CHAR_LENGTH(city) DESC
      LIMIT 1
    `,
    {
      replacements: {
        city: pincodeCity,
        state: pincodeState
      },
      type: Sequelize.QueryTypes.SELECT
    }
  );

  return rtoDetailsResult?.[0] || null;
};

const getRtoDetails = async (insurer, pincode, dealerCode = null) => {
  try {
    if (!pincode || !insurer) return null;

    const insurerKey = String(insurer).toLowerCase().trim();

    // 1) Historical: dealer + pincode + insurer from insurance_policies
    let historicalCode = await getHistoricalRtoCode(insurerKey, pincode, dealerCode);

    // 2) Historical: pincode + insurer (any dealer), if dealer had no rows
    if (!historicalCode && dealerCode) {
      historicalCode = await getHistoricalRtoCode(insurerKey, pincode, null);
    }

    if (historicalCode) {
      const historicalRto = await getRtoByCode(insurerKey, historicalCode);
      if (historicalRto) return historicalRto;
    }

    // 3) Fallback: no usable insurance_policies history → city-name RTO match
    return getRtoByPincodeCity(insurerKey, pincode);
  } catch (error) {
    console.error(error);
    return null;
  }
};

export default getRtoDetails;
