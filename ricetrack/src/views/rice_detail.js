
'use strict'

const m = require('mithril')
const moment = require('moment')
const truncate = require('lodash/truncate')

const {MultiSelect} = require('../components/forms')
const payloads = require('../services/payloads')
const parsing = require('../services/parsing')
const transactions = require('../services/transactions')
const api = require('../services/api')
const {
  getPropertyValue,
  getLatestPropertyUpdateTime,
  getOldestPropertyUpdateTime,
  isReporter
} = require('../utils/records')

const _formatDateTime = (timestamp) => {
  const seconds = timestamp / 1000 // Konversi dari milidetik ke detik
  return moment.unix(seconds).format('DD-MM-YYYY HH:mm')
}

const _formatDate = (timestamp) => {
  const seconds = timestamp / 1000; // Konversi dari milidetik ke detik
  return moment.unix(seconds).format('DD-MM-YYYY')
}

/**
 * Possible selection options
 */
const authorizableProperties = [
  ['lokasi', 'Lokasi'],
  ['harga', 'Harga'],
]

const _labelProperty = (label, value) => [
  m('dl',
    m('dt', label),
    m('dd', value))
]

const _row = (...cols) =>
  m('.row',
    cols
    .filter((col) => col !== null)
    .map((col) => m('.col', col)))

const TransferDropdown = {
  view (vnode) {
    // Default to no-op
    let onsuccess = vnode.attrs.onsuccess || (() => null)
    let record = vnode.attrs.record
    let role = vnode.attrs.role
    let publicKey = vnode.attrs.publicKey
    return [
      m('.dropdown',
        m('button.btn.btn-primary.btn-block.dropdown-toggle.text-left',
          { 'data-toggle': 'dropdown' },
          vnode.children),
        m('.dropdown-menu',
          vnode.attrs.agents.map(agent => {
            let proposal = _getProposal(record, agent.key, role)
            return [
              m("a.dropdown-item[href='#']", {
                onclick: (e) => {
                  e.preventDefault()
                  if (proposal && proposal.issuingAgent === publicKey) {
                    _answerProposal(record, agent.key, ROLE_TO_ENUM[role],
                                    payloads.answerProposal.enum.CANCEL)
                      .then(onsuccess)
                  } else {
                    _submitProposal(record, ROLE_TO_ENUM[role], agent.key)
                      .then(onsuccess)
                  }
                }
              }, m('span.text-truncate',
                   truncate(agent.name, { length: 32 }),
                   (proposal ? ' \u2718' : '')))
            ]
          })))
    ]
  }
}

const ROLE_TO_ENUM = {
  'owner': payloads.createProposal.enum.OWNER,
  'custodian': payloads.createProposal.enum.CUSTODIAN,
  'reporter': payloads.createProposal.enum.REPORTER
}

const TransferControl = {
  view (vnode) {
    let {record, agents, publicKey, role, label} = vnode.attrs
    if (record.final) {
      return null
    }

    let onsuccess = vnode.attrs.onsuccess || (() => null)
    if (record[role] === publicKey) {
      return [
        m(TransferDropdown, {
          publicKey,
          agents,
          record,
          role,
          onsuccess
        }, `Transfer ${label}`)
      ]
    } else if (_hasProposal(record, publicKey, role)) {
      return [
        m('.d-flex.justify-content-start',
          m('button.btn.btn-primary', {
            onclick: (e) => {
              e.preventDefault()
              _answerProposal(record, publicKey, ROLE_TO_ENUM[role],
                              payloads.answerProposal.enum.ACCEPT)

                .then(onsuccess)
            }
          },
          `Accept ${label}`),
          m('button.btn.btn-danger.ml-auto', {
            onclick: (e) => {
              e.preventDefault()
              _answerProposal(record, publicKey, ROLE_TO_ENUM[role],
                              payloads.answerProposal.enum.REJECT)
                .then(onsuccess)
            }
          },
          `Reject`))
      ]
    } else {
      return null
    }
  }
}

const _getProposal = (record, receivingAgent, role) =>
  record.proposals.find(
    (proposal) => (proposal.role.toLowerCase() === role && proposal.receivingAgent === receivingAgent))

const _hasProposal = (record, receivingAgent, role) =>
  !!_getProposal(record, receivingAgent, role)

