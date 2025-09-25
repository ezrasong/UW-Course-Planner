import React, { useState, useMemo, useCallback } from "react";
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Chip,
  Checkbox,
  Stack,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  Button,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Download as DownloadIcon,
  CalendarMonth as CalendarMonthIcon,
  FlagCircle as FlagCircleIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";

const termOrder = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];
const fallbackTerm = "Unassigned";
const termOptions = [...termOrder, fallbackTerm];

const requirementStatusConfig = {
  complete: { label: "Satisfied", color: "success" },
  "in-progress": { label: "Planned", color: "info" },
  missing: { label: "Not planned", color: "warning" },
};

export default function Planner({
  plan,
  coursesMap,
  onRemoveCourse,
  onToggleComplete,
  onUpdateCourseTerm,
  programPlan,
}) {
  const [search, setSearch] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);

  const allSubjects = useMemo(() => {
    const set = new Set();
    plan.forEach((item) => {
      const match = item.course_code.match(/^[A-Za-z]+/);
      if (match) set.add(match[0]);
    });
    return Array.from(set).sort();
  }, [plan]);

  const requiredSet = useMemo(() => {
    const s = new Set();
    (programPlan?.requirements || []).forEach((group) => {
      (group?.options || []).forEach((code) => s.add(code));
    });
    return s;
  }, [programPlan]);

  const filteredPlan = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plan.filter((item) => {
      const subject = item.course_code.match(/^[A-Za-z]+/)[0];
      if (subjects.length && !subjects.includes(subject)) return false;
      if (statusFilter === "complete" && !item.completed) return false;
      if (statusFilter === "incomplete" && item.completed) return false;
      if (q) {
        const code = item.course_code.toLowerCase();
        const title = (coursesMap[item.course_code]?.title || "").toLowerCase();
        return code.includes(q) || title.includes(q);
      }
      return true;
    });
  }, [plan, search, subjects, statusFilter, coursesMap]);

  const progress = useMemo(() => {
    const total = plan.length;
    const completed = plan.filter((item) => item.completed).length;
    const planned = plan.filter((item) => !item.completed).length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, planned, percentage };
  }, [plan]);

  const groupedPlan = useMemo(() => {
    const groups = new Map();
    filteredPlan.forEach((item) => {
      const term = item.term || fallbackTerm;
      if (!groups.has(term)) {
        groups.set(term, []);
      }
      groups.get(term).push(item);
    });
    groups.forEach((list) =>
      list.sort((a, b) => a.course_code.localeCompare(b.course_code))
    );
    return groups;
  }, [filteredPlan]);

  const termKeys = useMemo(() => {
    const keys = Array.from(groupedPlan.keys());
    return keys.sort((a, b) => {
      const ai = termOrder.indexOf(a);
      const bi = termOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [groupedPlan]);

  const requirementProgress = useMemo(() => {
    return (programPlan?.requirements || []).map((group, idx) => {
      const description = group.description || `Requirement ${idx + 1}`;
      const options = (group.options || []).map((code) => {
        const entry = plan.find((item) => item.course_code === code);
        return {
          code,
          planned: Boolean(entry),
          completed: Boolean(entry?.completed),
        };
      });
      const status = options.some((opt) => opt.completed)
        ? "complete"
        : options.some((opt) => opt.planned)
        ? "in-progress"
        : "missing";
      return { description, options, status };
    });
  }, [plan, programPlan]);

  const requirementSummary = useMemo(() => {
    return requirementProgress.reduce(
      (acc, group) => {
        acc[group.status] += 1;
        return acc;
      },
      { complete: 0, "in-progress": 0, missing: 0 }
    );
  }, [requirementProgress]);

  const highlightCourses = useMemo(
    () =>
      requirementProgress
        .flatMap((group) =>
          group.options
            .filter((opt) => !opt.completed)
            .map((opt) => ({
              code: opt.code,
              planned: opt.planned,
              group: group.description,
              status: opt.planned ? "planned" : "missing",
            }))
        )
        .sort((a, b) => {
          if (a.status === b.status) {
            return a.code.localeCompare(b.code);
          }
          return a.status === "missing" ? -1 : 1;
        })
        .slice(0, 4),
    [requirementProgress]
  );

  const openDialog = useCallback((code) => {
    setSelectedCode(code);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setSelectedCode(null);
    setDialogOpen(false);
  }, []);

  const selectedCourse = selectedCode ? coursesMap[selectedCode] : null;
  const selectedPlanEntry = useMemo(
    () => plan.find((item) => item.course_code === selectedCode),
    [plan, selectedCode]
  );

  const handleTermChange = useCallback(
    (code, value) => {
      if (!onUpdateCourseTerm) return;
      const entryExists = plan.some((item) => item.course_code === code);
      if (!entryExists) return;
      const normalized = value === fallbackTerm ? null : value;
      onUpdateCourseTerm(code, normalized);
    },
    [onUpdateCourseTerm, plan]
  );

  const handleExport = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      plan: plan.map((entry) => ({
        course_code: entry.course_code,
        term: entry.term,
        completed: entry.completed,
        title: coursesMap[entry.course_code]?.title || null,
      })),
      programPlan: programPlan || null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uw-course-plan-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [coursesMap, plan, programPlan]);

  const overviewStats = [
    { label: "Completed", value: progress.completed },
    { label: "Scheduled", value: progress.planned },
    { label: "Total courses", value: progress.total },
  ];

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid item xs={12} xl={4}>
          <Stack spacing={3}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 3,
                height: "100%",
                background: (theme) =>
                  theme.palette.mode === "light"
                    ? "linear-gradient(145deg, rgba(0,91,234,0.12), rgba(14,116,144,0.08))"
                    : "linear-gradient(145deg, rgba(59,130,246,0.22), rgba(14,116,144,0.25))",
              }}
            >
              <Stack spacing={2.5} height="100%">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <CalendarMonthIcon color="secondary" fontSize="small" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Planner overview
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Track your momentum at a glance and export a shareable plan for
                  advisors or teammates.
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  {overviewStats.map((stat) => (
                    <Box key={stat.label}>
                      <Typography variant="caption" color="text.secondary">
                        {stat.label}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {stat.value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
                <Stack direction="row" spacing={2} alignItems="center">
                  <LinearProgress
                    variant="determinate"
                    value={progress.percentage}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 5 }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {progress.percentage}%
                  </Typography>
                </Stack>
                <Tooltip title="Download this plan as a JSON file for backups or advising">
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<DownloadIcon />}
                    onClick={handleExport}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Export plan
                  </Button>
                </Tooltip>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Refine your view
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Filter by subject or completion status to focus on a specific
                    slice of your roadmap.
                  </Typography>
                </Box>
                <Divider />
                <Stack
                  direction={{ xs: "column", lg: "row" }}
                  spacing={2}
                  alignItems={{ xs: "stretch", lg: "center" }}
                  flexWrap="wrap"
                >
                  <TextField
                    label="Search plan"
                    size="small"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ minWidth: { xs: "100%", sm: 220 }, flexGrow: 1 }}
                  />
                  <FormControl sx={{ minWidth: 200 }} size="small">
                    <InputLabel>Subject</InputLabel>
                    <Select
                      multiple
                      value={subjects}
                      onChange={(e) => setSubjects(e.target.value)}
                      input={<OutlinedInput label="Subject" />}
                      renderValue={(sel) => (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                          {sel.map((s) => (
                            <Chip key={s} label={s} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      {allSubjects.map((subj) => (
                        <MenuItem key={subj} value={subj}>
                          <Checkbox checked={subjects.includes(subj)} />
                          <Typography sx={{ ml: 1 }}>{subj}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: 200 }} size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      input={<OutlinedInput label="Status" />}
                    >
                      <MenuItem value="all">All courses</MenuItem>
                      <MenuItem value="complete">Completed only</MenuItem>
                      <MenuItem value="incomplete">Still planned</MenuItem>
                    </Select>
                  </FormControl>
                  {(search || subjects.length || statusFilter !== "all") && (
                    <Button
                      color="secondary"
                      onClick={() => {
                        setSearch("");
                        setSubjects([]);
                        setStatusFilter("all");
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <FlagCircleIcon color="secondary" fontSize="small" />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Next best actions
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Surface incomplete requirements and see whether they still need to
                  be scheduled or simply marked complete.
                </Typography>
                <Stack spacing={1.5}>
                  {highlightCourses.length ? (
                    highlightCourses.map((item) => (
                      <Box
                        key={item.code}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: (theme) =>
                            `1px solid ${
                              theme.palette.mode === "light"
                                ? "rgba(148,163,184,0.35)"
                                : "rgba(71,85,105,0.6)"
                            }`,
                          backgroundColor: (theme) =>
                            item.status === "missing"
                              ? theme.palette.mode === "light"
                                ? "rgba(239,68,68,0.08)"
                                : "rgba(248,113,113,0.18)"
                              : theme.palette.mode === "light"
                              ? "rgba(59,130,246,0.08)"
                              : "rgba(96,165,250,0.16)",
                        }}
                      >
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          justifyContent="space-between"
                          alignItems={{ xs: "flex-start", sm: "center" }}
                        >
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {item.code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Requirement: {item.group}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            color={item.status === "missing" ? "warning" : "info"}
                            variant={item.status === "missing" ? "filled" : "outlined"}
                            label={item.status === "missing" ? "Not in plan" : "Scheduled"}
                          />
                        </Stack>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      All tracked requirements are currently covered. Keep an eye on
                      term loads as you finalize electives.
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Grid>

        <Grid item xs={12} xl={8}>
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Term roadmap
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Adjust term assignments, monitor completion progress, and ensure
                    required courses are evenly distributed.
                  </Typography>
                </Box>
                {termKeys.length === 0 ? (
                  <Paper
                    variant="outlined"
                    sx={{ p: { xs: 3, md: 4 }, borderRadius: 3 }}
                  >
                    <Typography variant="h6" gutterBottom>
                      No courses in your plan yet
                    </Typography>
                    <Typography color="text.secondary">
                      Head to the catalog to add classes — they’ll appear here with
                      flexible term assignments.
                    </Typography>
                  </Paper>
                ) : (
                  <Stack spacing={2.5}>
                    {termKeys.map((term) => {
                      const courses = groupedPlan.get(term) || [];
                      const completedCount = courses.filter((item) => item.completed).length;
                      const requiredCount = courses.filter((item) =>
                        requiredSet.has(item.course_code)
                      ).length;
                      const percent = courses.length
                        ? Math.round((completedCount / courses.length) * 100)
                        : 0;
                      const termLabel = term === fallbackTerm ? "Unassigned" : term;
                      return (
                        <Box
                          key={term}
                          sx={{
                            p: { xs: 2, md: 2.5 },
                            borderRadius: 3,
                            border: (theme) =>
                              `1px solid ${
                                theme.palette.mode === "light"
                                  ? "rgba(148,163,184,0.35)"
                                  : "rgba(71,85,105,0.6)"
                              }`,
                            backgroundColor: (theme) =>
                              theme.palette.mode === "light"
                                ? "rgba(248,250,252,0.6)"
                                : "rgba(30,41,59,0.6)",
                          }}
                        >
                          <Stack spacing={2}>
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1.5}
                              justifyContent="space-between"
                              alignItems={{ xs: "flex-start", sm: "center" }}
                            >
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {termLabel}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {courses.length} course{courses.length === 1 ? "" : "s"}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1} alignItems="center">
                                {requiredCount > 0 && (
                                  <Chip
                                    size="small"
                                    color="secondary"
                                    variant="outlined"
                                    label={`${requiredCount} required`}
                                  />
                                )}
                                <Chip
                                  size="small"
                                  color={percent === 100 ? "success" : "primary"}
                                  variant={percent === 100 ? "filled" : "outlined"}
                                  label={`${percent}% complete`}
                                />
                              </Stack>
                            </Stack>
                            {courses.length > 0 && (
                              <>
                                <LinearProgress
                                  variant="determinate"
                                  value={percent}
                                  sx={{ height: 6, borderRadius: 4 }}
                                />
                                <Stack spacing={1.5}>
                                  {courses.map((item) => {
                                    const code = item.course_code;
                                    const course = coursesMap[code];
                                    const required = requiredSet.has(code);
                                    return (
                                      <Paper
                                        key={code}
                                        variant="outlined"
                                        sx={{
                                          borderRadius: 2,
                                          p: { xs: 1.5, md: 2 },
                                          backgroundColor: (theme) =>
                                            theme.palette.mode === "light"
                                              ? "rgba(255,255,255,0.85)"
                                              : "rgba(15,23,42,0.85)",
                                        }}
                                      >
                                        <Stack spacing={1.5}>
                                          <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            spacing={1.5}
                                            justifyContent="space-between"
                                            alignItems={{ xs: "flex-start", sm: "center" }}
                                          >
                                            <Box>
                                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                {code}
                                              </Typography>
                                              <Typography variant="body2" color="text.secondary">
                                                {course?.title || "Course title unavailable"}
                                              </Typography>
                                            </Box>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                              {required && (
                                                <Chip size="small" color="secondary" label="Required" />
                                              )}
                                              <Chip
                                                size="small"
                                                color={item.completed ? "success" : "info"}
                                                variant={item.completed ? "filled" : "outlined"}
                                                label={item.completed ? "Completed" : "Planned"}
                                              />
                                            </Stack>
                                          </Stack>

                                          <Stack
                                            direction={{ xs: "column", md: "row" }}
                                            spacing={1.5}
                                            alignItems={{ xs: "stretch", md: "center" }}
                                            justifyContent="space-between"
                                          >
                                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                              <InputLabel>Term</InputLabel>
                                              <Select
                                                label="Term"
                                                value={item.term || fallbackTerm}
                                                onChange={(e) => handleTermChange(code, e.target.value)}
                                              >
                                                {termOptions.map((termOption) => (
                                                  <MenuItem key={termOption} value={termOption}>
                                                    {termOption === fallbackTerm
                                                      ? "Unassigned"
                                                      : termOption}
                                                  </MenuItem>
                                                ))}
                                              </Select>
                                            </FormControl>
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                              <Tooltip
                                                title={
                                                  item.completed
                                                    ? "Mark as incomplete"
                                                    : "Mark as completed"
                                                }
                                              >
                                                <IconButton
                                                  size="small"
                                                  color={item.completed ? "success" : "default"}
                                                  onClick={() => onToggleComplete(code)}
                                                >
                                                  {item.completed ? (
                                                    <CheckCircleIcon fontSize="small" />
                                                  ) : (
                                                    <RadioButtonUncheckedIcon fontSize="small" />
                                                  )}
                                                </IconButton>
                                              </Tooltip>
                                              <Tooltip title="View details">
                                                <IconButton size="small" onClick={() => openDialog(code)}>
                                                  <InfoIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                              <Tooltip title="Remove from plan">
                                                <IconButton
                                                  size="small"
                                                  color="error"
                                                  onClick={() => onRemoveCourse(code)}
                                                >
                                                  <DeleteIcon fontSize="small" />
                                                </IconButton>
                                              </Tooltip>
                                            </Stack>
                                          </Stack>
                                        </Stack>
                                      </Paper>
                                    );
                                  })}
                                </Stack>
                              </>
                            )}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            </Paper>

            {requirementProgress.length > 0 && (
              <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
                <Stack spacing={2.5}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Requirement tracker
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Expand any group to review the eligible courses and see how
                        your plan stacks up.
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {Object.keys(requirementStatusConfig).map((key) => (
                        <Chip
                          key={key}
                          size="small"
                          color={requirementStatusConfig[key].color}
                          variant="outlined"
                          label={`${requirementStatusConfig[key].label}: ${
                            requirementSummary[key]
                          }`}
                        />
                      ))}
                    </Stack>
                  </Stack>

                  <Stack spacing={1.5}>
                    {requirementProgress.map((group, idx) => (
                      <Accordion
                        key={`${group.description}-${idx}`}
                        disableGutters
                        elevation={0}
                        sx={{
                          borderRadius: 2,
                          border: (theme) =>
                            `1px solid ${
                              theme.palette.mode === "light"
                                ? "rgba(148,163,184,0.3)"
                                : "rgba(71,85,105,0.6)"
                            }`,
                          backgroundColor: (theme) =>
                            group.status === "complete"
                              ? theme.palette.mode === "light"
                                ? "rgba(16,185,129,0.08)"
                                : "rgba(34,197,94,0.15)"
                              : group.status === "in-progress"
                              ? theme.palette.mode === "light"
                                ? "rgba(59,130,246,0.08)"
                                : "rgba(96,165,250,0.16)"
                              : undefined,
                        }}
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1.5}
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", sm: "center" }}
                            width="100%"
                          >
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {group.description}
                            </Typography>
                            <Chip
                              size="small"
                              color={requirementStatusConfig[group.status].color}
                              label={requirementStatusConfig[group.status].label}
                            />
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Stack spacing={1.5}>
                            <Typography variant="caption" color="text.secondary">
                              {group.options.length > 1
                                ? "Complete any one of the following options:"
                                : "This course must appear in your plan."}
                            </Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                              {group.options.map((option) => (
                                <Chip
                                  key={option.code}
                                  label={option.code}
                                  color={
                                    option.completed
                                      ? "success"
                                      : option.planned
                                      ? "info"
                                      : "default"
                                  }
                                  variant={
                                    option.planned || option.completed ? "filled" : "outlined"
                                  }
                                  onClick={() => openDialog(option.code)}
                                  sx={{ cursor: "pointer" }}
                                />
                              ))}
                            </Stack>
                          </Stack>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {selectedCode} — {selectedCourse?.title || "Course information"}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle1" gutterBottom>
            Description
          </Typography>
          <Typography variant="body2" paragraph>
            {selectedCourse?.description || "No description available."}
          </Typography>
          {selectedCourse?.requirementsDescription && (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Prerequisites
              </Typography>
              <Typography variant="body2">
                {selectedCourse.requirementsDescription}
              </Typography>
            </>
          )}
          {!selectedPlanEntry && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Add this course from the catalog to schedule it in a term.
            </Alert>
          )}
          <Box mt={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Term assignment</InputLabel>
              <Select
                label="Term assignment"
                value={selectedPlanEntry?.term || fallbackTerm}
                onChange={(e) => handleTermChange(selectedCode, e.target.value)}
                disabled={!selectedPlanEntry}
              >
                {termOptions.map((term) => (
                  <MenuItem key={term} value={term}>
                    {term === fallbackTerm ? "Unassigned" : term}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
