'use strict'

const payloads = require('../services/payloads');
const transactions = require('../services/transactions');

// Authorizes a reporter for property lokasi
const authorizeReporter = (recordId, reporterKey, propertyName) => {
    let authorizePayload = payloads.createProposal({
        recordId: recordId,
        receivingAgent: reporterKey,
        role: payloads.createProposal.enum.REPORTER,
        properties: [propertyName]
    });

    return transactions.submit([authorizePayload], true)
        .then(() => {
            console.log('Successfully submitted proposal');
            alert('Reporter successfully authorized.');
        })
        .catch((error) => {
            // Attempt to parse the error message to extract the specific error
            try {
                const errorObj = JSON.parse(error.message);
                const specificErrorMessage = errorObj.error || "An unknown error occurred.";
                alert(`Failed to authorize reporter: ${specificErrorMessage}`);
            } catch (parseError) {
                // If parsing fails, fall back to a generic error message
                alert('Failed to authorize reporter due to an unexpected error.');
            }

            console.error('Error authorizing reporter:', error);
        });
};

// Revokes a reporter's authorization for a specific property
const revokeReporter = (recordId, reporterKey, propertyName, onSuccess) => {
    let revokePayload = payloads.revokeReporter({
        recordId: recordId,
        reporterId: reporterKey,
        properties: [propertyName]
    });

    return transactions.submit([revokePayload], true)
        .then(() => {
            console.log('Successfully revoked reporter');
            alert('Reporter authorization revoked.');
            if (onSuccess && typeof onSuccess === 'function') {
                onSuccess(); // Call the onSuccess callback function
            }
        })
        .catch((error) => {
            // Attempt to parse the error message to extract the specific error
            try {
                const errorObj = JSON.parse(error.message);
                const specificErrorMessage = errorObj.error || "An unknown error occurred.";
                alert(`Failed to revoke reporter: ${specificErrorMessage}`);
            } catch (parseError) {
                // If parsing fails, fall back to a generic error message
                alert('Failed to revoke reporter due to an unexpected error.');
            }

            console.error('Error revoking reporter:', error);
        });
};

// Finds an agent by their key
const agentByKey = (agents, key) => {
    return agents.find((agent) => agent.key === key) || { name: 'Unknown Agent' };
};

const reporters = (record, agents) => {
    console.log('Reporters function called with record:', record);
    console.log('Agents:', agents);

    // Return an empty array if record or record.properties is not available
    if (!record || !record.properties) {
        return [];
    }

    let reporterList = [];

    // Iterate over each property in the record
    record.properties.forEach(property => {
        // Only proceed if the property has reporters
        if (property.reporters) {
            // Iterate over each reporter key in the property
            property.reporters.forEach(reporterKey => {
                // Check if the reporter is already in the list
                let reporter = reporterList.find(r => r.key === reporterKey);

                // If the reporter is new, add them to the list
                if (!reporter) {
                    const agent = agentByKey(agents, reporterKey);
                    reporterList.push({ key: reporterKey, name: agent.name, properties: [property.name] });
                } else {
                    // If the reporter already exists, add this property to their list
                    reporter.properties.push(property.name);
                }
            });
        }
    });

    return reporterList;
};

module.exports = {
    agentByKey,
    reporters,
    authorizeReporter,
    revokeReporter
};
