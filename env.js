import dotenv from 'dotenv';
dotenv.config();

export const ENV = process.env.ENV;
export const OCR_KEY = process.env.OCRKEY;

export const DB_NAME = process.env.DB_NAME;
export const DB_USERNAME = process.env.DB_USERNAME;
export const DB_CONNECTION_PASSWORD = process.env.DB_CONNECTION_PASSWORD;
export const DB_CONNECTION_HOST = process.env.DB_CONNECTION_HOST;