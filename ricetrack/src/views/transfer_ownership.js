'use strict'

const m = require('mithril');
const payloads = require('../services/payloads');
const transactions = require('../services/transactions');
const api = require('../services/api');

const TransferOwnership = {
    oninit: (vnode) => {
        vnode.state.record = null;
        vnode.state.agents = [];
        vnode.state.selectedAgent = null;

        // Load the record and agents
        Promise.all([
            api.get(`records/${vnode.attrs.recordId}`),
            api.get('agents')
        ]).then(([record, agents]) => {
            vnode.state.record = record;
            vnode.state.agents = agents;
        });
    },

    view: (vnode) => {
        return m('.transfer-ownership',
            m('h2', 'Transfer Ownership'),
            m('select', {
                onchange: m.withAttr('value', (value) => {
                    vnode.state.selectedAgent = value;
                })
            },
            vnode.state.agents.map(agent =>
                m('option', { value: agent.key }, agent.name)
            )),
            m('button', {
                onclick: () => _submitTransfer(vnode)
            }, 'Transfer')
        );
    }
}

const _submitTransfer = (vnode) => {
    const transferPayload = payloads.createProposal({
        recordId: vnode.state.record.recordId,
        receivingAgent: vnode.state.selectedAgent,
        role: payloads.createProposal.enum.OWNER
    });

    transactions.submit([transferPayload], true)
        .then(() => {
            console.log('Successfully submitted transfer proposal');
            m.route.set('/'); // Redirect to home or another page after submission
        });
}

module.exports = TransferOwnership;
