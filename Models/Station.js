const mongoose = require('mongoose');

// Station Schema
const StationSchema = new mongoose.Schema({
  stationName: { type: String, required: true },
  stationCode: { type: String, required: true, unique: true },
  status: { type: String, enum: ['Operational', 'Non-Operational'], default: 'Operational' },
  trains: [{ trainNumber: String }] // Array of train numbers passing through this station
});

const Station = mongoose.model('Station', StationSchema);
module.exports = Station;
