'use strict'

const m = require('mithril');
const moment = require('moment');
const payloads = require('../services/payloads');
const transactions = require('../services/transactions');
const api = require('../services/api');
const { _agentByKey } = require('./recordUtils')
const { _answerProposal, ROLE_TO_ENUM } = require('./proposalUtils');


const TransferCustodian = {
    oninit: async (vnode) => {
        vnode.state.record = null;
        vnode.state.agents = [];
        vnode.state.selectedAgent = null;
        vnode.state.custodian = '';
        vnode.state.proposals = [];
        vnode.state.publicKey = api.getPublicKey();

        await _loadData(vnode.attrs.recordId, vnode.state);

        vnode.state.refreshId = setInterval( async () => {
            await _loadData(vnode.attrs.recordId, vnode.state);
        }, 60000);
        vnode.state.selectedAgent = vnode.state.agents[0].key;
    },

    view: (vnode) => {

        const publicKey = vnode.state.publicKey;
        let proposalsToAnswer = vnode.state.proposals.filter(proposal =>
            (proposal.issuingAgent === publicKey) && (proposal.role.toLowerCase() === 'custodian'));
        let showNewCustodianForm = proposalsToAnswer.length === 0;
        console.log('Proposals to answer: ', proposalsToAnswer);

        return m('.transfer-custodian',
            proposalsToAnswer.length > 0
                ? proposalsToAnswer.map(proposal =>
                    m('.proposal-to-answer',
                        m('p', `Anda sudah meminta ${_agentByKey(vnode.state.agents, proposal.receivingAgent).name} menjadi Kustodian produk ini.`),
                        m('button.btn.btn-danger', {
                            onclick: async () => {
                                await _answerProposal(vnode.state.record, proposal.receivingAgent, ROLE_TO_ENUM[proposal.role.toLowerCase()], payloads.answerProposal.enum.CANCEL)
                                    .then( async () => {
                                        return await _loadData(vnode.attrs.recordId, vnode.state); // Memuat data terbaru
                                    })
                                    .then(() => {
                                        m.redraw(); // Memperbarui UI setelah data dimuat
                                    })
                                    .catch(err => {
                                        console.error('Error while answering proposal:', err);
                                        // Handle error jika diperlukan
                                    });
                            }
                        }, 'Batalkan'),
                        m('button.btn.btn-primary', {
                            onclick: () => {
                                window.history.back();
                            }
                        }, 'Kembali')
                    )
                )
                : null,
            showNewCustodianForm ? [
                m('h2', `Ubah Kustodian`),
                m('h2', { style: { 'font-size': 'smaller' } }, `${vnode.attrs.recordId}`),
                m('label', 'Kustodian Saat Ini: ' + vnode.state.custodian),                
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
                        onclick: async () => {
                            await _submitTransfer(vnode)
                            .then( async () => {
                                return await _loadData(vnode.attrs.recordId, vnode.state); // Memuat data terbaru
                            })
                            .then(() => {
                                m.redraw(); // Memperbarui UI setelah data dimuat
                            })
                            .catch(err => {
                                console.error('Error while answering proposal:', err);
                                // Handle error jika diperlukan
                            });
                        }
                    }, 'Ubah')
                )
            ] : null
        );
    }
}

const _submitTransfer = async (vnode) => {
    const transferPayload = payloads.createProposal({
        recordId: vnode.state.record.recordId,
        receivingAgent: vnode.state.selectedAgent,
        role: payloads.createProposal.enum.CUSTODIAN,
    });
    try {
        await transactions.submit([transferPayload], true);
        console.log('Successfully submitted transfer proposal');
        alert('Pengajuan ubah kustodian sudah selesai dilakukan. Menunggu konfirmasi.');
        window.history.back();
    } catch (err) {
        console.error('Failed to submit custodian transfer proposal:', err);
        alert('Failed to submit custodian transfer proposal.');
    }
};

const _loadData = async (recordId, state) => {
    const [record, agents] = await Promise.all([api.get(`records/${recordId}`), api.get('agents')]);
    state.record = record;
    state.proposals = record.proposals;
    state.agents = agents.filter(agent => agent.key !== record.custodian);
    state.custodian = _agentByKey(agents, record.custodian).name;

    m.redraw();
};

module.exports = TransferCustodian;
