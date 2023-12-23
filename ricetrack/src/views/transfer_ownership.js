'use strict'

const m = require('mithril');
const moment = require('moment');
const payloads = require('../services/payloads');
const transactions = require('../services/transactions');
const api = require('../services/api');
const parsing = require('../services/parsing');
const {getPropertyValue} = require('../utils/records')

const TransferOwnership = {
    oninit: (vnode) => {
        vnode.state.record = null;
        vnode.state.agents = [];
        vnode.state.selectedAgent = null;
        vnode.state.tgltransaksi = moment().format('YYYY-MM-DDTHH:mm');
        vnode.state.harga = '';

        // Load the record and agents
        Promise.all([
            api.get(`records/${vnode.attrs.recordId}`),
            api.get('agents')
        ]).then(([record, agents]) => {
            vnode.state.record = record;
            vnode.state.agents = agents.filter(agent => agent.key !== record.owner);
            vnode.state.harga = parseInt(getPropertyValue(record, 'harga', 0)).toLocaleString('id');
        });
    },

    view: (vnode) => {
        return m('.transfer-ownership',
            m('h2', `Penjualan ${vnode.attrs.recordId}`),
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
                m('label', 'Pilih Pembeli:'),
                m('select.form-control', {
                    onchange: m.withAttr('value', (value) => {
                        vnode.state.selectedAgent = value;
                    })
                }, vnode.state.agents.map(agent =>
                    m('option', { value: agent.key }, agent.name)
                ))
            ),
            m('.form-group',
                m('label', 'Harga (Rp):'),
                m('input.form-control', {
                    type: 'text',
                    value: vnode.state.harga,
                    onchange: m.withAttr('value', value => {
                        vnode.state.harga = value;
                    })
                })
            ),
            m('.form-group',
                m('button.btn.btn-primary', {
                    onclick: () => _submitTransfer(vnode)
                }, 'Jual')
            )
        );
    }
}

const _submitTransfer = (vnode) => {
    const timestamp = new Date(vnode.state.tgltransaksi).getTime();

    const harga = parsing.toInt(vnode.state.harga.replace(/[^0-9]/g, ''));

    const transferPayload = payloads.createProposal({
        recordId: vnode.state.record.recordId,
        receivingAgent: vnode.state.selectedAgent,
        role: payloads.createProposal.enum.OWNER,
        properties: [
            { name: 'tgltransaksi', intValue: timestamp },
            { name: 'harga', intValue: harga }
        ]
    });

    transactions.submit([transferPayload], true)
        .then(() => {
            console.log('Successfully submitted transfer proposal');
            alert('Penjualan sudah dilakukan. Menunggu konfirmasi dari pembeli.');
            m.route.set('/'); // Redirect after showing the message
        });
}

module.exports = TransferOwnership;
