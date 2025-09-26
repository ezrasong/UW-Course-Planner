import { supabase } from "../supabaseClient";

export async function fetchCourses() {
  const { data, error } = await supabase
    .from("courses")
    .select(
      `
        course_id,
        subject,
        catalog_number,
        title,
        description,
        requirements_description,
        grading_basis,
        component_code,
        enroll_consent_code,
        enroll_consent_description,
        drop_consent_code,
        drop_consent_description,
        is_required,
        program_relevant,
        term_code
      `
    )
    .neq("subject", "TI")
    .order("subject", { ascending: true })
    .order("catalog_number", { ascending: true });

  if (error) {
    console.error("Supabase error fetching courses:", error);
    throw error;
  }

  return data.map((c) => ({
    courseId: c.course_id,
    subjectCode: c.subject,
    catalogNumber: c.catalog_number,
    title: c.title,
    description: c.description,
    requirementsDescription: c.requirements_description,
    gradingBasis: c.grading_basis,
    courseComponentCode: c.component_code,
    enrollConsentCode: c.enroll_consent_code,
    enrollConsentDescription: c.enroll_consent_description,
    dropConsentCode: c.drop_consent_code,
    dropConsentDescription: c.drop_consent_description,
    isRequired: c.is_required,
    programRelevant: c.program_relevant,
    termCode: c.term_code,
  }));
}
