import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("URL")!,
  Deno.env.get("SERVICE_ROLE_KEY")!
);

const UW_API_KEY = Deno.env.get("UW_API_KEY")!;

const COMP_MATH_REQUIREMENTS = [
  "MATH135",
  "MATH137",
  "MATH136",
  "MATH138",
  "CS115",
  "CS135",
  "CS116",
  "CS136",
  "ENGL119",
  "SPCOM100",
  "STAT230",
  "STAT240",
  "CO250",
  "MATH235",
  "MATH237",
];

const RELEVANT_SUBJECTS = new Set([
  "MATH",
  "AMATH",
  "PMATH",
  "CS",
  "CO",
  "STAT",
]);

function getCurrentTermCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const yearCode = year - 1900;
  const termDigit = month <= 4 ? 1 : month <= 8 ? 5 : 9;
  return `${yearCode}${termDigit}`;
}

serve(async () => {
  const termCode = getCurrentTermCode();

  try {
    const res = await fetch(
      `https://openapi.data.uwaterloo.ca/v3/Courses/${termCode}`,
      {
        headers: { "x-api-key": UW_API_KEY },
      }
    );

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch course data" }),
        { status: 500 }
      );
    }

    const body = await res.json();
    const courses = Array.isArray(body) ? body : body.data;

    const requiredSet = new Set(COMP_MATH_REQUIREMENTS);

    const upsertData = courses.map((c: any) => {
      const subject = c.subjectCode;
      const number = c.catalogNumber;
      const code = `${subject}${number}`;

      return {
        course_id: c.courseId,
        term_code: c.termCode,
        term_name: c.termName,
        subject_code: subject,
        catalog_number: number,
        title: c.title,
        description: c.description,
        grading_basis: c.gradingBasis,
        course_component_code: c.courseComponentCode,
        enroll_consent_code: c.enrollConsentCode,
        enroll_consent_description: c.enrollConsentDescription,
        drop_consent_code: c.dropConsentCode,
        drop_consent_description: c.dropConsentDescription,
        requirements_description: c.requirementsDescription,
        is_required: requiredSet.has(code),
        program_relevant:
          RELEVANT_SUBJECTS.has(subject) || requiredSet.has(code),
        last_updated: new Date(),
      };
    });

    const { error } = await supabase
      .from("courses")
      .upsert(upsertData, { onConflict: "course_id" });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted: upsertData.length,
        termCode,
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
});
