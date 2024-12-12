// js/server.js

require('dotenv').config(); // Load environment variables

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import CORS
const path = require('path');
const { insertPostureData, dbInstance } = require('./db'); // Correct path to db.js

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Enable CORS for all routes and origins (for development)
app.use(cors());

// Optional: Serve a welcome message at root
app.get('/', (req, res) => {
    res.send('Welcome to the P.R.E.S Posture Tracking API. Use /api/posture to POST data.');
});

// Endpoint to receive posture data
app.post('/api/posture', (req, res) => {
    const { userId, posture, timestamp } = req.body;

    console.log('--- Incoming POST /api/posture Request ---');
    console.log('Received Data:', req.body);

    // Basic validation
    if (!userId || !posture || !timestamp) {
        console.error('Validation Error: Missing required fields.');
        return res.status(400).json({ error: 'Missing required fields: userId, posture, timestamp.' });
    }

    const postureData = { userId, posture, timestamp };

    insertPostureData(postureData, (err, rowId) => {
        if (err) {
            console.error('Failed to insert posture data:', err.message);
            return res.status(500).json({ error: 'Failed to insert data into the database.' });
        }
        console.log(`Posture data inserted successfully with row ID: ${rowId}`);
        res.status(201).json({ message: 'Data inserted successfully.', rowId });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    // Close the database connection gracefully
    dbInstance.close((err) => {
        if (err) {
            console.error('Error closing the database connection:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
