/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const {loadContractOrg1} = require('./utils/loadContract');
const { saveTransactions,generateTransactions } = require('./utils/generateTxs');

async function main() {
    try {

        const txs = generateTransactions(5);
        await saveTransactions(txs, 'transactions1.json');

        const {gateway, contract} = await loadContractOrg1();

        for (const tx of txs) {
            
            // Create the transaction
            const transaction = contract.createTransaction('RegisterDevice'); // Replace with your chaincode function
            
            // Get the transaction ID from the transaction context
            const transactionId = transaction.getTransactionId();
            console.log(`Transaction ID: ${transactionId}`);
            
            // Submit the transaction with arguments
            await transaction.submit(`${tx.deviceID}`, `${tx.owner}`, `${tx.location}`);
            console.log(`Transaction has been submitted`);
        }

        for (const tx of txs) {
            
            // Create the transaction
            const transaction = contract.createTransaction('SubmitData'); // Replace with your chaincode function
            
            // Get the transaction ID from the transaction context
            const transactionId = transaction.getTransactionId();
            console.log(`Transaction ID: ${transactionId}`);
            
            // Submit the transaction with arguments
            await transaction.submit(`${tx.deviceID}`, `${tx.dataHash}`);
            console.log(`Transaction has been submitted`);
        }


        // Disconnect from the gateway.
        gateway.disconnect();

    } catch (error) {
        console.error(`Failed to enroll admin user "admin": ${error}`);
        process.exit(1);
    }
}

main();