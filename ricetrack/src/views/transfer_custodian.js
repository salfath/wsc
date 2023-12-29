'use strict'

const m = require('mithril');
const moment = require('moment');
const payloads = require('../services/payloads');
const transactions = require('../services/transactions');
const api = require('../services/api');
const parsing = require('../services/parsing');
const {getPropertyValue} = require('../utils/records');
const {_agentByKey} = require('./recordUtils')

const TransferCustodian = {
    oninit: (vnode) => {
        vnode.state.record = null;
        vnode.state.agents = [];
        vnode.state.selectedAgent = null;
        vnode.state.custodian = '';
        vnode.state.tgltransaksi = moment().format('YYYY-MM-DDTHH:mm');

        // Load the record and agents
        Promise.all([
            api.get(`records/${vnode.attrs.recordId}`),
            api.get('agents')
        ]).then(([record, agents]) => {
            vnode.state.record = record;
            vnode.state.agents = agents.filter(agent => agent.key !== record.owner && agent.key !== record.custodian);
            vnode.state.custodian = _agentByKey(agents, record.custodian).name;
        });
    },

    view: (vnode) => {
        return m('.transfer-custodian',
            m('h2', `Ubah Kustodian`),
            m('h2', { style: { 'font-size': 'smaller' } }, `${vnode.attrs.recordId}`),
            m('label', 'Kustodian Saat Ini: ' + vnode.state.custodian),
            m('.form-group',
                m('label', 'Tanggal Transaksi:'),
                m('input.form-control', {
                    type: 'datetime-local',
                    value: vnode.state.tgltransaksi,
                    onchange: m.withAttr('value', value => {
                        vnode.state.tgltransaksi = value;
                    })
                })
            ),
            m('.form-group',
                m('label', 'Pilih Kustodian Baru: '),
                m('select.form-control', {
                    onchange: m.withAttr('value', (value) => {
                        vnode.state.selectedAgent = value;
                    })
                }, vnode.state.agents.map(agent =>
                    m('option', { value: agent.key }, agent.name)
                ))
            ),
            m('.form-group',
                m('button.btn.btn-primary', {
                    onclick: () => _submitTransfer(vnode)
                }, 'Ubah')
            )
        );
    }
}

const _submitTransfer = (vnode) => {
    const timestamp = new Date(vnode.state.tgltransaksi).getTime();

    const transferPayload = payloads.createProposal({
        recordId: vnode.state.record.recordId,
        receivingAgent: vnode.state.selectedAgent,
        role: payloads.createProposal.enum.CUSTODIAN,
        properties: [
            { name: 'tgltransaksi', intValue: timestamp },
        ]
    });

    transactions.submit([transferPayload], true)
        .then(() => {
            console.log('Successfully submitted transfer proposal');
            alert('Pengajuan ubah kustodian sudah selesai dilakukan. Menunggu konfirmasi.');
            m.route.set('/'); // Redirect after showing the message
        });
}

module.exports = TransferCustodian;
