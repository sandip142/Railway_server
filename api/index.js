const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const Station = require('../Models/Station'); // Station model
const Train = require('../Models/train'); // Train model
const { DB_NAME } = require('../constant'); 
const upload = require('../uploadFile'); 
const path = require('path');
const fs = require('fs');
const https = require('https');
// Load environment variables
dotenv.config({ path: "./.env" });

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json()); // Parses JSON requests

// Connect to MongoDB
mongoose
  .connect(`${process.env.MONGODB_URL}/${DB_NAME}`, {
  })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection failed:', err));

/**
 * Add or Update Station and Train Data (POST /stations)
 */
app.post('/stations', async (req, res) => {
  try {
    const { stationName, stationCode, status, trains } = req.body;

    // Create a new station
    const station = new Station({
      stationName,
      stationCode,
      status,
      trains: trains.map(train => ({ trainNumber: train.trainNumber })),
    });

    await station.save(); // Save the station

    // Process each train in the request
    for (const trainData of trains) {
      const { trainName, trainNumber, source, destination, arrivalTime, departureTime } = trainData;

      // Check if the train already exists
      let train = await Train.findOne({ trainNumber });

      if (train) {
        // Add the station ID if not already present
        if (!train.stationIds.includes(station._id)) {
          train.stationIds.push(station._id);
        }
      } else {
        // Create a new train with the required details
        train = new Train({
          trainName,
          trainNumber,
          source,
          destination,
          arrivalTime,
          departureTime,
          stationIds: [station._id],
        });
      }

      await train.save(); // Save the train
    }

    res.status(201).json({ message: 'Station and train data added successfully', station });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Get All Stations (GET /stations)
 */
app.get('/stations', async (req, res) => {
  try {
    const stations = await Station.find().populate('trains.trainNumber');
    res.status(200).json(stations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Station by Code (GET /stations/:code)
 */
app.get('/stations/:code', async (req, res) => {
    try {
      const station = await Station.findOne({ stationCode: req.params.code });
  
      if (!station) {
        return res.status(404).json({ message: 'Station not found' });
      }
  
      // Fetch all trains based on the train numbers stored in the station
      const trains = await Train.find({
        trainNumber: { $in: station.trains.map(t => t.trainNumber) }
      });
  
      // Attach the full train data to the response
      const result = {
        ...station._doc,
        trains: trains, // Overwrite the trains array with full train objects
      };
  
      res.status(200).json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
  

/**
 * Update Station (PUT /stations/:code)
 */
app.put('/stations/:code', async (req, res) => {
  try {
    const station = await Station.findOneAndUpdate(
      { stationCode: req.params.code },
      req.body,
      { new: true, runValidators: true }
    );
    if (!station) {
      return res.status(404).json({ message: 'Station not found' });
    }
    res.status(200).json(station);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Delete Station (DELETE /stations/:code)
 */
app.delete('/stations/:code', async (req, res) => {
  try {
    const station = await Station.findOneAndDelete({ stationCode: req.params.code });
    if (!station) {
      return res.status(404).json({ message: 'Station not found' });
    }
    res.status(200).json({ message: 'Station deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get Train by Train Number (GET /trains/:trainNumber)
 */
// app.get('/trains/:trainNumber', async (req, res) => {
//   try {
//     const train = await Train.findOne({ trainNumber: req.params.trainNumber }).populate('stationIds');
//     if (!train) {
//       return res.status(404).json({ message: 'Train not found' });
//     }
//     res.status(200).json(train);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

app.get('/trains/:trainNumber', async (req, res) => {
  try {
    // Find the train using the trainNumber and populate station details
    const train = await Train.findOne({ trainNumber: req.params.trainNumber })
      .populate({
        path: 'stationIds', // Populate the 'stationIds' field
        select: 'stationName stationCode' // Include only stationName and stationCode
      });

    // If train not found, return a 404 response
    if (!train) {
      return res.status(404).json({ message: 'Train not found' });
    }

    // Return the train data along with populated station details
    res.status(200).json(train);
  } catch (err) {
    // Handle server errors
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update Train by Train Number (PUT /trains/:trainNumber)
 * Allows updating train details and uploading an audio file.
 */
app.post('/trains/:trainNumber', upload.single('audioFilePath'), async (req, res) => {
  try {
    const { trainNumber } = req.params;
    const { trainName, source, destination, arrivalTime, departureTime } = req.body;

    // Find the train by its number
    const train = await Train.findOne({ trainNumber });

    if (!train) {
      return res.status(404).json({ message: 'Train not found' });
    }

    // Update train details
    if (trainName) train.trainName = trainName;
    if (source) train.source = source;
    if (destination) train.destination = destination;
    if (arrivalTime) train.arrivalTime = arrivalTime;
    if (departureTime) train.departureTime = departureTime;

    // If a new audio file is uploaded, save its Cloudinary URL
    if (req.file) {
      train.audioFilePath = req.file.path; // Cloudinary URL
    }

    await train.save(); // Save the updated train
    res.status(200).json({
      message: 'Train updated successfully',
      train,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Stream Train Audio File
app.get('/trains/:trainNumber/audio', async (req, res) => {
  try {
    const { trainNumber } = req.params;

    // Find train by train number
    const train = await Train.findOne({ trainNumber });

    if (!train || !train.audioFilePath) {
      return res.status(404).json({ message: 'Audio file not found for this train' });
    }

    // Stream audio file from Cloudinary
    const cloudinaryUrl = train.audioFilePath;
    https.get(cloudinaryUrl, (cloudinaryRes) => {
      if (cloudinaryRes.statusCode !== 200) {
        return res.status(404).json({ message: 'Failed to fetch audio file from Cloudinary' });
      }

      // Set headers for streaming
      res.setHeader('Content-Type', cloudinaryRes.headers['content-type'] || 'audio/mpeg');
      res.setHeader('Content-Disposition', 'inline');

      cloudinaryRes.pipe(res); // Pipe the response to the client
    }).on('error', (err) => {
      console.error('Error streaming file:', err);
      res.status(500).json({ message: 'Error retrieving the audio file' });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});


app.get('/',(req,res)=>{
  res.send('Api Home Page')
});
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
