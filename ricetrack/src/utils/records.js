'use strict'

const _getProp = (record, propName) => {
  return record.properties.find((prop) => prop.name === propName)
}

const getPropertyValue = (record, propName, defaultValue = null) => {
  let prop = _getProp(record, propName)
  if (prop && prop.value) {
    return prop.value
  } else {
    return defaultValue
  }
}

const isReporter = (record, propName, publicKey) => {
  let prop = _getProp(record, propName)
  if (prop) {
    return prop.reporters.indexOf(publicKey) > -1
  } else {
    return false
  }
}

const _getPropTimeByComparison = (compare) => (record) => {
  if (!record.updates.properties) {
    return null
  }

  return Object.values(record.updates.properties)
    .reduce((acc, updates) => acc.concat(updates), [])
    .reduce((selected, update) =>
      compare(selected.timestamp, update.timestamp) ? update : selected)
    .timestamp
}

const getLatestPropertyUpdateTime =
  _getPropTimeByComparison((selected, timestamp) => selected < timestamp)

const getOldestPropertyUpdateTime =
  _getPropTimeByComparison((selected, timestamp) => selected > timestamp)

const countUniqueUpdates = (record) => {
  if (!record.updates || !record.updates.properties) {
    return 0;
  }

  const timestamps = [];

  // Misalkan state.record.updates memiliki struktur yang berisi owners, custodians, dll.
  if (record.updates.owners) {
    timestamps.push(...record.updates.owners.map(update => update.timestamp));
  }
  if (record.updates.custodians) {
    timestamps.push(...record.updates.custodians.map(update => update.timestamp));
  }
  const locationTimestamps = getPropertyUpdates(record)
    .filter(update => update.propertyName === 'lokasi')
    .map(update => update.timestamp);

  const priceTimestamps = getPropertyUpdates(record)
    .filter(update => update.propertyName === 'harga')
    .map(update => update.timestamp);

  timestamps.push(...locationTimestamps);
  timestamps.push(...priceTimestamps);

  const uniqueTimestamps = new Set(timestamps);
  const totalUniqueUpdates = uniqueTimestamps.size;


  console.log('uniqueTimestamps: ', uniqueTimestamps);
  return totalUniqueUpdates;
};

const getPropertyUpdates = (record) => {
  const updatesList = [];

  if (record.updates && record.updates.properties) {
    Object.entries(record.updates.properties).forEach(([propName, updates]) => {
      updates.forEach(update => {
        updatesList.push({
          propertyName: propName,
          timestamp: update.timestamp,
          updatedValue: update.value // Assuming 'value' is the updated value
        });
      });
    });
  }

  return updatesList;
};

module.exports = {
  getPropertyValue,
  isReporter,
  getLatestPropertyUpdateTime,
  getOldestPropertyUpdateTime,
  countUniqueUpdates,
  getPropertyUpdates
}
