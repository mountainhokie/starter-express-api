const dotenv = require("dotenv");
dotenv.config();
const env = process.env;

const PORT = env.PORT || "8080";
const HOST = env.HOST || "localhost";
const SERVER_URL = `http://${HOST}:${PORT}`;
const MONGODB_URI = env.MONGODB_URL || "mongodb://localhost:27017";
const DATABASE_NAME = env.DATABASE_NAME || "comics-stash";

module.exports = {
  PORT,
  HOST,
  SERVER_URL,
  MONGODB_URI,
  DATABASE_NAME,
};
