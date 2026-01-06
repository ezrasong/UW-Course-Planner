import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import plan from "./comp_math_plan.json" assert { type: "json" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Supabase env vars are missing for fetch-courses");
  throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const API_KEY = Deno.env.get("UW_API_KEY");
if (!API_KEY) {
  console.error("Missing UW_API_KEY secret");
  throw new Error("UW_API_KEY is not set");
}

const relevantSubjects = new Set([
  "MATH",
  "AMATH",
  "CO",
  "CS",
  "PMATH",
  "STAT",
]);

function getTermCode(date = new Date()): string {
  const year = date.getFullYear();
  const centuryOffset = Math.floor((year - 1900) / 100);
  const yy = String(year % 100).padStart(2, "0");
  const month = date.getMonth() + 1;
  const termDigit = month <= 4 ? 1 : month <= 8 ? 5 : 9;
  return `${centuryOffset}${yy}${termDigit}`;
}

serve(async () => {
  try {
    const termCode = getTermCode();

    // 1) Fetch from UW OpenAPI
    const resp = await fetch(
      `https://openapi.data.uwaterloo.ca/v3/Courses/${termCode}`,
      { headers: { "X-API-KEY": API_KEY } }
    );
    if (resp.status === 401) {
      console.error("UW API 401 – invalid or unconfirmed key");
      return new Response("Unauthorized", { status: 502 });
    }
    if (!resp.ok) {
      console.error("Fetch failed:", resp.status, resp.statusText);
      return new Response("Fetch error", { status: 502 });
    }

    const body = await resp.json();
    const courses: any[] = Array.isArray(body) ? body : body.data;

    // 2) Build the set of required courses from your plan JSON
    const requiredSet = new Set<string>();
    for (const req of plan.requirements) {
      for (const code of req.options) {
        requiredSet.add(code);
      }
    }

    // 3) Transform & tag each course
    const rows = courses.map((c: any) => {
      const key = `${c.subjectCode}${c.catalogNumber}`;
      return {
        course_id: Number(c.courseId),
        term_code: termCode,
        subject: c.subjectCode,
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
        is_required: requiredSet.has(key),
        program_relevant:
          requiredSet.has(key) || relevantSubjects.has(c.subjectCode),
      };
    });

    const uniqueMap = new Map<string, (typeof rows)[0]>();
    for (const row of rows) {
      const compositeKey = `${row.course_id}:${row.term_code}`;
      uniqueMap.set(compositeKey, row);
    }
    const deduped = Array.from(uniqueMap.values());

    const { error } = await supabase
      .from("courses")
      .upsert(deduped, { onConflict: "course_id,term_code" });

    if (error) {
      console.error("Upsert error:", error);
      return new Response("Database error", { status: 500 });
    }

    return new Response("Courses updated", { status: 200 });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
