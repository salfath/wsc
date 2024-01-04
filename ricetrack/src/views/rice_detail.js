const m = require('mithril');
const api = require('../services/api');
const payloads = require('../services/payloads');
const { getPropertyValue } = require('../utils/records')
const { formatDateTime, formatDate, formatTimestamp, formatCurrency, formatLocation } = require('./formatUtils');
const { _answerProposal, ROLE_TO_ENUM } = require('./proposalUtils');
const { _agentByKey, _finalizeRecord } = require('./recordUtils');
const { show, BasicModal } = require('../components/modals');

const RiceDetail = {
    oninit(vnode) {
        vnode.state.record = null;
        vnode.state.agents = [];
        vnode.state.owner = null;
        vnode.state.custodian = null;
        _loadData(vnode.attrs.recordId, vnode.state);
        vnode.state.refreshId = setInterval(() => {
            _loadData(vnode.attrs.recordId, vnode.state);
        }, 60000);
    },

    onbeforeremove(vnode) {
        clearInterval(vnode.state.refreshId);
    },

    view(vnode) {
        if (!vnode.state.record) {
            return m('.alert-warning', `Loading ${vnode.attrs.recordId}`);
        }
        const record = vnode.state.record;
        const publicKey = api.getPublicKey();
        const isOwner = record.owner === publicKey;
        const isCustodian = record.custodian === publicKey;

        // check whether there is a proposal to answer for this user, whether proposal to be an owner, a custodian, or a reporter
        let proposalsToAnswer = record.proposals.filter(proposal => proposal.receivingAgent === publicKey);

        return m('.rice-detail',
            m('h3.text-center', record.recordId),
            // Menampilkan proposal yang perlu dijawab
            proposalsToAnswer.length > 0
                ? proposalsToAnswer.map(proposal =>
                    m('.proposal-to-answer',
                        m('p', `${_agentByKey(vnode.state.agents, proposal.issuingAgent).name} meminta Anda menjadi ${proposal.role.toLowerCase()} produk ini.`),
                        m('button.btn.btn-primary', {
                            onclick: () => {
                                _answerProposal(record, proposal.receivingAgent, ROLE_TO_ENUM[proposal.role.toLowerCase()], payloads.answerProposal.enum.ACCEPT)
                                    .then(() => {
                                        return _loadData(record.recordId, vnode.state); // Memuat data terbaru
                                    })
                                    .then(() => {
                                        m.redraw(); // Memperbarui UI setelah data dimuat
                                    })
                                    .catch(err => {
                                        console.error('Error while answering proposal:', err);
                                        // Handle error jika diperlukan
                                    });
                            }
                        }, 'Terima'),
                        m('button.btn.btn-danger', {
                            onclick: () => {
                                _answerProposal(record, proposal.receivingAgent, ROLE_TO_ENUM[proposal.role.toLowerCase()], payloads.answerProposal.enum.REJECT)
                                    .then(() => {
                                        return _loadData(record.recordId, vnode.state); // Memuat data terbaru
                                    })
                                    .then(() => {
                                        m.redraw(); // Memperbarui UI setelah data dimuat
                                    })
                                    .catch(err => {
                                        console.error('Error while answering proposal:', err);
                                        // Handle error jika diperlukan
                                    });
                            }
                        }, 'Tolak')
                    )
                )
                : null,
            _displayRecordDetails(record, vnode.state.owner, vnode.state.custodian),
            _displayInteractionButtons(record, publicKey, isOwner, isCustodian, vnode)
        );
    }
};

const _displayRecordDetails = (record, owner, custodian) => {
    return [
        _row(
            _labelProperty('Created', formatTimestamp(record.creationTime)),
            _labelProperty('Updated', formatTimestamp(record.updatedTime))
        ),
        _row(
            _labelProperty('Pemilik', _agentLink(owner)),
            _labelProperty('Kustodian', _agentLink(custodian))
        ),
        _row(
            _labelProperty('Tanggal Transaksi Terakhir', formatDateTime(getPropertyValue(record, 'tgltransaksi', 0))),
            _labelProperty('Kedaluwarsa', formatDate(getPropertyValue(record, 'kedaluwarsa', 0)))
        ),
        _row(
            _labelProperty('Varietas', getPropertyValue(record, 'varietas')),
            _labelProperty('Berat (kg)', getPropertyValue(record, 'berat', 0))
        ),
        _row(
            _labelProperty('Harga', formatCurrency(getPropertyValue(record, 'harga'))),
            _labelProperty('Lokasi', _propLink(record, 'lokasi', formatLocation(getPropertyValue(record, 'lokasi'))))

        )
    ];
};

const _displayInteractionButtons = (record, publicKey, isOwner, isCustodian, vnode) => {
    return m('.row.m-2',
        m('.col.text-center',
            [
                // isCustodian && m('button.btn.btn-primary', { onclick: () => m.route.set(`/update-properties/${record.recordId}`) }, 'Update Properties'),
                m('button.btn.btn-primary', { onclick: () => m.route.set(`/rice-updates/${record.recordId}`) }, 'Lacak'),
                isOwner && !record.final && m('button.btn.btn-primary', { onclick: () => m.route.set(`/transfer-ownership/${record.recordId}`) }, 'Jual'),
                isCustodian && !record.final && m('button.btn.btn-primary', { onclick: () => m.route.set(`/transfer-custodian/${record.recordId}`) }, 'Ubah Kustodian'),
                isOwner && !record.final && m('button.btn.btn-primary', { onclick: () => m.route.set(`/manage-reporters/${record.recordId}`) }, 'Kelola Reporter'),
                isOwner && !record.final && m('button.btn.btn-primary', { onclick: () => _finalizeWithConfirmation(vnode) }, 'Finalisasi')
            ]));
};

// Fungsi untuk menampilkan konfirmasi finalisasi
function _finalizeWithConfirmation(vnode) {
    show(BasicModal, {
        title: 'Konfirmasi Finalisasi',
        body: 'Apakah Anda yakin ingin menyelesaikan record ini? Tindakan ini tidak dapat dibatalkan.',
        acceptText: 'Ya',
        cancelText: 'Tidak'
    }).then(() => {
        // Use the record from the current vnode state
        _finalizeRecord(vnode.state.record)
            .then(() => {
                alert('Record successfully finalized');
                // Reload the data to reflect changes
                _loadData(vnode.attrs.recordId, vnode.state);
            })
            .catch(err => {
                console.error('Error finalizing record:', err);
                const errorMessage = err.response ? err.response.data.error : err.message;
                alert(`Error finalizing record: ${errorMessage}`);
            });
    })
        .catch(() => {
            console.log('Finalization cancelled');
        });
}

const _row = (...cols) => m('.row', cols.map((col) => m('.col', col)));
const _labelProperty = (label, value) => [m('dl', m('dt', label), m('dd', value))];
const _agentLink = (agent) => m(`a[href=/agents/${agent.key}]`, { oncreate: m.route.link }, agent.name);
const _propLink = (record, propName, content) =>
    m(`a[href=/properties/${record.recordId}/${propName}]`,
        { oncreate: m.route.link },
        content)

const _loadData = (recordId, state) => {
    return api.get(`records/${recordId}`)
        .then(record => Promise.all([record, api.get('agents')]))
        .then(([record, agents]) => {
            state.record = record;
            state.agents = agents;
            state.owner = agents.find(agent => agent.key === record.owner);
            state.custodian = agents.find(agent => agent.key === record.custodian);
        });
};

module.exports = RiceDetail;