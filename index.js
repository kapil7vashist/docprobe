import express from 'express';
import pdfParseRouter from './src/router.js';
import connectWithDb from './utils/dbConnection.js';

const app = express();

// Database Connection
export const dbConnection = connectWithDb();

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: false }));


//? ROUTES
app.use('/pdf', pdfParseRouter);

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});