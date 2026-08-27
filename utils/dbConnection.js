import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { DB_CONNECTION_PASSWORD, DB_NAME, DB_USERNAME } from '../env.js';

dotenv.config();

const connectWithDb = () => {
  try {
    const db = new Sequelize(
      DB_NAME,
      DB_USERNAME, // process.env.DB_USERNAME,
      DB_CONNECTION_PASSWORD ,// process.env.DB_CONNECTION_PASSWORD,
      {
        host: process.env.DB_CONNECTION_HOST,
        dialect: 'mysql',
        port: 25060
      }
    );

    db.authenticate()
      .then(() => {
        console.log('Connection has been established successfully.');
      })
      .catch((error) => {
        console.error('Unable to connect to the database: ', error);
      });

    return db;
  } catch (err) {
    throw Error(err);
  }
};

export default connectWithDb;
