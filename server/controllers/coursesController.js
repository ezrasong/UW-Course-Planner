const fs = require('fs');
const path = require('path');

// Controller to handle GET /api/courses
exports.getCourses = async (req, res) => {
  try {
    const dataPath = path.join(__dirname, '..', 'data', 'courses.json');
    const fileData = await fs.promises.readFile(dataPath, 'utf-8');
    const courses = JSON.parse(fileData);
    return res.json(courses);
  } catch (err) {
    console.error('Failed to read courses.json:', err);
    return res.status(500).json({ error: 'Could not load course data' });
  }
};