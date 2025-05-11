import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@^2";

import plan from "./comp_math_plan.json" assert { type: "json" };

const supabase = createClient(
  Deno.env.get("URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

const WATERLOO_API_KEY = Deno.env.get("API_KEY")!;

function getTermCode(date = new Date()): string {
  const year = date.getFullYear();
  const centuryOffset = Math.floor((year - 1900) / 100);
  const yy = String(year % 100).padStart(2, "0");
  const month = date.getMonth() + 1;
  let termDigit: number;
  if (month >= 1 && month <= 4) termDigit = 1;
  else if (month >= 5 && month <= 8) termDigit = 5; 
  else termDigit = 9; 
  return `${centuryOffset}${yy}${termDigit}`;
}

serve(async () => {
  const termCode = getTermCode();
  const apiUrl = `https://openapi.data.uwaterloo.ca/v3/Courses/${termCode}`;
  const resp = await fetch(apiUrl, {
    headers: { "X-API-KEY": WATERLOO_API_KEY },
  });
  if (!resp.ok) {
    console.error("Fetch error:", resp.status, resp.statusText);
    return new Response("Failed to fetch courses", { status: 502 });
  }
  const payload = await resp.json();
  const courses: any[] = Array.isArray(payload) ? payload : payload.data;

  const requiredSet = new Set(
    plan.required.map((c: any) => c.subject + c.catalog)
  );
  const relevantSet = new Set(
    plan.relevant.map((c: any) => c.subject + c.catalog)
  );

  const rows = courses.map((c: any) => {
    const key = c.subjectCode + c.catalogNumber;
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
      program_relevant: requiredSet.has(key) || relevantSet.has(key),
    };
  });

  const { error } = await supabase
    .from("courses")
    .upsert(rows, { onConflict: ["course_id", "term_code"] });

  if (error) {
    console.error("Upsert error:", error);
    return new Response("Database upsert failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});
