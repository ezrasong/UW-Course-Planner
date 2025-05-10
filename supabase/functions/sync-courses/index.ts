import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
);

const UW_API_KEY = Deno.env.get('UW_API_KEY')!;

function getCurrentTermCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const yearCode = year - 1900;
  const termDigit = month >= 1 && month <= 4 ? 1 : month <= 8 ? 5 : 9;
  return `${yearCode}${termDigit}`;
}

serve(async () => {
  try {
    const termCode = getCurrentTermCode();

    const res = await fetch(`https://openapi.data.uwaterloo.ca/v3/Courses/${termCode}`, {
      headers: { 'x-api-key': UW_API_KEY }
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch courses' }), { status: 500 });
    }

    const { data: courses } = await res.json();

    if (!courses || !Array.isArray(courses)) {
      return new Response(JSON.stringify({ error: 'Invalid course data' }), { status: 500 });
    }

    const { error: deleteErr } = await supabase
      .from('courses')
      .delete()
      .neq('term_code', termCode);

    if (deleteErr) {
      return new Response(JSON.stringify({ error: deleteErr.message }), { status: 500 });
    }

    const upsertPayload = courses.map((c: any) => ({
      course_id: c.courseId,
      term_code: c.termCode,
      term_name: c.termName,
      subject_code: c.subjectCode,
      catalog_number: c.catalogNumber,
      title: c.title,
      description: c.description,
      grading_basis: c.gradingBasis,
      course_component_code: c.courseComponentCode,
      enroll_consent_code: c.enrollConsentCode,
      enroll_consent_description: c.enrollConsentDescription,
      drop_consent_code: c.dropConsentCode,
      drop_consent_description: c.dropConsentDescription,
      requirements_description: c.requirementsDescription,
      is_required: c.isRequired ?? false,
      program_relevant: c.programRelevant ?? false,
      last_updated: new Date()
    }));

    const { error } = await supabase
      .from('courses')
      .upsert(upsertPayload, { onConflict: 'course_id' });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, termCode, count: upsertPayload.length }), {
      status: 200
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});