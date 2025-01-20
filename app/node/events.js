/*
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";

const { Gateway, Wallets } = require("fabric-network");
const fs = require("fs");
const path = require("path");
const { handleFabricToEthermintEvent } = require("./queue/producer");

let listener;
let contract;
async function main() {
  try {
    // load the network configuration
    const ccpPath = path.resolve(__dirname, ".", "connection.json");
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(
      __dirname,
      "../../vars/profiles/vscode/wallets",
      "org0.example.com"
    );
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the admin user.
    const identity = await wallet.get("Admin");
    if (!identity) {
      console.log("Admin identity can not be found in the wallet");
      return;
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: "Admin",
      discovery: { enabled: true, asLocalhost: true },
    });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork("channel1");

    // Get the contract from the network.
    contract = network.getContract("simple");


    // Set up an event listener for chaincode events
    listener = async (event) => {
        const payload = event.payload.toString('utf8');
        if (event.eventName === "DeviceRegistered") {
        }

        if (event.eventName === "DataSubmitted") {
            const result = JSON.parse(payload);
            await handleFabricToEthermintEvent(result)
            console.log(result)
        }    
    };

    // Register the event listener for the contract
    await contract.addContractListener(listener);
    console.log("Listening for transaction events...");

    process.stdin.resume();
  } catch (error) {
    console.error(`Failed to enroll admin user "admin": ${error}`);
    process.exit(1);
  }
}

main();

process.on("SIGINT", async () => {
  console.log("Caught interrupt signal");
  contract.removeContractListener(listener);
  console.log("Stopped watching events");
  process.exit();
});