const ReporterControl = {
  view (vnode) {
    let {record, agents, publicKey} = vnode.attrs
    if (record.final) {
      return null
    }

    let onsuccess = vnode.attrs.onsuccess || (() => null)
    if (record.owner === publicKey) {
      return [
        m(AuthorizeReporter, {
          record,
          agents,
          onsubmit: ([publicKey, properties]) =>
          _authorizeReporter(record, publicKey, properties).then(onsuccess)
        }),

        // Outstanding reporters
        Object.entries(_reporters(record))
        .filter(([key, _]) => key !== publicKey)
        .map(([key, properties]) => {
          return [
            m('.mt-2.d-flex.justify-content-start',
              `${_agentByKey(agents, key).name} authorized for ${properties}`,
              m('.button.btn.btn-outline-danger.ml-auto', {
                onclick: (e) => {
                  e.preventDefault()
                  _revokeAuthorization(record, key, properties)
                    .then(onsuccess)
                }
              },
              'Hapus izin'))
          ]
        }),

        // Pending authorizations
        record.proposals.filter((p) => p.role === 'REPORTER' && p.issuingAgent === publicKey).map(
          (p) =>
            m('.mt-2.d-flex.justify-content-start',
              `Pending proposal for ${_agentByKey(agents, p.receivingAgent).name} on ${p.properties}`,
              m('.button.btn.btn-outline-danger.ml-auto',
                {
                  onclick: (e) => {
                    e.preventDefault()
                    _answerProposal(record, p.receivingAgent, ROLE_TO_ENUM['reporter'],
                                    payloads.answerProposal.enum.CANCEL)
                      .then(onsuccess)
                  }
                },
                'Tolak permintaan')))

      ]
    } else if (_hasProposal(record, publicKey, 'reporter')) {
      let proposal = _getProposal(record, publicKey, 'reporter')
      return [
        m('.d-flex.justify-content-start',
          m('button.btn.btn-primary', {
            onclick: (e) => {
              e.preventDefault()
              _answerProposal(record, publicKey, ROLE_TO_ENUM['reporter'],
                              payloads.answerProposal.enum.ACCEPT)
                .then(onsuccess)
            }
          },
          `Accept Reporting Authorization for ${proposal.properties}`),
          m('button.btn.btn-danger.ml-auto', {
            onclick: (e) => {
              e.preventDefault()
              _answerProposal(record, publicKey, ROLE_TO_ENUM['reporter'],
                              payloads.answerProposal.enum.REJECT)
                .then(onsuccess)
            }
          },
          `Menolak`))
      ]
    } else {
      return null
    }
  }
}

/**
 * Returns a map of reporter key, to authorized fields
 */
const _reporters = (record) =>
  record.properties.reduce((acc, property) => {
    return property.reporters.reduce((acc, key) => {
      let props = (acc[key] || [])
      props.push(property.name)
      acc[key] = props
      return acc
    }, acc)
  }, {})

const _agentByKey = (agents, key) =>
  agents.find((agent) => agent.key === key) || { name: 'Unknown Agent' }

const _agentLink = (agent) =>
  m(`a[href=/agents/${agent.key}]`,
    { oncreate: m.route.link },
    agent.name)

const _propLink = (record, propName, content) =>
  m(`a[href=/properties/${record.recordId}/${propName}]`,
    { oncreate: m.route.link },
    content)

