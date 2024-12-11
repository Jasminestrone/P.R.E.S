const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Path to your database
const DATABASE_PATH = "/Users/gabemurray/Documents/GitHub/P.R.E.S/js-ai-body-tracker-master/databases/posture_data.db";

// Function to query the database
function queryData(callback) {
    const db = new sqlite3.Database(DATABASE_PATH, (err) => {
        if (err) {
            console.error("Error connecting to database:", err.message);
            callback(err, null);
            return;
        }
    });

    const query = "SELECT * FROM posture_data;";

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error querying data:", err.message);
            callback(err, null);
        } else {
            console.log("Posture Data:", rows);
            callback(null, rows);
        }
    });

    db.close((err) => {
        if (err) {
            console.error("Error closing database:", err.message);
        }
    });
}

module.exports = { queryData };
