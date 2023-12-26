'use strict'

const m = require('mithril');
const api = require('../services/api');
const { revokeReporter, authorizeReporter, reporters } = require('./reporterUtils');

const _loadData = async (recordId, component) => {
  try {
    console.log('Loading data for record:', recordId);

    const record = await api.get(`records/${recordId}`);
    component.record = record;

    console.log('Fetched record:', record);

    const agents = await api.get('agents');

    component.currentReporters = await getCurrentReporters(record, component);

    console.log('Current Reporters:', component.currentReporters);

    component.potentialReporters = getPotentialReporters(agents, record, component.currentReporters);
    console.log('Potential Reporters:', component.potentialReporters);

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
    vnode.state.currentReporters = [];
    _loadData(vnode.attrs.recordId, vnode.state);
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

    const { recordId, potentialReporters, currentReporters } = vnode.state;

    const selectedProperty = '[harga]';

    let selectedReporterKey = potentialReporters && potentialReporters.length > 0 ? potentialReporters[0].key : null;

    console.log('selectedReporterKey', selectedReporterKey);
    console.log('potentialReporters', potentialReporters);
    console.log('currentReporters', currentReporters);

    return m('.manage-reporters',
    currentReporters.map(reporter => 
        m('div',
          m('h3', `Reporter: ${reporter.name}`),
          m('button', { onclick: () => revokeReporter(recordId, key) }, 'Revoke')
        )
      ),
      selectedReporterKey.length > 0 && m('div',
        m('select', { onchange: m.withAttr('value', value => selectedReporterKey = value) },
          potentialReporters.map(agent =>
            m('option', { value: agent.key }, agent.name)
          )
        ),
        m('button', { onclick: () => authorizeReporter(recordId, selectedReporterKey, selectedProperty) }, 'Authorize')
      )
    );
  }
}

module.exports = ManageReporters;
