const amqp = require("amqplib");
const fs = require("fs");
const { loadContractOrg0 } = require("../utils/loadContract");
const { ETHERMINT_TO_FABRIC_QUEUE } = require("../utils/constants");
const {TextDecoder} = require('util');

const utf8Decoder = new TextDecoder();
let connection;
let channel;
// Path to the JSON file where results will be stored
const RESULTS_FILE_PATH =  "transaction_results.json";

async function listenToQueue() {
  try {
    const { contract } = await loadContractOrg0();
    // Connect to RabbitMQ server
    connection = await amqp.connect("amqp://localhost:5672");
    channel = await connection.createChannel();

    // Ensure the queue exists
    await channel.assertQueue(ETHERMINT_TO_FABRIC_QUEUE, { durable: true });

    console.log("Waiting for messages in queue:", ETHERMINT_TO_FABRIC_QUEUE);

    // Consume messages from the queue
    await channel.consume(ETHERMINT_TO_FABRIC_QUEUE, async (msg) => {
      if (msg !== null) {
        const message = JSON.parse(msg.content.toString());
        console.log("Received message:", message);

        try {
          // For the testing purpose we are assume that data is valid
          // Create the transaction
          const transaction = contract.createTransaction("VerifyData");
          const transactionId = transaction.getTransactionId();
          // Submit the transaction with arguments
          await transaction.submit(`${message.dataID}`, message.isValid);
          console.log(`Transaction has been submitted`, transactionId);
          // GetDataRecord
          const getResult = await contract.evaluateTransaction('GetDataRecord',[message.dataID]);
          console.log('Get result:', utf8Decoder.decode(getResult));
          const decodedResult = JSON.parse(utf8Decoder.decode(getResult));
          console.log('Decoded result:', decodedResult);


          const startingDate = new Date(decodedResult.timestamp);
          const endingDate = new Date(decodedResult.validationTime);
          const timestamp = Math.floor(startingDate.getTime() / 1000);
          const endTimestamp = Math.floor(endingDate.getTime() / 1000);

          const executionTime = endTimestamp - timestamp;

          console.log(`Execution time: ${executionTime} seconds`)
          // append the result to the json file for generating metrics

          const result = {
            dataID: message.dataID,
            isValid: message.isValid,
            executionTime: executionTime,
            transactionId: transactionId,
            timestamp: new Date().toISOString()
          };

          // Append result to JSON file
          appendResultToFile(result);

        } catch (error) {
          console.error("Failed to validate data:", error);
        }

        // Acknowledge the message as processed
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("Failed to listen to queue:", error);
  }
}

/**
 * Appends the given result object to a JSON file. If the file
 * doesn't exist or is empty, a new array will be created.
 */
function appendResultToFile(newResult) {
  let existingResults = [];

  // 1. Read existing file, if any
  try {
    if (fs.existsSync(RESULTS_FILE_PATH)) {
      const rawData = fs.readFileSync(RESULTS_FILE_PATH, "utf8");
      if (rawData.trim()) {
        existingResults = JSON.parse(rawData);
      }
    }
  } catch (err) {
    console.error("Error reading existing results file:", err);
  }

  // 2. Append the new result
  existingResults.push(newResult);

  // 3. Write updated array back to disk
  try {
    fs.writeFileSync(RESULTS_FILE_PATH, JSON.stringify(existingResults, null, 2));
    console.log("Appended result to file:", RESULTS_FILE_PATH);
  } catch (writeErr) {
    console.error("Error writing results file:", writeErr);
  }
}


// Start listening to the queue
listenToQueue();

process.on("SIGINT", async () => {
  console.log("Caught interrupt signal");
  await channel.close();
  await connection.close();
  process.exit();
});
