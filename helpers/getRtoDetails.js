import { Sequelize } from 'sequelize';
import { dbConnection } from '../index.js';

const getRtoDetails = async(insurer, pincode) => {
  try {
    //? Pincode not extracted from the PDF
    if (!pincode) return null;

    const pincodeQuery = `SELECT * from ${insurer}_pincodes WHERE pincode = '${pincode}'`;
    const pincodeResult = await dbConnection.query(pincodeQuery, { type: Sequelize.QueryTypes.SELECT });
    const pincodeCity = pincodeResult?.[0].city;

    const rtoDetailsQuery = `SELECT * from ${insurer}_rto WHERE city = '${pincodeCity}'`;
    const rtoDetailsResult = await dbConnection.query(rtoDetailsQuery, { type: Sequelize.QueryTypes.SELECT });
    const rtoDetails = rtoDetailsResult?.[0] || null;

    return rtoDetails;
  } catch (error) {
    console.error(error);
    return null;
  };
};

export default getRtoDetails;