const ReportLocation = {
  oninit: (vnode) => {
    // Initialize the state with empty values
    vnode.state.latitude = '';
    vnode.state.longitude = '';

    // Function to get current location
    const getCurrentLocation = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
          vnode.state.latitude = position.coords.latitude.toFixed(6);
          vnode.state.longitude = position.coords.longitude.toFixed(6);
          m.redraw(); // Redraw the component with new state values
        }, (error) => {
          console.error('Error getting location:', error);
          vnode.state.latitude = '';
          vnode.state.longitude = '';
        });
      } else {
        console.error('Geolocation is not supported by this browser.');
      }
    };

    // Get the current location
    getCurrentLocation();
  },

  view: (vnode) => {
    let onsuccess = vnode.attrs.onsuccess || (() => null)
    return [
      m('form', {
        onsubmit: (e) => {
          e.preventDefault()
          _updateProperty(vnode.attrs.record, {
            name: 'lokasi',
            locationValue: {
              latitude: parsing.toInt(vnode.state.latitude),
              longitude: parsing.toInt(vnode.state.longitude)
            },
            dataType: payloads.updateProperties.enum.LOCATION
          }).then(() => {
            vnode.state.latitude = ''
            vnode.state.longitude = ''
          })
          .then(onsuccess)
        }
      },
      m('.form-row',
        m('.form-group.col-5',
          m('label.sr-only', { 'for': 'latitude' }, 'Garis Lintang'),
          m("input.form-control[type='text']", {
            name: 'latitude',
            type: 'number',
            step: 'any',
            min: -90,
            max: 90,
            value: vnode.state.latitude,
            onchange: m.withAttr('value', (value) => {
              vnode.state.latitude = value
            }),
          })),
        m('.form-group.col-5',
          m('label.sr-only', { 'for': 'longitude' }, 'Garis Bujur'),
          m("input.form-control[type='text']", {
            name: 'longitude',
            type: 'number',
            step: 'any',
            min: -180,
            max: 180,
            value: vnode.state.longitude,
            onchange: m.withAttr('value', (value) => {
              vnode.state.longitude = value
            }),
            //value: vnode.state.longitude,
            //placeholder: 'Longitude..'
          })),

        m('.col-2',
          m('button.btn.btn-primary', 'Memperbarui'))))
    ]
  }
}

const AuthorizeReporter = {
  oninit (vnode) {
    vnode.state.properties = []
  },

  view (vnode) {
    return [
      _row(m('strong', 'Otorisasi Reporter')),
      m('.row',
        m('.col-6',
          m('input.form-control', {
            type: 'text',
            placeholder: 'Tambahkan Reporter berdasarkan nama atau kunci publik..',
            value: vnode.state.reporter,
            oninput: m.withAttr('value', (value) => {
              // clear any previously matched values
              vnode.state.reporterKey = null
              vnode.state.reporter = value
              let reporter = vnode.attrs.agents.find(
                (agent) => agent.name === value || agent.key === value)
              if (reporter) {
                vnode.state.reporterKey = reporter.key
              }
            })
          })),

        m('.col-4',
          m(MultiSelect, {
            label: 'Pilih izin',
            color: 'primary',
            options: authorizableProperties,
            selected: vnode.state.properties,
            onchange: (selection) => {
              vnode.state.properties = selection
            }
          })),

        m('.col-2',
          m('button.btn.btn-primary',
            {
              disabled: (!vnode.state.reporterKey || vnode.state.properties.length === 0),
              onclick: (e) => {
                e.preventDefault()
                vnode.attrs.onsubmit([vnode.state.reporterKey, vnode.state.properties])
                vnode.state.reporterKey = null
                vnode.state.reporter = null
                vnode.state.properties = []
              }
            },
            'Mengizinkan')))
    ]
  }
}

const RiceDetail = {
  oninit (vnode) {
    _loadData(vnode.attrs.recordId, vnode.state)
    vnode.state.refreshId = setInterval(() => {
      _loadData(vnode.attrs.recordId, vnode.state)
    }, 2000)
  },

  onbeforeremove (vnode) {
    clearInterval(vnode.state.refreshId)
  },

  view (vnode) {
    if (!vnode.state.record) {
      return m('.alert-warning', `Loading ${vnode.attrs.recordId}`)
    }

    let publicKey = api.getPublicKey()
    let owner = vnode.state.owner
    let custodian = vnode.state.custodian
    let record = vnode.state.record
    return [
      m('.rice-detail',
        m('h1.text-center', record.recordId),
        _row(
          _labelProperty('Dibuat',
                         _formatTimestamp(getOldestPropertyUpdateTime(record))),
          _labelProperty('Diperbarui',
                         _formatTimestamp(getLatestPropertyUpdateTime(record)))),

        _row(
          _labelProperty('Pemilik', _agentLink(owner)),
          _labelProperty('Administrator', _agentLink(custodian))),

        _row(
          _labelProperty('Tanggal Transaksi Terakhir', _formatDateTime(getPropertyValue(record, 'tgltransaksi', 0))),
          _labelProperty('Kedaluwarsa', _formatDate(getPropertyValue(record, 'kedaluwarsa', 0)))),
    
        _row(
          _labelProperty('Varietas', getPropertyValue(record, 'varietas')),
          _labelProperty('Berat (kg)', getPropertyValue(record, 'berat', 0))),

        _row(
          _labelProperty(
            'Harga', vnode.state.record ? _formatValue(vnode.state.record, 'harga') : 'Loading...'),
          _labelProperty(
            'Lokasi',
            _propLink(record, 'lokasi', _formatLocation(getPropertyValue(record, 'lokasi'))))),
         
        _row(m(ReporterControl, {
          record,
          publicKey,
          agents: vnode.state.agents,
          onsuccess: () => _loadData(vnode.attrs.recordId, vnode.state)
        })),

        ((record.owner === publicKey && !record.final)
         ? m('.row.m-2',
             m('.col.text-center',
               m('button.btn.btn-danger', {
                 onclick: (e) => {
                   e.preventDefault()
                   _finalizeRecord(record).then(() =>
                     _loadData(vnode.attrs.recordId, vnode.state))
                 }
               },
               'Menyelesaikan')))
         : ''),

        m(TransferControl, {
          publicKey,
          record,
          agents: vnode.state.agents,
          role: 'custodian',
          label: 'Administrator',
          onsuccess: () => _loadData(vnode.attrs.recordId, vnode.state)
        }),

         m('button.btn.btn-primary', {
          onclick: () => m.route.set(`/transfer-ownership/${vnode.state.record.recordId}`)
      }, 'Jual')
       )
    ]
  }
}

