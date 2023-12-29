const m = require('mithril');
const api = require('../services/api');
const {
    getPropertyValue,
    getLatestPropertyUpdateTime,
    getOldestPropertyUpdateTime,
    isReporter
} = require('../utils/records')
const { _formatDateTime, _formatDate, _formatTimestamp, _formatPrice, _formatLocation } = require('./formatUtils');
const { _getProposal, _hasProposal, _answerProposal, _submitProposal } = require('./proposalUtils');
const { _revokeAuthorization, _authorizeReporter } = require('./reporterUtils');
const { _updateProperty, _finalizeRecord } = require('./recordUtils');


const RiceDetail = {
    oninit(vnode) {
        vnode.state.record = null;
        vnode.state.agents = [];
        vnode.state.owner = null;
        vnode.state.custodian = null;
        _loadData(vnode.attrs.recordId, vnode.state);
        vnode.state.refreshId = setInterval(() => {
            _loadData(vnode.attrs.recordId, vnode.state);
        }, 2000);
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

        return m('.rice-detail',
            m('h1.text-center', record.recordId),
            _displayRecordDetails(record, vnode.state.owner, vnode.state.custodian),
            _displayInteractionButtons(record, publicKey, isOwner, isCustodian)
        );
    }
};

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

const _displayInteractionButtons = (record, publicKey, isOwner, isCustodian) => {
    return m('.row.m-2',
        m('.col.text-center',
            [
                // isCustodian && m('button.btn.btn-primary', { onclick: () => m.route.set(`/update-properties/${record.recordId}`) }, 'Update Properties'),
                m('button.btn.btn-primary', { onclick: () => m.route.set(`/rice-updates/${record.recordId}`) }, 'Lacak'),
                isOwner && m('button.btn.btn-primary', { onclick: () => m.route.set(`/transfer-ownership/${record.recordId}`) }, 'Jual'),
                isCustodian && m('button.btn.btn-primary', { onclick: () => m.route.set(`/transfer-custodian/${record.recordId}`) }, 'Ubah Kustodian'),
                isOwner && m('button.btn.btn-primary', { onclick: () => m.route.set(`/manage-reporters/${record.recordId}`) }, 'Kelola Reporter'),
                isOwner && !record.final && m('button.btn.btn-primary', { onclick: () => _finalizeRecord(record) }, 'Finalisasi')
            ]));
};

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
