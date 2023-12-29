const m = require('mithril');
const payloads = require('../services/payloads');
const transactions = require('../services/transactions');

// Fungsi untuk memperbarui properti pada suatu rekaman
const _updateProperty = (record, propertyUpdate) => {
    const updatePayload = payloads.updateProperties({
        recordId: record.recordId,
        properties: [propertyUpdate]
    });

    return transactions.submit([updatePayload], true)
        .then(() => console.log('Successfully submitted property update'))
        .catch(error => console.error('Error in submitting property update:', error));
};

// Fungsi untuk menyelesaikan (finalize) suatu rekaman
const _finalizeRecord = (record) => {
    const finalizePayload = payloads.finalizeRecord({
        recordId: record.recordId
    });

    return transactions.submit([finalizePayload], true)
        .then(() => console.log('Successfully finalized record'))
        .catch(error => console.error('Error in finalizing record:', error));
};



const _agentByKey = (agents, key) =>
    agents.find((agent) => agent.key === key) || { name: 'Unknown Agent' }

module.exports = {
    _updateProperty,
    _finalizeRecord,
    _agentByKey,
};
