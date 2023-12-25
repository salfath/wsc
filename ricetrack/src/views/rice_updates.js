const m = require('mithril')
const moment = require('moment')
const { getPropertyUpdates } = require('../utils/records')
const api = require('../services/api')

const RiceUpdates = {
  oninit: (vnode) => {
    vnode.state.record = null;
    vnode.state.groupedUpdates = {}
    vnode.state.agents = []
    const recordId = vnode.attrs.recordId

    console.log("Fetching record and agent data");

    // Fetch both the record and agents data
    Promise.all([
      api.get(`records/${recordId}`),
      api.get('agents')
    ]).then(([record, agents]) => {
      console.log("Record data received:", record);
      console.log("Agents data received:", agents);

      vnode.state.agents = agents;
      vnode.state.record = record;


      getPropertyUpdates(record).forEach(update => {
        console.log("Processing update:", update);
        const timestamp = update.timestamp;
        if (!vnode.state.groupedUpdates[timestamp]) {
          vnode.state.groupedUpdates[timestamp] = {
            tgltransaksi: [],
            kedaluwarsa: [],
            lokasi: [],
            harga: []
          };
        }
        if (update.propertyName in vnode.state.groupedUpdates[timestamp]) {
          vnode.state.groupedUpdates[timestamp][update.propertyName].push(update.updatedValue);
        }
      });

      console.log("Grouped updates:", vnode.state.groupedUpdates);
    });
  },


  view: (vnode) => {
  
    
    const formatDateTime = (timestamp) => {
      const formatted = moment.unix(timestamp).format('DD-MM-YYYY HH:mm');
      console.log(`Formatted timestamp ${timestamp} to ${formatted}`);
      return formatted;
    };

    const formatTimestamp = (milliseconds) => {
      return moment(milliseconds).format('DD-MM-YYYY');
    };
    

    const formatCurrency = (value) => {
      const formatted = `Rp ${parseInt(value).toLocaleString('id-ID')}`;
      console.log(`Formatted currency ${value} to ${formatted}`);
      return formatted;
    };

    const formatLocation = (location) => {
      // Assuming location is an object with latitude and longitude
      const formatted = location ? `${location.latitude / 1000000}, ${location.longitude / 1000000}` : 'Unknown';
      console.log(`Formatted location ${JSON.stringify(location)} to ${formatted}`);
      return formatted;
    };
   
    const findAgentNameByKey = (key) => {
      const agent = vnode.state.agents.find(agent => agent.key === key);
      return agent ? agent.name : 'Unknown';
    };

    // Display owner's name using record.owner
    const ownerName = vnode.state.record ? findAgentNameByKey(vnode.state.record.owner) : 'Loading...';
    const custodianName = vnode.state.record ? findAgentNameByKey(vnode.state.record.custodian) : 'Loading...';

    
    const formatKeterangan = (updates) => {
      let hasTglprod = updates.kedaluwarsa.length > 0;
      let hasHarga = updates.harga.length > 0;
      let hasLokasi = updates.lokasi.length > 0;

      if (hasHarga && !hasTglprod) {
        return 'Dijual';
      } else if (hasTglprod) {
        return 'Dikemas';
      } else if (hasLokasi) {
        return 'Perubahan lokasi';
      }
      return '';
    };

    return m('div', [
      m('h2', 'Updates History'),
      m('table.table-updates', [ 
        m('thead', 
          m('tr', [
            m('th', 'Tanggal'),
            m('th', 'Keterangan'),
            m('th', 'Pemilik'),
            m('th', 'Kustodian'),
            m('th', 'Lokasi'),
            m('th', 'Harga (Rp)')
          ])
        ),
        m('tbody', 
          Object.keys(vnode.state.groupedUpdates).sort().map(timestamp => {
            const updates = vnode.state.groupedUpdates[timestamp];
            console.log(`Rendering row for timestamp ${timestamp}`, updates);
            return m('tr', [
              m('td', formatTimestamp(updates.tgltransaksi[0])),
              m('td', formatKeterangan(updates)),
              m('td', ownerName),
              m('td', custodianName),
              m('td', updates.lokasi.length > 0 ? formatLocation(updates.lokasi[0]) : ''),
              m('td', updates.harga.length > 0 ? formatCurrency(updates.harga[0]) : '')
            ]);
          })
        )
      ])
    ])
  }
}

module.exports = RiceUpdates