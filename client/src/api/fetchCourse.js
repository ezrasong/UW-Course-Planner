import { supabase } from "../lib/supabaseClient";

export async function fetchCoursesFromDb() {
  const { data, error } = await supabase
    .from("courses")
    .select("*");

  if (error) {
    console.error("Supabase error fetching courses:", error);
    throw error;
  }

  return data.map((c) => ({
    courseId:                  c.course_id,
    subjectCode:               c.subject,
    catalogNumber:             c.catalog_number,
    title:                     c.title,
    description:               c.description,
    requirementsDescription:   c.requirements_description,
    gradingBasis:              c.grading_basis,
    courseComponentCode:       c.component_code,
    enrollConsentCode:         c.enroll_consent_code,
    enrollConsentDescription:  c.enroll_consent_description,
    dropConsentCode:           c.drop_consent_code,
    dropConsentDescription:    c.drop_consent_description,
    isRequired:                c.is_required,
    programRelevant:           c.program_relevant,
    termCode:                  c.term_code,
  }));
}
