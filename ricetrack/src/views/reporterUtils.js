// reporterUtils.js
const payloads = require('../services/payloads');
const transactions = require('../services/transactions');

/**
 * Mengotorisasi seorang reporter untuk sebuah record.
 */
const _authorizeReporter = (record, reporterKey, properties) => {
  let authorizePayload = payloads.createProposal({
    recordId: record.recordId,
    receivingAgent: reporterKey,
    role: payloads.createProposal.enum.REPORTER,
    properties: properties
  });

  return transactions.submit([authorizePayload], true).then(() => {
    console.log('Successfully submitted reporter authorization proposal');
  });
};

/**
 * Mencabut otorisasi seorang reporter untuk sebuah record.
 */
const _revokeAuthorization = (record, reporterKey, properties) => {
  let revokePayload = payloads.revokeReporter({
    recordId: record.recordId,
    reporterId: reporterKey,
    properties
  });

  return transactions.submit([revokePayload], true).then(() => {
    console.log('Successfully revoked reporter authorization');
  });
};

/**
 * Mengembalikan daftar reporter untuk sebuah record.
 */
const _reporters = (record) => {
  return record.properties.reduce((acc, property) => {
    return property.reporters.reduce((acc, key) => {
      let props = (acc[key] || []);
      props.push(property.name);
      acc[key] = props;
      return acc;
    }, acc);
  }, {});
};

module.exports = {
  _authorizeReporter,
  _revokeAuthorization,
  _reporters
};
