'use strict'

const m = require('mithril')
const _ = require('lodash')

const forms = require('../components/forms')
const api = require('../services/api')
const transactions = require('../services/transactions')
const payloads = require('../services/payloads')

const passwordCard = state => {
  const setter = forms.stateSetter(state)
  const validator = forms.validator(
    () => state.password === state.confirm,
    'Kata sandi tidak cocok', // Translated 'Las contraseñas no coincided'
    'konfirmasi' // Translated 'confirmar'
  )
  const passwordField = (id, placeholder) => {
    return forms.field(
      // Run both state setting and validation on value changes
      _.flow(setter(id), validator),
      {
        id,
        placeholder,
        type: 'password',
        class: 'border-warning'
      }
    )
  }

  return forms.group('Kata Sandi', [ // Translated 'Password'
    m('.card.text-center.border-warning',
      m('.card-header.text-white.bg-warning', m('em', m('strong', 'PERHATIAN!'))), // Translated 'ATENCIÓN!'
      m('.card-body.text-warning.bg-light',
        m('p.card-text',
          'Kata sandi ini akan digunakan sebagai kunci rahasia untuk mengenkripsi akun.', // Translated text
          m('em',
            ' Jika hilang atau lupa akan ',
            m('strong', 'mustahil'),
            ' untuk memulihkan akun.')), // Translated text
        m('p.card-text', 'Simpanlah dengan aman.'), // Translated 'Guárdala de manera segura.'
        passwordField('password', 'Kata Sandi...'), // Translated 'Contraseña...'
        passwordField('confirm', 'Konfirmasi Kata Sandi...'))) // Translated 'Confirma contraseña...'
  ])
}

const userSubmitter = state => e => {
  e.preventDefault()

  const keys = transactions.makePrivateKey(state.password)

  const user = _.assign(keys, _.pick(state, 'username', 'email'))
  user.password = api.hashPassword(state.password)

  const agent = payloads.createAgent(_.pick(state, 'name'))

  transactions.submit(agent, true)
    .then(() => api.post('users', user))
    .then(res => api.setAuth(res.authorization))
    .then(() => m.route.set('/'))
}

/**
 * The Form for authorizing an existing user.
 */
const SignupForm = {
  view (vnode) {
    const setter = forms.stateSetter(vnode.state)

    return m('.signup-form', [
      m('form', { onsubmit: userSubmitter(vnode.state) },
      m('legend', 'Buat Admin'), // Translated 'Crear Administrador'
      forms.textInput(setter('name'), 'Nama'), // Translated 'Nombre'
      forms.emailInput(setter('email'), 'Email'),
      forms.textInput(setter('username'), 'Nama Pengguna'), // Translated 'Nombre de Usuario'
      passwordCard(vnode.state),
      m('.container.text-center',
        'Atau masuk ', // Translated 'O puede entrar'
        m('a[href="/login"]',
          { oncreate: m.route.link },
          'jika sudah terdaftar')), // Translated 'si ya está registrado'
      m('.form-group',
        m('.row.justify-content-end.align-items-end',
          m('col-2',
            m('button.btn.btn-primary',
              'Buat'))))) // Translated 'Crear'
    ])
  }
}

module.exports = SignupForm
