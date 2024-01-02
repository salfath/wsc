'use strict'

const m = require('mithril');
const api = require('../services/api');
const { _revokeAuthorization, _authorizeReporter, _reporters } = require('./reporterUtils');
const { _agentByKey } = require('./recordUtils')  

const _loadData = async (recordId, state) => {
  try {

    const record = await api.get(`records/${recordId}`);
    state.record = record;
    const agents = await api.get('agents');
    state.agents = agents;
    state.currentReporters =  getCurrentReporters(record);
    state.potentialReporters = getPotentialReporters(agents, record, state.currentReporters);

    // Trigger a redraw in Mithril
    m.redraw();
  } catch (error) {
    console.error('Error loading data:', error);
  }
};

const getCurrentReporters = (record) => {
  const publicKey = api.getPublicKey(); // Dapatkan public key pengguna saat ini
  const allReporters = _reporters(record);
  console.log('allReporters:', allReporters);
  return Object.entries(allReporters)
      .filter(([key, _]) => key !== publicKey && key !== record.owner)
      .map(([key, _]) => ({ key })); // Mengembalikan array objek dengan kunci
};

const getPotentialReporters = (agents, record, currentReporters) => {
const currentReporterKeys = new Set(currentReporters.map(reporter => reporter.key));

return agents.filter(agent =>
  !currentReporterKeys.has(agent.key) &&  // Memeriksa apakah kunci agen tidak ada di currentReporters
  agent.key !== record.owner &&
  agent.key !== record.custodian
);
};


const ManageReporters = {
  oninit(vnode) {
    vnode.state.recordId = vnode.attrs.recordId;
    vnode.state.currentReporters = [];
    vnode.state.potentialReporters = [];
    vnode.state.selectedReporterKey = null;

    _loadData(vnode.attrs.recordId, vnode.state).then(() => {
      // Set selectedReporterKey to the first potential reporter after data load
      if (vnode.state.potentialReporters.length > 0) {
        vnode.state.selectedReporterKey = vnode.state.potentialReporters[0].key;
      }
  })
  vnode.state.refreshId = setInterval(() => {
    _loadData(vnode.attrs.recordId, vnode.state);
  }, 2000);
  },

  onbeforeremove(vnode) {
    clearInterval(vnode.state.refreshId);
  },

  view(vnode) {
    if (!vnode.state.record) {
      return m('.alert-warning', 'Loading record data...');
    }

    const { recordId, potentialReporters, currentReporters, selectedReporterKey } = vnode.state;
    const selectedProperty = 'harga';

    console.log('recordId:', recordId);
    console.log('xselectedReporterKey:', selectedReporterKey);
    console.log('currentReporters:', currentReporters);
    console.log('potentialReporters:', potentialReporters);

    return m('.manage-reporters',
      [
        m('h1', 'Kelola Reporter'), // Main title
        m('h2', { style: { 'font-size': 'smaller' } }, `Record ID: ${recordId}`),
        m('h4', 'Current Reporters:'),
        currentReporters.map(reporter =>
          m('div',
            m('h6', `${_agentByKey(vnode.state.agents, reporter).name}`),
            m('button', { 
              onclick: () => {
                _revokeAuthorization(recordId, reporter, selectedProperty)
              _loadData(vnode.attrs.recordId, vnode.state)
            }
             }, 'Revoke')
          )
        ),
        m('h4', 'Add Reporters:'),
        potentialReporters.length > 0 && m('div',
          m('select', { 
            onchange: m.withAttr('value', value => vnode.state.selectedReporterKey = value),
            value: selectedReporterKey
          },
            potentialReporters.map(agent =>
              m('option', { value: agent.key }, agent.name)
            )
          ),
          m('button', {
            onclick: () => {
              _authorizeReporter(recordId, selectedReporterKey, selectedProperty)
              _loadData(vnode.attrs.recordId, vnode.state)
            }
          }, 'Authorize')
        )
      ]
    );
  }
}

module.exports = ManageReporters;
