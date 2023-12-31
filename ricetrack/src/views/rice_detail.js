const m = require('mithril');
const api = require('../services/api');
const payloads = require('../services/payloads');
const { getPropertyValue } = require('../utils/records')
const { _formatDateTime, _formatDate, _formatTimestamp, _formatPrice, _formatLocation } = require('./formatUtils');
const { _hasProposal, _getProposal, _answerProposal, ROLE_TO_ENUM } = require('./proposalUtils');
const { _finalizeRecord, _agentByKey } = require('./recordUtils');
const { show, BasicModal } = require('../components/modals');

const RiceDetail = {
    oninit(vnode) {
        vnode.state.record = null;
        vnode.state.agents = [];
        vnode.state.owner = null;
        vnode.state.custodian = null;
        vnode.state.role = ''
        vnode.state.proposal = null;


        api.get('agents')
            .then(agents => {
                vnode.state.agents = agents;
            })
            .catch(error => {
                console.error('Error loading agents:', error);
            });

        _loadData(vnode.attrs.recordId, vnode.state);
        vnode.state.refreshId = setInterval(() => {
            _loadData(vnode.attrs.recordId, vnode.state);
        }, 60000);
    },

    onbeforeremove(vnode) {
        clearInterval(vnode.state.refreshId);
    },

    view(vnode) {
        if (!vnode.state.record || !vnode.state.agents || vnode.state.agents.length === 0) {
            return m('.alert-warning', `Loading ${vnode.attrs.recordId}`);
        }
        const record = vnode.state.record;
        const publicKey = api.getPublicKey();
        const isOwner = record.owner === publicKey;
        const isCustodian = record.custodian === publicKey;
        let role = vnode.state.role

        console.log('role before', role);
            
        role = _hasProposal(record, publicKey, 'reporter') ? 'reporter' :
            _hasProposal(record, publicKey, 'custodian') ? 'custodian' :
                _hasProposal(record, publicKey, 'owner') ? 'owner' : '';

        console.log('role after', role);
        if (role) {
            const proposal = _getProposal(record, publicKey, role);
            _handlePendingProposal(vnode, proposal);
            role = ''
        }

        return m('.rice-detail',
            m('h1.text-center', record.recordId),
            _displayRecordDetails(record, vnode.state.owner, vnode.state.custodian),
            _displayInteractionButtons(record, publicKey, isOwner, isCustodian, vnode)
        );
    }
};
function _handlePendingProposal(vnode, proposal) {
    show(BasicModal, {
        title: 'Handle Pending Proposal',
        body: m('div', [
            m('p', `${_agentByKey(vnode.state.agents, proposal.issuingAgent).name} meminta Anda menjadi ${proposal.role.toLowerCase()} produk ini.`),
        ]),
        acceptText: 'Terima',
        cancelText: 'Tolak',
    }).then(() => {
        console.log('Proposal diterima.');
        _answerProposal(vnode.state.record, proposal.receivingAgent, ROLE_TO_ENUM[proposal.role.toLowerCase()], payloads.answerProposal.enum.ACCEPT)
            .then(() => {
                alert('Proposal diterima');
                // Reload the data to reflect changes
                _loadData(vnode.attrs.recordId, vnode.state);
            })
            .catch(err => {
                console.error('Gagal menerima proposal:', err);
                const errorMessage = err.response ? err.response.data.error : err.message;
                alert(`Gagal menerima proposal: ${errorMessage}`);
            });
    }).catch(() => {
        _answerProposal(vnode.state.record, proposal.receivingAgent, ROLE_TO_ENUM[proposal.role.toLowerCase()], payloads.answerProposal.enum.REJECT)
            .then(() => {
                alert('Proposal ditolak.');
                // Reload the data to reflect changes
                _loadData(vnode.attrs.recordId, vnode.state);

            })
            .catch(err => {
                console.error('Gagal menolak proposal:', err);
                const errorMessage = err.response ? err.response.data.error : err.message;
                alert(`Gagal menolak proposal: ${errorMessage}`);
            });
    });
}

const _displayRecordDetails = (record, owner, custodian) => {
    return [
        _row(
            _labelProperty('Created', _formatTimestamp(record.creationTime)),
            _labelProperty('Updated', _formatTimestamp(record.updatedTime))
        ),
        _row(
            _labelProperty('Pemilik', _agentLink(owner)),
            _labelProperty('Kustodian', _agentLink(custodian))
        ),
        _row(
            _labelProperty('Tanggal Transaksi Terakhir', _formatDateTime(getPropertyValue(record, 'tgltransaksi', 0))),
            _labelProperty('Kedaluwarsa', _formatDate(getPropertyValue(record, 'kedaluwarsa', 0)))
        ),
        _row(
            _labelProperty('Varietas', getPropertyValue(record, 'varietas')),
            _labelProperty('Berat (kg)', getPropertyValue(record, 'berat', 0))
        ),
        _row(
            _labelProperty('Harga', _formatPrice(getPropertyValue(record, 'harga'))),
            _labelProperty('Lokasi', _propLink(record, 'lokasi', _formatLocation(getPropertyValue(record, 'lokasi'))))

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
                isCustodian && isOwner && !record.final && m('button.btn.btn-primary', { onclick: () => _finalizeWithConfirmation(vnode) }, 'Finalisasi')
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
            state.owner = agents.find(agent => agent.key === record.owner);
            state.custodian = agents.find(agent => agent.key === record.custodian);
        });
};

module.exports = RiceDetail;
