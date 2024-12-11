const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

// Correct database path
const DATABASE_PATH = path.resolve(
    __dirname,
    "../databases",
    "posture_data.db"
);

console.log("Starting server...");
console.log(`Database path: ${DATABASE_PATH}`);

// Global error handlers
process.on("uncaughtException", (err) => {
    console.error("Unhandled Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Serve HTML with data from the database
app.get("/", (req, res) => {
    console.log("Received request at /");

    // Open the database
    const db = new sqlite3.Database(DATABASE_PATH, (err) => {
        if (err) {
            console.error("Error connecting to database:", err.message);
            res.status(500).send(`<h1>Database connection error: ${err.message}</h1>`);
            return;
        }

        console.log("Connected to database successfully.");
    });

    // Query the database
    const query = "SELECT * FROM posture_data;";
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error querying database:", err.message);
            res.status(500).send(`<h1>Error querying database: ${err.message}</h1>`);
            return;
        }

        console.log("Query successful:", rows);

        if (rows.length === 0) {
            // Handle empty database case
            console.log("No data found in the posture_data table.");
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Posture Data</title>
                </head>
                <body>
                    <h1>No Posture Data Available</h1>
                    <p>The database is currently empty. Please start tracking data.</p>
                </body>
                </html>
            `);
            return;
        }

        // Generate HTML table from the query result
        const tableRows = rows
            .map(
                (row) => `
                <tr>
                    <td>${row.id}</td>
                    <td>${row.timestamp}</td>
                    <td>${row.posture}</td>
                    <td>${row.smoothed_spine_angle}</td>
                    <td>${row.yaw}</td>
                    <td>${row.pitch}</td>
                    <td>${row.roll}</td>
                </tr>`
            )
            .join("");

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Posture Data</title>
                <style>
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        margin-top: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px;
                    }
                    th {
                        background-color: #f4f4f4;
                        text-align: left;
                    }
                </style>
            </head>
            <body>
                <h1>Posture Data</h1>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Timestamp</th>
                            <th>Posture</th>
                            <th>Smoothed Spine Angle</th>
                            <th>Yaw</th>
                            <th>Pitch</th>
                            <th>Roll</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        // Send the generated HTML
        res.send(html);
    });

    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error("Error closing database:", err.message);
        } else {
            console.log("Database connection closed.");
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