const _formatValue = (record, propName) => {
  let prop = getPropertyValue(record, propName)
  if (prop) {
    return `Rp ${parseInt(prop).toLocaleString('id')}`;
  } else {
    return 'N/A'
  }
}

const _formatLocation = (lokasi) => {
  if (lokasi && lokasi.latitude !== undefined && lokasi.longitude !== undefined) {
    let latitude = parsing.toFloat(lokasi.latitude)
    let longitude = parsing.toFloat(lokasi.longitude)
    return `${latitude}, ${longitude}`
  } else {
    return 'Unknown'
  }
}

const _formatTimestamp = (sec) => {
  if (!sec) {
    sec = Date.now() / 1000
  }
  return moment.unix(sec).format('YYYY-MM-DD')
}

const _loadData = (recordId, state) => {
  let publicKey = api.getPublicKey()
  return api.get(`records/${recordId}`)
  .then(record =>
    Promise.all([
      record,
      api.get('agents')]))
  .then(([record, agents, owner, custodian]) => {
    state.record = record
    state.agents = agents.filter((agent) => agent.key !== publicKey)
    state.owner = agents.find((agent) => agent.key === record.owner)
    state.custodian = agents.find((agent) => agent.key === record.custodian)
  })
}

const _submitProposal = (record, role, publicKey) => {
  let transferPayload = payloads.createProposal({
    recordId: record.recordId,
    receivingAgent: publicKey,
    role: role
  })

  return transactions.submit([transferPayload], true).then(() => {
    console.log('Successfully submitted proposal')
  })
}

const _answerProposal = (record, publicKey, role, response) => {
  let answerPayload = payloads.answerProposal({
    recordId: record.recordId,
    receivingAgent: publicKey,
    role,
    response
  })

  return transactions.submit([answerPayload], true).then(() => {
    console.log('Successfully submitted answer')
  })
}

const _updateProperty = (record, value) => {
  let updatePayload = payloads.updateProperties({
    recordId: record.recordId,
    properties: [value]
  })

  return transactions.submit([updatePayload], true).then(() => {
    console.log('Successfully submitted property update')
  })
}

const _finalizeRecord = (record) => {
  let finalizePayload = payloads.finalizeRecord({
    recordId: record.recordId
  })

  return transactions.submit([finalizePayload], true).then(() => {
    console.log('finalized')
  })
}

const _authorizeReporter = (record, reporterKey, properties) => {
  let authroizePayload = payloads.createProposal({
    recordId: record.recordId,
    receivingAgent: reporterKey,
    role: payloads.createProposal.enum.REPORTER,
    properties: properties
  })

  return transactions.submit([authroizePayload], true).then(() => {
    console.log('Successfully submitted proposal')
  })
}

const _revokeAuthorization = (record, reporterKey, properties) => {
  let revokePayload = payloads.revokeReporter({
    recordId: record.recordId,
    reporterId: reporterKey,
    properties
  })

  return transactions.submit([revokePayload], true).then(() => {
    console.log('Successfully revoked reporter')
  })
}

module.exports = RiceDetail
