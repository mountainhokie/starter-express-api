const { MongoClient } = require("mongodb");

const { MONGODB_URI, DATABASE_NAME } = require("./config");

let connectedClient;

exports.connectClient = async () => {
  if (connectedClient) {
    return connectedClient.db(DATABASE_NAME);
  }
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  await client.db(DATABASE_NAME).command({ ping: 1 });
  console.info("Connected to MongoDB");

  connectedClient = client;
  return client.db(DATABASE_NAME);
};

exports.stopClient = async () => {
  await connectedClient?.close();
};
