// server/fetchCourses.js
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
});

const axios = require("axios");
const fs = require("fs");

function getCurrentTermCode() {
  const now = new Date();
  const yy = now.getFullYear() - 1900;
  const m = now.getMonth() + 1;
  let term;
  if (m >= 1 && m <= 4) term = 1;
  else if (m >= 5 && m <= 8) term = 5;
  else term = 9;
  return `${yy}${term}`;
}

(async () => {
  // use WATERLOO_API_KEY first, then API_KEY for local dev
  const key = process.env.WATERLOO_API_KEY || process.env.API_KEY;
  if (!key) {
    console.error(
      "Missing environment variable WATERLOO_API_KEY (or API_KEY for local)."
    );
    process.exit(1);
  }

  const termCode = getCurrentTermCode();
  const url = `https://openapi.data.uwaterloo.ca/v3/courses/${termCode}?key=${key}`;

  try {
    const res = await axios.get(url);
    const courses = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data.data)
      ? res.data.data
      : [];

    const outPath = path.resolve(__dirname, "..", "data", "courses.json");
    fs.writeFileSync(outPath, JSON.stringify(courses, null, 2), "utf-8");
    console.log(`Fetched ${courses.length} courses → wrote data/courses.json`);
  } catch (err) {
    console.error(
      "Error fetching course data:",
      err.response?.status,
      err.message
    );
    process.exit(1);
  }
})();
