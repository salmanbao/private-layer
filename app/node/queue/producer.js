const amqp = require("amqplib");
const {
  ETHERMINT_TO_FABRIC_QUEUE,
  FABRIC_TO_ETHERMINT_QUEUE,
} = require("../utils/constants");

async function sendToQueue(message, queueName) {
  try {
    // Connect to RabbitMQ server
    const connection = await amqp.connect("amqp://localhost:5672");
    const channel = await connection.createChannel();

    // Ensure the queue exists
    await channel.assertQueue(queueName, { durable: true });

    // Send message to the queue
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)));
    console.log(`Sent message to the queue ${queueName}:`, message);

    // Close the connection and channel
    await channel.close();
    await connection.close();
  } catch (error) {
    console.error("Failed to send message to queue:", error);
  }
}

// Example of sending a message when an event is triggered
async function handleFabricToEthermintEvent(event) {
  await sendToQueue(event, FABRIC_TO_ETHERMINT_QUEUE);
}

async function handleEthermintToFabricEvent(event) {
  await sendToQueue(event, ETHERMINT_TO_FABRIC_QUEUE);
}

module.exports = {
  handleFabricToEthermintEvent,
  handleEthermintToFabricEvent,
};
