import { Router } from 'express';
import pdfParse, { certificateInvoice } from './pdf-parse.js';
import documentOcr from './documentOcr.js';

const pdfParseRouter = Router();

pdfParseRouter.post('/parse', pdfParse);
pdfParseRouter.post('/certificate-invoice', certificateInvoice);
pdfParseRouter.post('/ocr', documentOcr);

export default pdfParseRouter;