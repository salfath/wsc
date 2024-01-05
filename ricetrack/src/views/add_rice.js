
const m = require('mithril')

const api = require('../services/api')
const payloads = require('../services/payloads')
const transactions = require('../services/transactions')
const parsing = require('../services/parsing')
const {MultiSelect} = require('../components/forms')
const layout = require('../components/layout')

/**
 * Possible selection options
 */
const authorizableProperties = [
  ['lokasi', 'Lokasi'],
  ['harga', 'Harga'],
]

const varietasOptions = ['IR/Ciherang/Impari', 'Muncul', 'Mentik Wangi', 'IR42', 'Ketan'];

/**
 * The Form for tracking a new rice.
 */
const AddRice = {
  async oninit (vnode) {
    // Initialize Latitude and Longitude
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        vnode.state.latitude = position.coords.latitude;
        vnode.state.longitude = position.coords.longitude;
        m.redraw(); // Memaksa update pada komponen setelah mendapatkan lokasi
      }, () => {
        console.error("Geolocation error or permission denied");
        // Handle error atau kasus ketika izin tidak diberikan
        m.redraw(); // Memaksa update pada komponen jika ada error
      });
    } else {
      console.error("Geolocation is not supported by this browser");
      // Handle kasus ketika geolocation tidak didukung
      m.redraw(); // Memaksa update pada komponen jika geolocation tidak didukung
    }
    await api.get('agents')
      .then(agents => {
        const publicKey = api.getPublicKey()
        vnode.state.agents = agents.filter(agent => agent.key !== publicKey)
      })
  },

  view (vnode) {

    return m('.rice_form',
             m('form', {
               onsubmit: (e) => {
                 e.preventDefault()
                 _handleSubmit(vnode.attrs.signingKey, vnode.state)
               }
             },
             m('legend', 'Tambahkan Beras'),
             _formGroup('Nomor Seri', m('input.form-control', {
               type: 'text',
               oninput: m.withAttr('value', (value) => {
                 vnode.state.serialNumber = value
               }),
               value: vnode.state.serialNumber
             })),
             
             _formGroup('Varietas', 
              m('select.form-control', {
                onchange: m.withAttr('value', (value) => {
                  vnode.state.varietas = value;
                }),
                value: vnode.state.varietas
              }, [
                m('option', { value: '', disabled: true, selected: true }, 'Pilih Varietas'),
                varietasOptions.map((option) =>
                  m('option', { value: option }, option)
                )
              ])
            ),

            layout.row([
               _formGroup('Berat (kg)', m('input.form-control', {
                 type: 'number',
                 step: 'any',
                 oninput: m.withAttr('value', (value) => {
                   vnode.state.berat = value
                 }),
                 value: vnode.state.berat
               })),
             
             _formGroup('Harga (Rp)', m('input.form-control', {
              type: 'text',
              oninput: m.withAttr('value', (value) => {
                vnode.state.harga = formatHargaInput(value);
              }),
              value: vnode.state.harga
            }))]),

             layout.row([
               _formGroup('Garis Lintang', m('input.form-control', {
                 type: 'number',
                 step: 'any',
                 min: -90,
                 max: 90,
                 value: vnode.state.latitude,
                 oninput: m.withAttr('value', (value) => {
                   vnode.state.latitude = value
                 }),
               })),
               _formGroup('Garis Bujur', m('input.form-control', {
                 type: 'number',
                 step: 'any',
                 min: -180,
                 max: 180,
                 value: vnode.state.longitude,
                 oninput: m.withAttr('value', (value) => {
                   vnode.state.longitude = value
                 }),
               }))
             ]),

             m('.row.justify-content-end.align-items-end',
               m('col-2',
                 m('button.btn.btn-primary',
                   'Tambahkan')))))
  }
}
const formatHargaInput = (value) => {
  let numericValue = value.replace(/^Rp\./, '').replace(/\./g, '')
  let formattedValue = parseInt(numericValue, 10).toLocaleString('id-ID')
  return 'Rp.' + formattedValue
};

/**
 * Handle the form submission.
 *
 * Extract the appropriate values to pass to the create record transaction.
 */
const _handleSubmit = (signingKey, state) => {

  // set kedaluwarsaDate to 2 years after today
  const kedaluwarsaDate = new Date()
  kedaluwarsaDate.setFullYear(kedaluwarsaDate.getFullYear() + 2)
  // Konversi tanggal kedaluwarsa ke timestamp atau format yang diinginkan
  const kedaluwarsaTimestamp = kedaluwarsaDate.getTime()

  const parsedHarga = parseInt(state.harga.replace(/^Rp\./, '').replace(/\./g, ''), 10);

  const recordPayload = payloads.createRecord({
    recordId: state.serialNumber,
    recordType: 'rice',
    properties: [
      {
        name: 'varietas',
        stringValue: state.varietas,
        dataType: payloads.createRecord.enum.STRING
      },
      {
        name: 'kedaluwarsa',
        intValue: kedaluwarsaTimestamp,
        dataType: payloads.createRecord.enum.INT
      },
      {
        name: 'berat',
        intValue: parsing.toInt(state.berat),
        dataType: payloads.createRecord.enum.INT
      },
      {
        name: 'harga',
        intValue: parsedHarga,
        dataType: payloads.createRecord.enum.INT
      },
      {
        name: 'lokasi',
        locationValue: {
          latitude: parsing.toInt(state.latitude),
          longitude: parsing.toInt(state.longitude)
        },
        dataType: payloads.createRecord.enum.LOCATION
      }
    ]
  })
}

/**
 * Create a form group (this is a styled form-group with a label).
 */
const _formGroup = (label, formEl) =>
  m('.form-group',
    m('label', label),
    formEl)

module.exports = AddRice
