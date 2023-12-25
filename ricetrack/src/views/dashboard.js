'use strict';

const m = require('mithril');

const text = {
  blurb1: ' dibangun menggunakan teknologi blockchain Hyperledger Sawtooth untuk melacak rantai pasok beras mulai dari asal-usul, ' +
    'penyimpanan, pengangkutan dan penjualan beras dari petani sampai konsumen.',
  startBlurb: 'Untuk menggunakan RiceTrack, buat akun dengan mengklik tombol Masuk di bilah navigasi atas. ' +
    'Setelah masuk, Anda dapat menambahkan produk beras ke RiceTrack, melacak lokasi terkini dan riwayat perpindahan kepemilikannya. ' +
    'xSelain itu, Anda dapat memberi izin kepada pengelola lain di RiceTrack untuk melacak atau mengalihkan kepemilikan beras tersebut kepada pihak lain dalam rantai pasok.'
};

const Dashboard = {
  view (vnode) {
    return [
      m('.header.text-center.mb-4',
        m('img', {src: '/images/RiceTrack.png', alt: 'RiceTrack', style: 'max-width: 20%; height: auto;'})),
      m('.blurb.container',
        m('p.text-justify',
          m('strong', 'RiceTrack'), text.blurb1),
        m('p.text-justify', text.startBlurb)
      )
    ];
  }
};

module.exports = Dashboard;
