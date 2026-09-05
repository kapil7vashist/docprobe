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

  customerMobile: [
    /Phone\s*\(M\)\s*:\s*(\d{10})/i,
    /Mobile\s*No\.?\s*:\s*(\d{10})/i,
    /Mobile\s*#\s*:?\s*(\d{10})/i
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
    /Hypothecated\s*to\s*:[ \t]*([^\n\r]*)/i,
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
    /Engine\s*:[ \t]*([A-Z0-9\-*]+)/i,
    /Engine No\.?\s*[:\-]?[ \t]*([A-Z0-9]+)/i,
    /Motor no\.?\s*[:\-]?[ \t]*([A-Z0-9]+)/i,
    /Engine number.*?:[ \t]*([A-Z0-9]+)/i,
    /Engine\s*No[ \t]+([A-Z0-9]+)/i
  ],

  model: [
    /DESCRIPTION\s*\/\s*HSN\/SAC\s*CODE[\s\S]*?\d+\s+[A-Z0-9]+\s+([^\n\/]+?)\s*\/\s*\d{8}/i,
    /Model\(Model Code\)[^\n]*\n([A-Z][A-Z0-9 ]+)\s*\n\s*\(/i,
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
    /Grand\s*Total\s*([\d,]+\.?\d*)/i,
    /Total\s*Amount\s*([\d,]+)/i,
    /Net\s*Total\s*([\d,]+\.\d+)/i
  ]

};

// Shared Khivraj dealer layout (BAJAJ / TRIUMPH / CHETAK / some KTM)
const khivrajProductBlock = {
  model: [
    /Engine\s*No\s*:\s*\n([^\n\r]+)/i
  ],
  chassisNo: [
    /Engine\s*No\s*:\s*\n[^\n]+\n[^\n]+\n([A-Z0-9]{17})/i
  ],
  engineNo: [
    /Engine\s*No\s*:\s*\n[^\n]+\n[^\n]+\n[A-Z0-9]{17}\n([A-Z0-9\-*]+)/i
  ],
  customerName: [
    /Email\s*:\s*\n([^\n\r]+)/i
  ],
  customerAddress: [
    /Email\s*:\s*\n[^\n]+\n([\s\S]*?)\s+\d{6}\s*\n\(M\)/i
  ],
  pincode: [
    /Email\s*:\s*\n[^\n]+\n[\s\S]*?\s+(\d{6})\s*\n\(M\)/i
  ],
  customerMobile: [
    /\(M\)-?(\d{10})/i
  ],
  hypothecation: [
    /Hypothecated\s*To\s*:[ \t]*([^\n\r]+)/i,
    /\n([A-Z][A-Z0-9 ,.]*\b(?:BANK|FINANCE|CREDIT)\b[A-Z0-9 ,.]*)\s*\nDownload\s+or\s+Visit/i
  ],
  exshowroom: [
    /([\d,]+\.\d{2})\n(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ninety|Hundred)/i,
    /Net\s*Total[\s\S]*?([\d,]+\.\d{2})\n(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine)/i
  ]
};

