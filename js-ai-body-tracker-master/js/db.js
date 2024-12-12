// js/db.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define the path to your SQLite database
const dbPath = path.resolve(__dirname, '..', 'databases', 'posture_data.db');

// Log the database path to confirm
console.log(`Database Path: ${dbPath}`);

// Connect to the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to the SQLite database:', err.message);
  } else {
    console.log(`Connected to the SQLite database at ${dbPath}`);
  }
});

// Create the 'posture' table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS posture (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    posture TEXT NOT NULL,
    timestamp TEXT NOT NULL
    -- Add other fields as necessary
  )
`;

db.run(createTableQuery, (err) => {
  if (err) {
    console.error('Could not create "posture" table:', err.message);
  } else {
    console.log('Table "posture" is ready.');
  }
});

/**
 * Insert posture data into the database.
 * @param {Object} data - The posture data to insert.
 * @param {number} data.userId - The user's ID.
 * @param {string} data.posture - The posture description.
 * @param {string} data.timestamp - The timestamp of the posture.
 * @param {Function} callback - Callback function to handle post-insertion logic.
 */
function insertPostureData(data, callback) {
  const insertQuery = `
    INSERT INTO posture (userId, posture, timestamp)
    VALUES (?, ?, ?)
  `;
  const params = [data.userId, data.posture, data.timestamp];

  db.run(insertQuery, params, function(err) {
    if (err) {
      console.error('Error inserting data:', err.message);
      if (callback) callback(err);
    } else {
      console.log(`A row has been inserted with rowid ${this.lastID}`);
      if (callback) callback(null, this.lastID);
    }
  });
}

module.exports = {
  insertPostureData,
  dbInstance: db // Export the db instance for graceful shutdown
};
