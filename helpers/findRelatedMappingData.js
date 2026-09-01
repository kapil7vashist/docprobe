import { NON_IDV_OEM, FINANCER_OEM } from '../utils/constants.js';
import { getModelVariant } from './dataFuncs.js';
import getInsurerMake from './getInsurerMake.js';

const findRelatedMappingData = async (oem, model, variant, insurer, hypothecation, exshowroom, cc) => {
  try {
    const insurerKey = String(insurer || '').toLowerCase().trim();

    // isIdvRangeRequired is driven only by NON_IDV_OEM (insurer list in utils/constants.js)
    const isIdvRangeRequired = !NON_IDV_OEM.includes(insurerKey);
    const isHypothecationMappingRequired = Boolean(hypothecation) && FINANCER_OEM.includes(insurerKey);

    // Search Related model variant connectin from the Database
    console.log({ oem, model, variant, insurer, insurerKey, insurerMake: getInsurerMake(oem, insurerKey), hypothecation, isHypothecationMappingRequired, isIdvRangeRequired, NON_IDV_OEM });

    const result = await getModelVariant(oem, model, variant, insurer, isIdvRangeRequired, exshowroom, cc);
    return result;

  } catch (err) {
    console.log({ err });
    throw Error(err);
  }
};

export default findRelatedMappingData;
