import { Router } from 'express';
import pdfParse from './pdf-parse.js';

const pdfParseRouter = Router();

pdfParseRouter.post('/parse', pdfParse);

export default pdfParseRouter;