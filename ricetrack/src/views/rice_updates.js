const m = require('mithril')
const api = require('../services/api')
const { getPropertyValue, getPropertyUpdates } = require('../utils/records')

const RiceUpdates = {
  oninit: (vnode) => {
    console.log("Initializing RiceUpdates with recordId:", vnode.attrs.recordId)
    vnode.state.updates = []
    const recordId = vnode.attrs.recordId

    console.log("Fetching record details for:", recordId)

    // Fetch the record details
    api.get(`records/${recordId}`)
      .then(record => {
        vnode.state.updates = getPropertyUpdates(record)
        console.log("Received record data:", record)
      })
  },

  view: (vnode) => {
    return m('div', [
      m('h2', 'Updates History'),
      m('ul', vnode.state.updates.map(update => {
        return m('li', `${update.propertyName} updated at ${update.timestamp} with value ${update.value}`)
      }))
    ])
  }
}

module.exports = RiceUpdates
