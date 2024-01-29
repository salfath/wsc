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
        vnode.state.harga = '';

        // Load the record and agents
        Promise.all([
            api.get(`records/${vnode.attrs.recordId}`),
            api.get('agents')
        ]).then(([record, agents]) => {
            vnode.state.record = record;
            vnode.state.agents = agents.filter(agent => agent.key !== record.owner);
            vnode.state.harga = parseInt(getPropertyValue(record, 'harga', 0)).toLocaleString('id');
            // Set the initial selected agent if agents are available
            if (vnode.state.agents.length > 0) {
                vnode.state.selectedAgent = vnode.state.agents[0].key;
            } else {
                // Handle the case where no agents are available
                vnode.state.selectedAgent = 'Tidak ada Agent yang tersedia'; // or set to null or any other default value
            }
        });
    },

    view: (vnode) => {
        return m('.transfer-ownership',
            m('h2', `Penjualan ${vnode.attrs.recordId}`),
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
    const harga = parsing.toInt(vnode.state.harga.replace(/[^0-9]/g, ''));

    const transferPayload = payloads.createProposal({
        recordId: vnode.state.record.recordId,
        receivingAgent: vnode.state.selectedAgent,
        role: payloads.createProposal.enum.OWNER,
        properties: [
            { name: 'harga', intValue: harga }
        ]
    });
    
    console.log('Mengirim proposal transfer dengan harga:', harga);
    console.log('Payload transfer:', transferPayload);

    transactions.submit([transferPayload], true)
        .then(() => {
            console.log('Successfully submitted transfer proposal');
            alert('Penjualan sudah dilakukan. Menunggu konfirmasi dari pembeli.');
            m.route.set('/'); // Redirect after showing the message
        });
}

module.exports = TransferOwnership;
