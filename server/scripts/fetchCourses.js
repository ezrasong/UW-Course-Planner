const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
});

const axios = require("axios");
const fs = require("fs");

function getCurrentTermCode() {
  const now = new Date();
  const yy = now.getFullYear() - 1900; // e.g. 2025 -> 125
  const m = now.getMonth() + 1; // months 1–12
  let term;
  if (m >= 1 && m <= 4) term = 1; // Winter
  else if (m >= 5 && m <= 8) term = 5; // Spring/Summer
  else term = 9; // Fall
  return `${yy}${term}`;
}

(async () => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API_KEY not set in server/.env");
    process.exit(1);
  }

  const termCode = getCurrentTermCode();
  const url = `https://openapi.data.uwaterloo.ca/v3/Courses/${termCode}`;

  try {
    const res = await axios.get(url, {
      headers: { "X-API-KEY": key },
    });

    const courses = Array.isArray(res.data) ? res.data : res.data.data || [];

    const outPath = path.resolve(__dirname, "..", "data", "courses.json");
    fs.writeFileSync(outPath, JSON.stringify(courses, null, 2), "utf-8");
    console.log(
      `Fetched ${courses.length} courses and wrote to data/courses.json`
    );
  } catch (err) {
    console.error(
      "Error fetching course data:",
      err.response?.status,
      err.response?.statusText
    );
    console.error(err.response?.data || err.message);
    process.exit(1);
  }
})();