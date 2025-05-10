require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const admin = require('firebase-admin');
const coursesRoutes = require('./routes/courses');
const planRoutes = require('./routes/plan');

// Initialize MySQL connection pool
const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
}).promise();

// Initialize Firebase Admin SDK for verifying tokens
admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
});

// Middleware to authenticate Firebase token on protected routes
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s/, '');
  if (!token) return res.status(401).json({ error: 'Missing authorization token' });
  try {
    // Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, name: decoded.name || '', email: decoded.email || '' };
    // Ensure user exists in DB (insert on first login)
    await pool.query(
      'INSERT IGNORE INTO users (id, name, email) VALUES (?, ?, ?)',
      [req.user.uid, req.user.name, req.user.email]
    );
    return next();
  } catch (err) {
    console.error('Auth verification failed:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api/courses', coursesRoutes);             // public
app.use('/api/plan', verifyToken, planRoutes);      // protected (requires auth token)

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
  // Catch-all to serve index.html for any other request (SPA routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
  });
}

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});