const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
app.use(bodyParser.json());

// Database Connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
}).promise();

//Health checkpoint
app.get('/', (req, res) => {
    res.send('School Management API is running');
});

//addSchool
app.post('/addSchool', (req, res) => {
    const { name, address, latitude, longitude } = req.body;

    if (!name || !address || !latitude || !longitude) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    const query = 'INSERT INTO school (name, address, latitude, longitude) VALUES (?, ?, ?, ?)';
    db.execute(query, [name, address, latitude, longitude], (err, results) => {
        if (err){console.log(err); return res.status(500).json({ error: 'Database error' });}
        res.status(201).json({ message: 'School added successfully', id: results.insertId });
    });
});

//listSchools
app.get('/listSchools', async (req, res) => {
     
    //fetch from query
    const userLat = parseFloat(req.query.latitude);
    const userLng = parseFloat(req.query.longitude);

    //fetch from body if not in query
    if (isNaN(userLat) || isNaN(userLng)) {
        if (req.body.latitude && req.body.longitude) {
            userLat = parseFloat(req.body.latitude);
            userLng = parseFloat(req.body.longitude);
        }
    }

    if (isNaN(userLat) || isNaN(userLng)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
    }
    
    //if fetched
    try {
        const [rows] = await db.query(
            `SELECT 
                 id, 
                 name, 
                 address, 
                 latitude, 
                 longitude,
                 (6371 * ACOS(
                     COS(RADIANS(?)) * COS(RADIANS(latitude)) *
                     COS(RADIANS(longitude) - RADIANS(?)) +
                     SIN(RADIANS(?)) * SIN(RADIANS(latitude))
                 )) AS distance
             FROM school
             ORDER BY distance ASC`,
            [userLat, userLng, userLat]
        );

        res.json(rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed' });
    }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
