export const extractionTemplates = {
  customerName: [
    /Customer\s*Name\s*:\s*([^\n\r(]+)/i,
    /Customer Name:\s*(.+)/i,
    /Legal Name:\s*(.+)/i,
    /1\.Name of the buyer\s*:\s*(.+)/i,
    /Customer\s*:\s*([^\n\r]+)/i,
    /Buyer\s*Name\s*:\s*([^\n\r]+)/i
  ],

  customerAddress: [
    /Address\s*:\s*(.*?)\s*Pin Code:/is,
    /Permanent Address\s*:\s*(.*?)\s*Mobile/i,
    /2\.Permanent Address\s*:\s*(.*?)\s*4\./is,
    /Bill\s*To\s*Address\s*:\s*([\s\S]*?)\s*Place\s*of\s*Supply\s*:/i,
    /Address\s*:\s*([\s\S]*?)\s*Invoice\s*No/i,
    /Address\s*:\s*([\s\S]*?)\s*GSTIN/i
  ],

  pincode: [
    /Pin Code:\s*(\d{6})/i,
    /Pin\s*Code\s*:\s*(\d{6})/i,
    /Bill\s*To\s*Address\s*:[\s\S]*?\[State Code\s*:\s*\d+\],\s*(\d{6})/i,
    /Permanent Address[\s\S]*?(\d{6})/i
  ],

  hypothecation: [
    /Hypothecation with\s*(.*?)\s*,/i,
    /H\.?P\.?Name\s*:\s*([^\n\r]+)/i,
    /Hypothecated\s*to\s*:?\s*([^\n\r]+)/i,
    /H\.?P\.?Name\s*:?\s*([^\n\r]+)/i,
    /Hypothecation\s*With\s*:?\s*([^\n\r]+)/i,
    /hypothecation\s*in\s*favour\s*of\s*([^\n\r]+)/i,
    /HP\s*Company\s*:\s*([^\n\r]+)/i
  ],

  chassisNo: [
    /Chassis No\.?\s*[:\-]?\s*([A-Z0-9]{17})/i,
    /Frame No\.?\s*[:\-]?\s*([A-Z0-9]{17})/i,
    /VIN\s*[:\-]?\s*([A-Z0-9]{17})/i,
    /Frame\s*No\s*([A-Z0-9]{17})/i
  ],

  engineNo: [
    /Engine\s*:\s*([A-Z0-9\-*]+)/i,
    /Engine No\.?\s*[:\-]?\s*([A-Z0-9]+)/i,
    /Motor no\.?\s*[:\-]?\s*([A-Z0-9]+)/i,
    /Engine number.*?:\s*([A-Z0-9]+)/i,
    /Engine\s*No\s*([A-Z0-9]+)/i
  ],

  model: [
    /DESCRIPTION\s*\/\s*HSN\/SAC\s*CODE[\s\S]*?\d+\s+[A-Z0-9]+\s+([^\n\/]+?)\s*\/\s*\d{8}/i,
    /Model\(Model Code\).*?\n([A-Z0-9\s]+)/i,
    /Model\s*\/\s*Commercial Name of the vehicle\s*:\s*(.+)/i,
    /Maker's classification.*?\n([A-Z0-9\s]+)/i,
    /Particulars[\s\S]*?\n([A-Z0-9\-]+)\s*\n([A-Z0-9\s]+)\s*\n/i
  ],

  variant: [
    /ACTIVA STD/i,
    /Type\s*\/\s*Variant\s*(.+?)\s*Colour/is,
    /\(\s*(.*?)\s*\)\s*3ID/i
  ],

  exshowroom: [
    /Ex[\s-]*Showroom[\s-]*Price(?:\s*\(Rs\.?\))?\s*([\d,]+\.\d+)/i,
    /Total\s*Amount\s*([\d,]+\.\d+)/i,
    /Total\s*Amount\s*([\d,]+)/i,
    /Net\s*Total\s*([\d,]+\.\d+)/i
  ]

};

export const extractionTemplateKTM = {
  customerName: [
    /Customer\s*Name\s*:\s*([^\n\r(]+)/i
  ],

  customerAddress: [
    /Bill\s*To\s*Address\s*:\s*([\s\S]*?)\s*Place\s*of\s*Supply\s*:/i
  ],

  pincode: [
    /Bill\s*To\s*Address\s*:[\s\S]*?\[State Code\s*:\s*\d+\],\s*(\d{6})/i
  ],

  hypothecation: [
    /H\.?P\.?Name\s*:\s*([^\n\r]+)/i
  ],

  chassisNo: [
    /Chassis\s*No\.?\s*:\s*([A-Z0-9]{17})/i,
    /Chassis\s*No\.?\s*:\s*([A-Z0-9]+)/i
  ],

  engineNo: [
    /Engine\s*:\s*([A-Z0-9\-*]+)/i,
    /Engine\s*No\.?\s*:\s*([A-Z0-9\-*]+)/i
  ],

  model: [
    /\d+\s+[A-Z0-9]+\s+([^\n\/]+?)\s*\n\s*\/\s*\d{8}/i,
    /DESCRIPTION\s*\/\s*HSN\/SAC\s*CODE[\s\S]*?\d+\s+[A-Z0-9]+\s+([^\n\/]+?)\s*\n\s*\/\s*\d{8}/i
  ],

  variant: [
    /Variant\s*:\s*([^\n\r]+)/i,
    /Variant\s*\/\s*([^\n\r]+)/i,
    /Type\s*\/\s*Variant\s*:\s*([^\n\r]+)/i
  ],

  exshowroom: [
    /Total\s*Amount\s*([\d,]+\.?\d*)/i,
    /Total\s*Amount\s*([\d,]+)/i
  ]
};

export const extractionTemplateHONDA = {
  customerName: [
    /Customer Name:\s*([^\n]+?)\s*Customer Name:/i,
    /1\.Name of the buyer\s*:\s*([^\n]+)/i,
    /Customer\s*Name\s*:\s*([^\n\r]+)/i
  ],

  customerAddress: [
    /Bill To[\s\S]*?Customer Name:[^\n]+\nAddress\s*:\s*([\s\S]*?)\nAddress\s*:/i,
    /Bill To[\s\S]*?Customer Name:[^\n]+\nAddress\s*:\s*([^\n]+?)\s*Address\s*:/i,
    /Bill To[\s\S]*?Customer Name:[^\n]+\nAddress\s*:\s*([\s\S]*?)\nPin Code:/i,
    /3\.\s*Permanent address[\s\S]*?\n([\s\S]*?)\nMobile\s*#/i
  ],

  pincode: [
    /Bill To[\s\S]*?Pin Code:\s*(\d{6})/i,
    /3\.\s*Permanent address[\s\S]*?(\d{6})/i
  ],

  hypothecation: [
    /Hypothecation\s*With\s*:\s*(.*?)\s*Credit Note:/i,
    /Hire Purchase\/Lease\/Hypothecation with\s*([^\n\r,]+)/i,
    /hypothecation\s*in\s*favour\s*of\s*([A-Za-z0-9][^\n\r]*)/i
  ],

  chassisNo: [
    /Chassis\s*No\.?\s*(?:\([^)]+\))?\s*([A-Z0-9]{17})/i,
    /Frame\s*No\.?\s*:\s*([A-Z0-9]{17})/i,
    /Chassis number\s*:\s*([A-Z0-9]{17})/i,
    /3\s*Chassis\s*No\s*([A-Z0-9]{17})/i
  ],

  engineNo: [
    /19\.\s*Engine\s*No\.?\s*([A-Z0-9]+)/i,
    /4\.\s*Engine\s*No\.?\s*([A-Z0-9]+)/i,
    /Engine number.*?:\s*([A-Z0-9]+)/i
  ],

  model: [
    /Model\(Model Code\)[\s\S]*?\n([A-Z]+)\s*\n/i,
    /Model\s*\/\s*Commercial Name of the vehicle\s*:\s*(.+)/
  ],

  cc: [
    // Prefer CC digits from model code under model name, e.g. (SCV110S) -> 110
    /Model\(Model Code\)[\s\S]*?\n[A-Z][A-Z0-9\s]*\n\([A-Z]*(\d{2,4})[A-Z0-9]*\)/i,
    // Fallback: Cubic Capacity from Form 20 / Form 21 / invoice body
    /Cubic\s*Capacity\s*:?\s*([\d.]+)\s*cc/i,
    /Cubic\s*Capacity\s*:?\s*([\d.]+)/i,
    /(\d{2,3}(?:\.\d+)?)\s*cc\b/i
  ],

  variant: [
    /\(\s*([A-Z0-9][A-Z0-9\s]*?)\s*\)\s*[0-9]ID/i,
    /[0-9]ID\/\s*([A-Z0-9]+(?:\s+[A-Z0-9]+)?)/i,
    /Variant\s*:\s*([^\n\r]+)/i,
    /Type\s*\/\s*Variant\s*:\s*([^\n\r]+)/i
  ],

  exshowroom: [
    /Total\s*Amount\s*([\d,]+\.?\d*)/i,
    /Total\s*Amount\s*([\d,]+)/i
  ]
};

export const extractionTemplateBAJAJ = {
  customerName: [
    /Customer\s*Name\s*:\s*([^\n\r(]+)/i
  ],

  customerAddress: [
    /Bill\s*To\s*Address\s*:\s*([\s\S]*?)\s*Delivery\s*Address\s*:/i
  ],

  pincode: [
    /Bill\s*To\s*Address\s*:[\s\S]*?\[State Code\s*:\s*\d+\],\s*(\d{6})/i
  ],

  hypothecation: [
    /Hypothecated[\s\S]*?to\s*:\s*([^\n\r]+)/i,
    /Hypothecated\s*to\s*:\s*([^\n\r]+)/i
  ],

  chassisNo: [
    /Chassis\s*No\.?\s*:\s*([A-Z0-9]{17})/i,
    /Chassis\s*No\.?\s*:\s*([A-Z0-9]+)/i
  ],

  engineNo: [
    /Engine\s*:\s*([A-Z0-9\-*]+)/i,
    /Engine\s*No\.?\s*:\s*([A-Z0-9\-*]+)/i
  ],

  model: [
    /Model:\s*([^\n\r]+)/i,
    /\d+\s+[A-Z0-9]+\s+((?:[^\n\/]|\n(?=[A-Z]+\s*\/))+?)\s*\/\s*\d{8}/is,
    /DESCRIPTION\s*\/\s*HSN\/SAC\s*CODE[\s\S]*?\d+\s+[A-Z0-9]+\s+([^\n\/]+?)\s*\n\s*\/\s*\d{8}/i
  ],

  variant: [
    /Variant\s*:\s*([^\n\r]+)/i,
    /Variant\s*\/\s*([^\n\r]+)/i,
    /Type\s*\/\s*Variant\s*:\s*([^\n\r]+)/i
  ],

  exshowroom: [
    /Total\s*Amount\s*([\d,]+\.?\d*)/i,
    /Total\s*Amount\s*([\d,]+)/i
  ]
};

export const extractionTemplateTVS = {
  customerName: [
    /Vehicle Invoice[^\n]+\n[^\t]+\t([^\n\r\t]+)/i
  ],

  customerAddress: [
    /S\/W\/D[^\n]+\n[^\n]*\s+(WARD[^\n]+)[\s\S]*?\t([A-Z,\s\-]+-\s*\d{6})/i
  ],

  pincode: [
    /\t[A-Z,\s]+-\s*(\d{6})/i,
    /-\s*(\d{6})/i
  ],

  hypothecation: [
    /HP\s*Company\s*:\s*([^\n\r\t]+)/i
  ],

  chassisNo: [
    /Frame\s*No[\s\S]*?\n[^\n]*?\s([A-Z0-9]{17})\s+[A-Z0-9]+/i,
    /Chassis\s*No\.?\s*:\s*([A-Z0-9]{17})/i
  ],

  engineNo: [
    /Frame\s*No[\s\S]*?\n[^\n]*?\s[A-Z0-9]{17}\s+([A-Z0-9]+)/i,
    /Engine\s*No\.?\s*:\s*([A-Z0-9]+)/i
  ],

  model: [
    /Particulars[\s\S]*?\n[A-Z0-9\-]+\n([^\n]+)\n/i,
    /TVS\s+([A-Z0-9\s]+?)\s*-?\s*OBD/i
  ],

  variant: [
    /Variant\s*:\s*([^\n\r]+)/i,
    /Variant\s*\/\s*([^\n\r]+)/i,
    /Type\s*\/\s*Variant\s*:\s*([^\n\r]+)/i
  ],

  exshowroom: [
    /Net\s*Total\s*([\d,]+\.?\d*)/i,
    /Ex\s*Showroom\s*Price[^\d]*Rs\.?\s*([\d,]+\.?\d*)/i
  ]
};