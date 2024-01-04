// formatUtils.js
const moment = require('moment');
const parsing = require('../services/parsing');  // Asumsi module parsing tersedia

/**
 * Memformat timestamp menjadi string tanggal dengan format 'DD-MM-YYYY HH:mm'.
 */
const formatDateTime = (sec) => {
  if (!sec) {
    sec = Date.now() / 1000;
  }
  return moment.unix(sec).format('DD-MM-YYYY HH:mm');
};

/**
 * Memformat timestamp menjadi string tanggal dengan format 'DD-MM-YYYY'.
 */
const formatDate = (sec) => {
  if (!sec) {
    sec = Date.now() / 1000;
  }
  return moment.unix(sec).format('DD-MM-YYYY');
};

/**
 * Memformat timestamp menjadi string tanggal dengan format 'YYYY-MM-DD'.
 */
const formatTimestamp = (sec) => {
  if (!sec) {
    sec = Date.now() / 1000;
  }
  return moment.unix(sec).format('YYYY-MM-DD');
};

/**
 * Memformat harga menjadi string dengan format mata uang Indonesia 'Rp'.
 */
const formatCurrency = (value) => {
  if (value) {
    return `Rp. ${parseInt(value).toLocaleString('id')}`;
  }
  return 'N/A';
};

/**
 * Memformat data lokasi menjadi string koordinat.
 */
const formatLocation = (lokasi) => {
  if (lokasi && lokasi.latitude !== undefined && lokasi.longitude !== undefined) {
    let latitude = parsing.toFloat(lokasi.latitude);
    let longitude = parsing.toFloat(lokasi.longitude);
    return `${latitude}, ${longitude}`;
  }
  return 'Unknown';
};

module.exports = {
  formatDateTime,
  formatDate,
  formatTimestamp,
  formatCurrency,
  formatLocation
};
