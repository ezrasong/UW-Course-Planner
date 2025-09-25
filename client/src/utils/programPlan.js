import compMathPlan from "../data/comp_math_plan.json";

export const DEFAULT_PLAN_NAME = "Computational Mathematics";
export const DEFAULT_SUBJECTS = ["MATH", "AMATH", "CO", "CS", "PMATH", "STAT"];

export function normalizePlan(rawPlan = {}) {
  const requirements = Array.isArray(rawPlan.requirements)
    ? rawPlan.requirements
        .map((req) => {
          const description =
            typeof req?.description === "string" && req.description.trim()
              ? req.description.trim()
              : null;
          const options = Array.isArray(req?.options)
            ? req.options
                .map((code) =>
                  typeof code === "string" && code.trim() ? code.trim() : null
                )
                .filter(Boolean)
            : [];
          if (!description && options.length === 0) return null;
          return {
            description: description || options.join(", "),
            options,
          };
        })
        .filter(Boolean)
    : [];

  const relevantSubjects = Array.isArray(rawPlan.relevantSubjects)
    ? rawPlan.relevantSubjects
        .map((subj) =>
          typeof subj === "string" && subj.trim() ? subj.trim().toUpperCase() : null
        )
        .filter(Boolean)
    : [];

  return {
    name:
      (typeof rawPlan.name === "string" && rawPlan.name.trim()) ||
      DEFAULT_PLAN_NAME,
    relevantSubjects:
      relevantSubjects.length > 0 ? relevantSubjects : DEFAULT_SUBJECTS,
    requirements,
  };
}

export const DEFAULT_PLAN = normalizePlan(compMathPlan);
