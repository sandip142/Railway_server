const mongoose = require('mongoose');

// Train Schema
const TrainSchema = new mongoose.Schema({
  trainName: { type: String, required: true },
  trainNumber: { type: String, required: true, unique: true },
  source: { type: String, required: true },        // Source station name
  destination: { type: String, required: true },   // Destination station name
  arrivalTime: { type: String, required: true },   // Arrival time at the station
  departureTime: { type: String, required: true }, // Departure time from the station
  stationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Station' }], 
  audioFilePath: { type: String },// Array of station IDs
});

const Train = mongoose.model('Train', TrainSchema);
module.exports = Train;
