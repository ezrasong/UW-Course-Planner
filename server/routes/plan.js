const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');

// GET /api/plan - Get user's planned courses
router.get('/', planController.getPlan);
// GET /api/plan/requirements - Check which requirements are fulfilled
router.get('/requirements', planController.checkRequirements);
// POST /api/plan - Add a course to plan
router.post('/', planController.addCourse);
// PUT /api/plan/:code - Update a planned course (mark completed or change term)
router.put('/:code', planController.updateCourse);
// DELETE /api/plan/:code - Remove a course from plan
router.delete('/:code', planController.deleteCourse);

module.exports = router;