// proposalUtils.js
const payloads = require('../services/payloads');
const transactions = require('../services/transactions');

const ROLE_TO_ENUM = {
  'owner': payloads.createProposal.enum.OWNER,
  'custodian': payloads.createProposal.enum.CUSTODIAN,
  'reporter': payloads.createProposal.enum.REPORTER
};

/**
 * Mendapatkan proposal berdasarkan agent, record, dan role.
 */
const _getProposal = (record, receivingAgent, role) => {
  if (!record.proposals) {
    return null;
  }

  return record.proposals.find(
    (proposal) => {
      return (proposal.role.toLowerCase() === role.toLowerCase() && proposal.receivingAgent === receivingAgent)
    }
  );
};

/**
 * Menentukan apakah terdapat proposal yang aktif.
 */
const _hasProposal = (record, receivingAgent, role) => {
  return !!_getProposal(record, receivingAgent, role);
};

/**
 * Mengajukan proposal baru.
 */
const _submitProposal = (record, role, publicKey) => {
  let transferPayload = payloads.createProposal({
    recordId: record.recordId,
    receivingAgent: publicKey,
    role: role
  });

  return transactions.submit([transferPayload], true).then(() => {
    console.log('Successfully submitted proposal');
  });
};

/**
 * Menjawab proposal yang ada.
 */
const _answerProposal = (record, publicKey, role, response) => {
  let answerPayload = payloads.answerProposal({
    recordId: record.recordId,
    receivingAgent: publicKey,
    role,
    response
  });

  return transactions.submit([answerPayload], true).then(() => {
    console.log('Successfully submitted answer');
  });
};

module.exports = {
  _getProposal,
  _hasProposal,
  _submitProposal,
  _answerProposal,
  ROLE_TO_ENUM
};
