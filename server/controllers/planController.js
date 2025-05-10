const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
const pool = require('../db').promise();  // use the same pool from db.js if exported

// Helper: load degree requirements JSON once
let degreePlan = null;
function loadDegreePlan() {
  if (!degreePlan) {
    const planPath = path.join(__dirname, '..', 'data', 'comp_math_plan.json');
    const raw = fs.readFileSync(planPath, 'utf-8');
    degreePlan = JSON.parse(raw);
  }
  return degreePlan;
}

// GET /api/plan - Return the current user's plan (list of planned courses)
exports.getPlan = async (req, res) => {
  try {
    const userId = req.user.uid;
    const [rows] = await pool.query(
      'SELECT course_code AS code, term, completed FROM user_courses WHERE user_id = ? ORDER BY term',
      [userId]
    );
    return res.json({ plan: rows });
  } catch (err) {
    console.error('DB error on GET plan:', err);
    return res.status(500).json({ error: 'Failed to retrieve plan' });
  }
};

// GET /api/plan/requirements - Check which degree requirements are fulfilled
exports.checkRequirements = async (req, res) => {
  try {
    const userId = req.user.uid;
    // Get user's courses (both completed and planned count towards fulfillment)
    const [rows] = await pool.query(
      'SELECT course_code FROM user_courses WHERE user_id = ?',
      [userId]
    );
    const userCourses = rows.map(r => r.course_code);
    const planData = loadDegreePlan();
    const requirements = planData.requirements.map(req => {
      // Determine if any of the options for this requirement is present in userCourses
      const fulfilledOption = req.options.find(code => userCourses.includes(code)) || null;
      return {
        description: req.description,
        fulfilled: fulfilledOption !== null,
        fulfilledBy: fulfilledOption    // which course code fulfills it (null if not fulfilled)
      };
    });
    return res.json({ requirements });
  } catch (err) {
    console.error('Error checking requirements:', err);
    return res.status(500).json({ error: 'Failed to check requirements' });
  }
};

// POST /api/plan - Add a new course to the user's plan
exports.addCourse = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { courseCode, term, completed=false } = req.body;
    if (!courseCode || !term) {
      return res.status(400).json({ error: 'courseCode and term are required' });
    }
    // Insert course (or ignore if already exists)
    await pool.query(
      'INSERT IGNORE INTO user_courses (user_id, course_code, term, completed) VALUES (?, ?, ?, ?)',
      [userId, courseCode, term, completed ? 1 : 0]
    );
    return res.status(201).json({ message: 'Course added' });
  } catch (err) {
    console.error('DB error on ADD course:', err);
    return res.status(500).json({ error: 'Failed to add course' });
  }
};

// PUT /api/plan/:code - Update an existing planned course entry
exports.updateCourse = async (req, res) => {
  try {
    const userId = req.user.uid;
    const courseCode = req.params.code;
    const { term, completed } = req.body;
    if (!term && completed === undefined) {
      return res.status(400).json({ error: 'Nothing to update' });
    }
    // Build dynamic SQL based on provided fields
    let sql = 'UPDATE user_courses SET ';
    const params = [];
    if (term) {
      sql += 'term = ?';
      params.push(term);
    }
    if (completed !== undefined) {
      if (term) sql += ', ';  // add comma if term was included
      sql += 'completed = ?';
      params.push(completed ? 1 : 0);
    }
    sql += ' WHERE user_id = ? AND course_code = ?';
    params.push(userId, courseCode);
    const [result] = await pool.query(sql, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Course not found in plan' });
    }
    return res.json({ message: 'Course updated' });
  } catch (err) {
    console.error('DB error on UPDATE course:', err);
    return res.status(500).json({ error: 'Failed to update course' });
  }
};

// DELETE /api/plan/:code - Remove a course from the plan
exports.deleteCourse = async (req, res) => {
  try {
    const userId = req.user.uid;
    const courseCode = req.params.code;
    const [result] = await pool.query(
      'DELETE FROM user_courses WHERE user_id = ? AND course_code = ?',
      [userId, courseCode]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Course not found in plan' });
    }
    return res.json({ message: 'Course removed' });
  } catch (err) {
    console.error('DB error on DELETE course:', err);
    return res.status(500).json({ error: 'Failed to remove course' });
  }
};