const crypto = require("crypto");
const fs = require("fs");


// Function to select a random sensor type
 function getRandomSensorType() {
    const sensorTypes = ["water", "electricity", "motion"];
    return sensorTypes[Math.floor(Math.random() * sensorTypes.length)] + "-sensor";
}

// Function to generate a random device ID with a sensor type
 function generateDeviceID() {
    const sensorType = getRandomSensorType();
    return `${sensorType}-${Math.floor(Math.random() * 10000).toString()}`;
}

// Function to generate a random owner
function generateOwner() {
  return `owner-${Math.floor(Math.random() * 10000).toString()}`;
}

// Function to generate a random owner
function generateLocation() {
  return `Area-${Math.floor(Math.random() * 10000).toString()}`;
}
// Function to generate a random data hash
 function generateDataHash() {
  const data = Math.random().toString(36).substring(2); // Random string
  return crypto.createHash("sha256").update(data).digest("hex");
}

// Function to generate a timestamp (current time or random within a range)
 function generateTimestamp() {
  return Math.floor(Date.now() / 1000); // Current time in seconds
}

// Function to generate a dummy transaction object
 function generateDummyTransaction() {
  const deviceID = generateDeviceID();
  const owner = generateOwner();
  const location = generateLocation();
  const dataHash = generateDataHash();
  // const timestamp = generateTimestamp();


  return {
    deviceID,
    owner,
    location,
    dataHash,
    // timestamp,
  };
}

// Generate multiple dummy transactions
 function generateTransactions(count) {
  const transactions = [];
  for (let i = 0; i < count; i++) {
    transactions.push(generateDummyTransaction());
  }
  return transactions;
}


// Function to save transactions in a JSON file
 function saveTransactions(transactions, fileName) {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, JSON.stringify(transactions, null, 2), (err) => {
      if (err) reject(err);
      console.log(`${fileName} saved successfully`);
      resolve(`${fileName} saved successfully`);
      
    });
  });
}


module.exports = {
  getRandomSensorType,
  generateDeviceID,
  generateDataHash,
  generateTimestamp,
  generateDummyTransaction,
  generateTransactions,
  saveTransactions,
};