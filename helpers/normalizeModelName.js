export const normalizeModelName = (value) => {
  if (!value) {
    return null;
  }

  return String(value)
    .replace(/\+/g, ' PLUS ')
    .replace(/\s+/g, ' ')
    .trim();
};

const MODEL_VARIANT_SUFFIX_PATTERNS = [
  /\s+XTEC\s+2\.0\s*$/i,
  /\s+XTEC\s*$/i
];

export const splitInvoiceModelVariant = (model, variant) => {
  let baseModel = normalizeModelName(model);
  let modelVariantSuffix = '';

  if (!baseModel) {
    return { baseModel: model, combinedVariant: variant };
  }

  for (const pattern of MODEL_VARIANT_SUFFIX_PATTERNS) {
    const match = baseModel.match(pattern);

    if (match) {
      modelVariantSuffix = match[0].trim();
      baseModel = baseModel.replace(pattern, '').trim();
      break;
    }
  }

  const combinedVariant = [modelVariantSuffix, variant]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    baseModel,
    combinedVariant: combinedVariant || variant
  };
};
