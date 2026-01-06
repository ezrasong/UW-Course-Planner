export const DEFAULT_PLAN_NAME = "Custom Plan";

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
    relevantSubjects,
    requirements,
  };
}

export const DEFAULT_PLAN = normalizePlan({
  name: DEFAULT_PLAN_NAME,
  relevantSubjects: [],
  requirements: [],
});
