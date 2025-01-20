const amqp = require("amqplib");
const { loadContract } = require("../utils/loadContract");
const { ETHERMINT_TO_FABRIC_QUEUE } = require("../utils/constants");
const {TextDecoder} = require('util');

const utf8Decoder = new TextDecoder();
let connection;
let channel;
async function listenToQueue() {
  try {
    const { contract } = await loadContract();
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

          console.log(`Execution time: ${endTimestamp - timestamp} seconds`);

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

// Start listening to the queue
listenToQueue();

process.on("SIGINT", async () => {
  console.log("Caught interrupt signal");
  await channel.close();
  await connection.close();
  process.exit();
});