export const extractionTemplateKTM = {
  customerName: [
    /Customer\s*Name\s*:\s*([^\n\r(]+)/i,
    /VIN\s*No\s*(?::\s*)*\n([^\n\r]+)/i,
    ...khivrajProductBlock.customerName
  ],

  customerAddress: [
    /Bill\s*To\s*Address\s*:\s*([\s\S]*?)\s*Place\s*of\s*Supply\s*:/i,
    /VIN\s*No[\s:]*\n[^\n]+\n([\s\S]*?)\s+\d{6}\s*\n\(M\)/i,
    ...khivrajProductBlock.customerAddress
  ],

  pincode: [
    /Bill\s*To\s*Address\s*:[\s\S]*?\[State Code\s*:\s*\d+\],\s*(\d{6})/i,
    /VIN\s*No[\s:]*\n[^\n]+\n[\s\S]*?\s+(\d{6})\s*\n\(M\)/i,
    /Pin\s*:?\s*\n(?:\s*:\s*\n)*[^\n]+\n[\s\S]*?\n(\d{6})\s*\n\(M\)/i,
    ...khivrajProductBlock.pincode
  ],

  customerMobile: [
    /\(M\)-?(\d{10})/i,
    /Phone\s*:\s*(\d{10})/i
  ],

  hypothecation: [
    /H\.?P\.?Name\s*:[ \t]*([^\n\r]*)/i,
    ...khivrajProductBlock.hypothecation
  ],

  chassisNo: [
    /Chassis\s*No\.?\s*:\s*([A-Z0-9]{17})/i,
    /VIN\s*No[\s:]*\n[^\n]+\n[\s\S]*?\(M\)[^\n]*\n[A-Z0-9\-*]+\n([A-Z0-9]{17})/i,
    ...khivrajProductBlock.chassisNo
  ],

  engineNo: [
    /Engine\s*:[ \t]*([A-Z0-9\-*]+)/i,
    /VIN\s*No[\s:]*\n[^\n]+\n[\s\S]*?\(M\)[^\n]*\n([A-Z0-9\-*]+)/i,
    ...khivrajProductBlock.engineNo
  ],

  model: [
    /\d+\s+[A-Z0-9]+\s+([^\n\/]+?)\s*\n\s*\/\s*\d{8}/i,
    /DESCRIPTION\s*\/\s*HSN\/SAC\s*CODE[\s\S]*?\d+\s+[A-Z0-9]+\s+([^\n\/]+?)\s*\n\s*\/\s*\d{8}/i,
    /Model\s*\nColor\s*\n[^\n]*\n[^\n]*\n([^\n]+)/i,
    /SIBK[A-Z0-9]+\nIRN[^\n]*\n([^\n]+)/i,
    ...khivrajProductBlock.model
  ],

  variant: [
    /Variant\s*:\s*([^\n\r]+)/i,
    /Variant\s*\/\s*([^\n\r]+)/i,
    /Type\s*\/\s*Variant\s*:\s*([^\n\r]+)/i
  ],

  exshowroom: [
    /Total\s*Amount\s*([\d,]+\.?\d*)/i,
    /Grand\s*Total\s*([\d,]+\.?\d*)/i,
    /Total\s*Amount\s*([\d,]+)/i,
    ...khivrajProductBlock.exshowroom,
    // Khivraj registration invoice: "Total 68011.46 1277.54 69289.00"
    /(?:^|\n)Total\s+[\d,]+\.\d+\s+[\d,]+\.\d+\s+([\d,]+\.\d+)/i
  ]
};

export const extractionTemplateHONDA = {
  customerName: [
    /Buyer\s*\(Bill to\)\s*\n([^\n]+)/i,
    /Customer Name:\s*([^\n]+?)\s*Customer Name:/i,
    /1\.Name of the buyer\s*:\s*([^\n]+)/i,
    /Customer\s*Name\s*:\s*([^\n\r]+)/i
  ],

  customerAddress: [
    /Buyer\s*\(Bill to\)\s*\n[^\n]+\n([\s\S]*?)\nMB NO/i,
    /Bill To[\s\S]*?Customer Name:[^\n]+\nAddress\s*:\s*([\s\S]*?)\nAddress\s*:/i,
    /Bill To[\s\S]*?Customer Name:[^\n]+\nAddress\s*:\s*([^\n]+?)\s*Address\s*:/i,
    /Bill To[\s\S]*?Customer Name:[^\n]+\nAddress\s*:\s*([\s\S]*?)\nPin Code:/i,
    /3\.\s*Permanent address[\s\S]*?\n([\s\S]*?)\nMobile\s*#/i
  ],

  pincode: [
    /Buyer\s*\(Bill to\)[\s\S]*?-(\d{6})/i,
    /Bill To[\s\S]*?Pin Code:\s*(\d{6})/i,
    /3\.\s*Permanent address[\s\S]*?(\d{6})/i
  ],

  customerMobile: [
    /Buyer\s*\(Bill to\)[\s\S]*?MB NO\s*-?\s*(\d{10})/i,
    /Bill To[\s\S]*?Phone\s*\(M\)\s*:\s*(\d{10})/i,
    /Bill To[\s\S]*?Mobile\s*No\.?\s*:\s*(\d{10})/i
  ],

  hypothecation: [
    /HP\s*:-\s*([^\n]+)/i,
    /Hypothecation\s*With\s*:\s*(.*?)\s*Credit Note:/i,
    /Hire Purchase\/Lease\/Hypothecation with\s*([^\n\r,]+)/i,
    /hypothecation\s*in\s*favour\s*of\s*([A-Za-z0-9][^\n\r]*)/i
  ],

  chassisNo: [
    /CHASSIS\s*NO\s*-?\s*([A-Z0-9]{17})/i,
    /Chassis\s*No\.?\s*(?:\([^)]+\))?\s*([A-Z0-9]{17})/i,
    /Frame\s*No\.?\s*:\s*([A-Z0-9]{17})/i,
    /Chassis number\s*:\s*([A-Z0-9]{17})/i,
    /3\s*Chassis\s*No\s*([A-Z0-9]{17})/i
  ],

  engineNo: [
    /ENG\s*NO\s*-?\s*([A-Z0-9]+)/i,
    /19\.\s*Engine\s*No\.?\s*([A-Z0-9]+)/i,
    /4\.\s*Engine\s*No\.?\s*([A-Z0-9]+)/i,
    /Engine number.*?:\s*([A-Z0-9]+)/i
  ],

  model: [
    /Description of Goods[\s\S]*?\n\d+\s+([A-Z][A-Z0-9 ]+?)\s+OBD/i,
    /Description of Goods[\s\S]*?\n\d+\s+([A-Z][A-Z0-9]+(?:\s+\d{2,3}[A-Z]?)?)\s+\dID/i,
    /Model\(Model Code\)[^\n]*\n([A-Z][A-Z0-9 ]+)\s*\n\s*\(/i,
    /Model\s*\/\s*Commercial Name of the vehicle\s*:\s*(.+)/i,
    /16\.\s*Maker's classification or if not known\s*([^\n(]+)/i
  ],

  cc: [
    /Description of Goods[\s\S]*?\n\d+\s+[A-Z][A-Z0-9 ]+?(\d{2,3})[A-Z]?\s+\dID/i,
    /Description of Goods[\s\S]*?\n\d+\s+[A-Z][A-Z0-9 ]+?\s+(\d{2,3})\s+OBD/i,
    /Model\(Model Code\)[\s\S]*?\n[A-Z][A-Z0-9 ]+\s*\n\([A-Z]*(\d{2,4})[A-Z0-9]*\)/i,
    /Cubic\s*Capacity\s*:?\s*([\d.]+)\s*cc/i,
    /Cubic\s*Capacity\s*:?\s*([\d.]+)/i,
    /(\d{2,3}(?:\.\d+)?)\s*cc\b/i
  ],

  variant: [
    // Prefer short brake/variant token after Type code (e.g. 6ID DRUM ...)
    /\d+\s+[A-Z][A-Z0-9 ]*?\s+\dID\s+(DISC|DRUM|DX|STD|DLX|CBS)\b/i,
    /\d+\s+[A-Z][A-Z0-9 ]+?\s+\dID\s+([A-Z0-9 ]+?)\s+[\d,]+\./i,
    /OBD2B\s+\dID\s+([A-Z0-9 ]+?)\s*\n/i,
    /\(\s*([A-Z0-9][A-Z0-9\s]*?)\s*\)\s*[0-9]ID/i,
    // e.g. 5ID/ ACTIVA 125 DISC Mat Axis  |  2ID/ SHINE 100 DX Pearl ...
    /[0-9]ID\/\s*([A-Z0-9]+(?:\s+[A-Z0-9]+)*?)(?=\s+(?:Mat|Pearl|Metallic|Black|Gray|Grey|White|Red|Blue|Silver|Brown|ME4)|$)/i,
    /[0-9]ID\/\s*([A-Z0-9]+(?:\s+[A-Z0-9]+)?)/i,
    /[0-9]ID\s+([A-Z0-9]+(?:\s+[A-Z0-9]+)?)/i,
    /Variant\s*:\s*([^\n\r]+)/i,
    /Type\s*\/\s*Variant\s*:\s*([^\n\r]+)/i
  ],

  exshowroom: [
    /Total\s+\S?\s*([\d,]+\.?\d*)/i,
    /Total\s*Amount\s*([\d,]+\.?\d*)/i,
    /Total\s*Amount\s*([\d,]+)/i
  ]
};

export const extractionTemplateBAJAJ = {
  customerName: [
    /Customer\s*Name\s*\/\s*Institution Name\s*:\s*([^\n\r(]+)/i,
    /Institution Name\s*:\s*([^\n\r(]+)/i,
    /Customer\s*Name\s*:\s*([^\n\r(]+)/i,
    ...khivrajProductBlock.customerName
  ],

  customerMobile: [
    /Customer\s*Phone\s*:\s*(\d{10})/i,
    /Customer\s*Name[\s\S]*?Phone\s*:\s*(\d{10})/i,
    ...khivrajProductBlock.customerMobile
  ],

  customerAddress: [
    /Bill\s*To\s*Address\s*:[\s\S]*?Email\s*:[^\n]+\n([\s\S]*?)\s*Delivery\s*Address\s*:/i,
    /Bill\s*To\s*Address\s*:\s*([\s\S]*?)\s*Delivery\s*Address\s*:/i,
    ...khivrajProductBlock.customerAddress
  ],

  pincode: [
    /Bill\s*To\s*Address\s*:[\s\S]*?\[State Code\s*:\s*\d+\],\s*(\d{6})/i,
    /Bill\s*To\s*Address[\s\S]*?[A-Za-z]\s(\d{6})\s*\n[A-Za-z]+\s*\[State Code/i,
    ...khivrajProductBlock.pincode
  ],

  hypothecation: [
    /H\.?P\.?Name\s*:[ \t]*([^\n\r]*)/i,
    /Hypothecated[\s\S]*?to\s*:[ \t]*([^\n\r]*)/i,
    /Hypothecated\s*to\s*:[ \t]*([^\n\r]*)/i,
    ...khivrajProductBlock.hypothecation
  ],

  chassisNo: [
    /Chassis\s*No\.?\s*:\s*([A-Z0-9]{17})/i,
    /Chassis\s*No\.?\s*:\s*([A-Z0-9]+)/i,
    ...khivrajProductBlock.chassisNo
  ],

  engineNo: [
    /Motor\s*No\.?\s*:\s*([A-Z0-9]+)/i,
    /Engine\s*:[ \t]*([A-Z0-9\-*]+)/i,
    ...khivrajProductBlock.engineNo
  ],

  model: [
    /\d+\s+(CHETAK(?:\s+[A-Z0-9]+)+)\s*\/\s*\d{8}/i,
    /Model:\s*([^\n\r]+)/i,
    /\d+\s+[A-Z0-9]+\s+((?:[^\n\/]|\n(?=[A-Z]+\s*\/))+?)\s*\/\s*\d{8}/is,
    /DESCRIPTION\s*\/\s*HSN\/SAC\s*CODE[\s\S]*?\d+\s+[A-Z0-9]+\s+([^\n\/]+?)\s*\n\s*\/\s*\d{8}/i,
    ...khivrajProductBlock.model
  ],

  variant: [
    /Variant\s*:\s*([^\n\r]+)/i,
    /Variant\s*\/\s*([^\n\r]+)/i,
    /Type\s*\/\s*Variant\s*:\s*([^\n\r]+)/i
  ],

  exshowroom: [
    /Total\s*Amount\s*([\d,]+\.?\d*)/i,
    /Grand\s*Total\s*([\d,]+\.?\d*)/i,
    /Total\s*Amount\s*([\d,]+)/i,
    ...khivrajProductBlock.exshowroom
  ],

  cc: [
    /Battery\s*Capacity\s*:\s*([\d.]+)\s*kWh/i
  ]
};

export const extractionTemplateTRIUMPH = {
  customerName: [
    /Customer\s*Name\s*:\s*([^\n\r(]+)/i,
    ...khivrajProductBlock.customerName
  ],

  customerMobile: [
    /Phone\s*:\s*(\d{10})/i,
    ...khivrajProductBlock.customerMobile
  ],

  customerAddress: [
    /Bill\s*To\s*Address\s*:\s*([\s\S]*?)\s*(?:Delivery|Place\s*of\s*Supply)\s*Address\s*:/i,
    /Bill\s*To\s*Address\s*:\s*([\s\S]*?)\s*Place\s*of\s*Supply\s*:/i,
    ...khivrajProductBlock.customerAddress
  ],

  pincode: [
    /Bill\s*To\s*Address\s*:[\s\S]*?\[State Code\s*:\s*\d+\],\s*(\d{6})/i,
    ...khivrajProductBlock.pincode
  ],

  hypothecation: [
    /H\.?P\.?Name\s*:[ \t]*([^\n\r]*)/i,
    ...khivrajProductBlock.hypothecation
  ],

  chassisNo: [
    /Chassis\s*No\.?\s*:\s*([A-Z0-9]{17})/i,
    ...khivrajProductBlock.chassisNo
  ],

  engineNo: [
    /Engine\s*:[ \t]*([A-Z0-9\-*]+)/i,
    ...khivrajProductBlock.engineNo
  ],

  model: [
    /\d+\s+[A-Z0-9]+\s+([^\n\/]+?)\s*\/\s*\d{8}/i,
    ...khivrajProductBlock.model
  ],

  variant: [
    /Variant\s*:\s*([^\n\r]+)/i
  ],

  exshowroom: [
    /Total\s*Amount\s*([\d,]+\.?\d*)/i,
    /Grand\s*Total\s*([\d,]+\.?\d*)/i,
    ...khivrajProductBlock.exshowroom
  ]
};

export const extractionTemplateHERO = {
  customerName: [
    /Name of the Customer\s+([A-Z][A-Z\s]+?)\s+Date/i
  ],

  customerAddress: [
    /Address\s+([\s\S]*?)\nState Code\s+\d+/i
  ],

  pincode: [
    /Address[\s\S]*?\n(\d{6})\s*\nState Code/i
  ],

  customerMobile: [
    /Mobile\s*#\s*(\d{10})/i
  ],

  hypothecation: [
    /Hypothecation with\s+([^\n]+)/i
  ],

  chassisNo: [
    /^\d+\.\s+[A-Z0-9+ .]+\s+[A-Z0-9]+\s+[A-Z]{2,4}\s+\d{8}\s+PC\s+[A-Z0-9]+\s+([A-Z0-9]{17})/im,
    /Engine#\s*Chassis\s*#[\s\S]*?\d+\.\s+[A-Z0-9+ .]+\s+[A-Z0-9]+\s+[A-Z]+\s+\d+\s+PC\s+[A-Z0-9]+\s+([A-Z0-9]{17})/i
  ],

  engineNo: [
    /^\d+\.\s+[A-Z0-9+ .]+\s+[A-Z0-9]+\s+[A-Z]{2,4}\s+\d{8}\s+PC\s+([A-Z0-9]+)\s+[A-Z0-9]{17}/im,
    /Engine#\s*Chassis\s*#[\s\S]*?\d+\.\s+[A-Z0-9+ .]+\s+[A-Z0-9]+\s+[A-Z]+\s+\d+\s+PC\s+([A-Z0-9]+)\s+[A-Z0-9]{17}/i
  ],

  model: [
    /^\d+\.\s+(.+?)\s+[A-Z0-9]{8,}\s+[A-Z]{2,4}\s+\d{8}\s+PC/im
  ],

  cc: [],

  variant: [],

  exshowroom: [
    /Ex\s*Showroom\s*Price\s+([\d,]+\.\d+)/i
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