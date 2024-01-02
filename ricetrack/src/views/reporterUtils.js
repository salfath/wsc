// reporterUtils.js
const payloads = require('../services/payloads');
const transactions = require('../services/transactions');

/**
 * Mengotorisasi seorang reporter untuk sebuah record.
 */
const _authorizeReporter = async (recordId, reporterKey, properties) => {
  let authorizePayload = payloads.createProposal({
    recordId: recordId,
    receivingAgent: reporterKey,
    role: payloads.createProposal.enum.REPORTER,
    properties: properties
  });

  try {
    await transactions.submit([authorizePayload], true);
    console.log('Successfully submitted reporter authorization proposal');
  } catch (error) {
    console.error('Failed to submit reporter authorization proposal:', error);
  }
};

/**
 * Mencabut otorisasi seorang reporter untuk sebuah record.
 */
const _revokeAuthorization = async (recordId, reporterKey, properties) => {
  console.log('Record ID:', recordId);
  console.log('Reporter Key:', reporterKey);
  console.log('Properties:', properties);

  let revokePayload = payloads.revokeReporter({
    recordId: recordId,
    reporterId: reporterKey,
    properties
  });

  try {
    await transactions.submit([revokePayload], true);
    console.log('Successfully revoked reporter authorization');
  } catch (error) {
    console.error('Failed to revoke reporter authorization:', error);
  }
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
