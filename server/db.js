// server/db.js
require('dotenv').config();           // ← make sure this is first
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host:     process.env.DB_HOST,     // e.g. 'localhost'
  user:     process.env.DB_USER,     // e.g. 'planner_user'
  password: process.env.DB_PASS,     // e.g. 'PlannerPass123'
  database: process.env.DB_NAME      // e.g. 'course_planner_db'
});

connection.connect(err => {
  if (err) {
    console.error('MySQL connection error:', err);
    process.exit(1);
  }
  console.log('MySQL connected!');
});

module.exports = connection;
