const express = require('express');
const router = express.Router();
const coursesController = require('../controllers/coursesController');

// GET /api/courses - returns all course data (with program tags)
router.get('/', coursesController.getCourses);

module.exports = router;