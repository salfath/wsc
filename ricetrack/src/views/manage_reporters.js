'use strict'

const m = require('mithril');
const api = require('../services/api');
const { revokeReporter, authorizeReporter, reporters } = require('./reporterUtils');

const _loadData = async (recordId, component) => {
  try {

    const record = await api.get(`records/${recordId}`);
    component.record = record;
    const agents = await api.get('agents');

    component.currentReporters = await getCurrentReporters(record, component);

    component.potentialReporters = getPotentialReporters(agents, record, component.currentReporters);

    // Trigger a redraw in Mithril
    m.redraw();
  } catch (error) {
    console.error('Error loading data:', error);
  }
};

const getCurrentReporters = async (record, component) => {
  try {
    const agents = await api.get('agents');
    const publicKey = await api.getPublicKey();
    return reporters(record, agents).filter(reporter =>
      reporter.key !== publicKey &&
      reporter.key !== record.owner &&
      reporter.key !== record.custodian
    );
  } catch (error) {
    console.error('Error in getCurrentReporters:', error);
    throw error;
  }
};


const getPotentialReporters = (agents, record, currentReporters) => {
  const currentReporterKeys = currentReporters.map(reporter => reporter.key);
  const publicKey = api.getPublicKey();

  return agents.filter(agent =>
    !currentReporterKeys.includes(agent.key) &&
    agent.key !== record.owner &&
    agent.key !== record.custodian &&
    agent.key !== publicKey
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

    return m('.manage-reporters',
      [
        m('h1', 'Kelola Reporter'), // Main title
        m('h2', { style: { 'font-size': 'smaller' } }, `Record ID: ${recordId}`),
        m('h4', 'Current Reporters:'),
        currentReporters.map(reporter =>
          m('div',
            m('h6', `${reporter.name}`),
            m('button', { 
              onclick: () => {
              revokeReporter(recordId, reporter.key, selectedProperty)
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
              authorizeReporter(recordId, selectedReporterKey, selectedProperty)
              _loadData(vnode.attrs.recordId, vnode.state)
            }
          }, 'Authorize')
        )
      ]
    );
  }
}

module.exports = ManageReporters;
