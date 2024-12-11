const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DATABASE_PATH = "/Users/gabemurray/Documents/GitHub/P.R.E.S/js-ai-body-tracker-master/databases/posture_data.db";

const db = new sqlite3.Database(DATABASE_PATH, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
        process.exit(1);
    } else {
        console.log(`Connected to database at ${DATABASE_PATH}`);
    }
});

const createTableQuery = `
    CREATE TABLE IF NOT EXISTS posture_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        posture TEXT NOT NULL,
        smoothed_spine_angle REAL,
        yaw REAL,
        pitch REAL,
        roll REAL
    );
`;

db.run(createTableQuery, (err) => {
    if (err) {
        console.error("Error creating table:", err.message);
        process.exit(1);
    } else {
        console.log("Table 'posture_data' created or already exists.");
    }
});

const insertDataQuery = `
    INSERT INTO posture_data (timestamp, posture, smoothed_spine_angle, yaw, pitch, roll)
    VALUES (?, ?, ?, ?, ?, ?);
`;

const sampleData = [
    ["2024-12-10T10:00:00.000Z", "Good Posture", 15.4, 10.2, 5.6, 2.8],
    ["2024-12-10T10:05:00.000Z", "Bad Posture", 25.0, 12.5, 8.9, 3.5]
];

sampleData.forEach((row) => {
    db.run(insertDataQuery, row, (err) => {
        if (err) {
            console.error("Error inserting data:", err.message, row);
        } else {
            console.log("Inserted row:", row);
        }
    });
});

db.close((err) => {
    if (err) {
        console.error("Error closing database:", err.message);
    } else {
        console.log("Database connection closed.");
    }
});
