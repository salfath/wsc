// formatUtils.js
const moment = require('moment');
const parsing = require('../services/parsing');  // Asumsi module parsing tersedia

/**
 * Memformat timestamp menjadi string tanggal dengan format 'DD-MM-YYYY HH:mm'.
 */
const _formatDateTime = (timestamp) => {
  const seconds = timestamp / 1000; // Konversi dari milidetik ke detik
  return moment.unix(seconds).format('DD-MM-YYYY HH:mm');
};

/**
 * Memformat timestamp menjadi string tanggal dengan format 'DD-MM-YYYY'.
 */
const _formatDate = (timestamp) => {
  const seconds = timestamp / 1000; // Konversi dari milidetik ke detik
  return moment.unix(seconds).format('DD-MM-YYYY');
};

/**
 * Memformat timestamp menjadi string tanggal dengan format 'YYYY-MM-DD'.
 */
const _formatTimestamp = (sec) => {
  if (!sec) {
    sec = Date.now() / 1000;
  }
  return moment.unix(sec).format('YYYY-MM-DD');
};

/**
 * Memformat harga menjadi string dengan format mata uang Indonesia 'Rp'.
 */
const _formatPrice = (value) => {
  if (value) {
    return `Rp ${parseInt(value).toLocaleString('id')}`;
  }
  return 'N/A';
};

/**
 * Memformat data lokasi menjadi string koordinat.
 */
const _formatLocation = (lokasi) => {
  if (lokasi && lokasi.latitude !== undefined && lokasi.longitude !== undefined) {
    let latitude = parsing.toFloat(lokasi.latitude);
    let longitude = parsing.toFloat(lokasi.longitude);
    return `${latitude}, ${longitude}`;
  }
  return 'Unknown';
};

module.exports = {
  _formatDateTime,
  _formatDate,
  _formatTimestamp,
  _formatPrice,
  _formatLocation
};
