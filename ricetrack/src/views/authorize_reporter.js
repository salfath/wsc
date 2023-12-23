'use strict'

const m = require('mithril')
const {MultiSelect} = require('../components/forms')
const payloads = require('../services/payloads')
const transactions = require('../services/transactions')
const api = require('../services/api')

// Additional imports or functions needed for AuthorizeReporter

const AuthorizeReporterPage = {
  oninit: (vnode) => {
    vnode.state.reporterKey = null
    vnode.state.reporter = null
    vnode.state.properties = []

    // Load any necessary data or perform any initialization
  },

  view: (vnode) => {
    return m('.authorize-reporter-page', [
      // The AuthorizeReporter component and any other UI elements

      m(AuthorizeReporter, {
        onsubmit: ([publicKey, properties]) => _authorizeReporter(publicKey, properties)
      })
    ])
  }
}

const AuthorizeReporter = {
  // ... The existing AuthorizeReporter component code
}

const _authorizeReporter = (reporterKey, properties) => {
  // ... The existing _authorizeReporter function code
}

// Include any other functions or helpers used by AuthorizeReporter

module.exports = AuthorizeReporterPage
