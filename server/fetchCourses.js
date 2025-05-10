const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
});
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

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
  const WATERLOO_API_KEY = process.env.WATERLOO_API_KEY || process.env.API_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!WATERLOO_API_KEY) {
    console.error("Missing WATERLOO_API_KEY (or API_KEY).");
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const termCode = getCurrentTermCode();
  const url = `https://openapi.data.uwaterloo.ca/v3/courses/${termCode}?key=${WATERLOO_API_KEY}`;

  try {
    console.log(`Fetching courses for term ${termCode}…`);
    const res = await axios.get(url);
    const courses = Array.isArray(res.data.data) ? res.data.data : [];

    console.log(`Upserting ${courses.length} courses into Supabase…`);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const toUpsert = courses.map((c) => ({
      course_id: String(c.courseId),
      term_code: c.term,
      subject_code: c.subjectCode,
      catalog_number: c.catalogNumber,
      title: c.title,
      description: c.description || "",
      requirements_description: c.requirementsDescription || "",
      grading_basis: c.gradingBasis || "",
      component_code: c.courseComponentCode || "",
      enroll_consent_code: c.enrollConsentCode || "",
      enroll_consent_description: c.enrollConsentDescription || "",
      drop_consent_code: c.dropConsentCode || "",
      drop_consent_description: c.dropConsentDescription || "",
    }));

    const { error } = await supabase
      .from("courses")
      .upsert(toUpsert, { onConflict: ["course_id", "term_code"] });

    if (error) throw error;
    console.log("Done upserting courses.");
  } catch (err) {
    console.error("Error fetching or upserting courses:", err.message || err);
    process.exit(1);
  }
})();
