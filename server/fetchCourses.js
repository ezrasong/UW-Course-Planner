// server/fetchCourses.js
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WATERLOO_API_KEY = process.env.WATERLOO_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !WATERLOO_API_KEY) {
  console.error(
    "Missing one of SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WATERLOO_API_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const API_BASE = "https://api.uwaterloo.ca/v3/courses.json";

async function main() {
  console.log("Fetching Waterloo courses…");
  const resp = await fetch(`${API_BASE}?key=${WATERLOO_API_KEY}`);
  const { data } = await resp.json();
  const toUpsert = data.map((c) => ({
    course_id: c.courseId,
    term_code: c.term,
    subject_code: c.subjectCode,
    catalog_number: c.catalogNumber,
    title: c.title,
    description: c.description,
    prerequisites: c.requirementsDescription,
    grading_basis: c.gradingBasis,
  }));
  console.log(`Upserting ${toUpsert.length} courses…`);
  const { error } = await supabase
    .from("courses")
    .upsert(toUpsert, { onConflict: ["course_id", "term_code"] });
  if (error) throw error;
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
