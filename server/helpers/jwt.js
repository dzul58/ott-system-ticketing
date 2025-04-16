// if (process.env.NODE_ENV !== "production") {
//     require("dotenv").config();
//   }

const jwt = require("jsonwebtoken");

const jwtSecret = "jwtkuy";
const signToken = (payload) => {
  return jwt.sign(payload, jwtSecret);
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    return decoded;
  } catch (err) {
    // Handle error if token is invalid or expired
    throw new Error('Invalid or expired token');
  }
};

module.exports = { signToken, verifyToken };