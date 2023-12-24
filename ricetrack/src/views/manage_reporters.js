'use strict'

const m = require('mithril')
const payloads = require('../services/payloads')
const transactions = require('../services/transactions')
const api = require('../services/api')

// Constants and utility functions from the original rice_detail.js
const authorizableProperties = [
  ['lokasi', 'Lokasi'],
  ['harga', 'Harga'],
];

const _reporters = (record) => {
  return record.properties.reduce((acc, property) => {
    return property.reporters.reduce((acc, key) => {
      let props = (acc[key] || [])
      props.push(property.name)
      acc[key] = props
      return acc
    }, acc)
  }, {})
}

const _agentByKey = (agents, key) =>
  agents.find((agent) => agent.key === key) || { name: 'Unknown Agent' }

const loadRecordData = (recordId, component) => {
  api.get(`records/${recordId}`)
    .then((record) => {
      component.record = record;
      component.reportersList = _reporters(record);
      return api.get('agents');
    })
    .then((agents) => {
      component.agents = agents;
      m.redraw();
    })
    .catch((error) => {
      console.error('Error loading data:', error);
      alert('Failed to load record data. Please try again.');
    });
};

const ManageReporters = {
  oninit: (vnode) => {
    this.recordId = vnode.attrs.recordId
    loadRecordData(this.recordId, this);
  },

  view: () => {
    if (!this.record) {
      return m('.alert-warning', `Loading record data...`)
    }

    return m('.manage-reporters',
      m('h1', `Kelola reporter produk: ${this.recordId}`),

      // Displaying aggregated reporters and their authorized properties
      Object.entries(this.reportersList).map(([key, properties]) => {
        let reporter = _agentByKey(this.agents, key)
        return m('div',
          m('h3', `Reporter: ${reporter.name}`),
          m('ul',
            properties.map(property =>
              m('li', `${property}`))
          )
        )
      }),

      this.record.properties.map((property) => {
        return m('.property',
          m('h3', `Property: ${property.name}`),
          m('ul',
            property.reporters.map((reporterKey) => {
              let reporter = _agentByKey(this.agents, reporterKey)
              return m('li',
                `${reporter.name} `,
                m('button', {
                  onclick: () => this.revokeReporter(reporterKey, property.name)
                }, 'Revoke')
              )
            }),
            m('li',
              m('button', {
                onclick: () => this.authorizeReporter(property.name)
              }, 'Authorize New Reporter')
            )
          )
        )
      }),

      // Additional UI for selecting a reporter and properties
      // Similar to AuthorizeReporter component in rice_detail.js
      m('div',
        m('input[type=text]', {
          placeholder: 'Reporter Key or Name',
          oninput: m.withAttr('value', (value) => this.selectedReporterKey = value)
        }),
        m('select',
          { onchange: m.withAttr('value', (value) => this.selectedProperty = value) },
          authorizableProperties.map(([key, label]) =>
            m('option', { value: key }, label)
          )
        ),
        m('button', {
          onclick: () => this.authorizeReporter(this.selectedReporterKey, this.selectedProperty)
        }, 'Authorize')
      )
    )
  }
}

authorizeReporter: (reporterKey, propertyName) => {
  let authorizePayload = payloads.createProposal({
    recordId: this.recordId,
    receivingAgent: reporterKey,
    role: payloads.createProposal.enum.REPORTER,
    properties: [propertyName]
  })

  return transactions.submit([authorizePayload], true)
    .then(() => {
      console.log('Successfully submitted proposal')
      alert('Reporter successfully authorized.')
      this.loadRecordData() // Reload data to update UI
    })
    .catch((error) => {
      console.error('Error authorizing reporter:', error)
      alert('Failed to authorize reporter. Please try again.')
    })
}

revokeReporter: (reporterKey, propertyName) => {
  let revokePayload = payloads.revokeReporter({
    recordId: this.recordId,
    reporterId: reporterKey,
    properties: [propertyName]
  })

  return transactions.submit([revokePayload], true)
    .then(() => {
      console.log('Successfully revoked reporter')
      alert('Reporter authorization revoked.')
      this.loadRecordData() // Reload data to update UI
    })
    .catch((error) => {
      console.error('Error revoking reporter:', error)
      alert('Failed to revoke reporter. Please try again.')
    })
}

module.exports = ManageReporters
