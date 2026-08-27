import { Router } from 'express';
import pdfParse from './pdf-parse.js';
import documentOcr from './documentOcr.js';

const pdfParseRouter = Router();

pdfParseRouter.post('/parse', pdfParse);
pdfParseRouter.post('/ocr', documentOcr);

export default pdfParseRouter;