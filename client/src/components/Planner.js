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
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Download as DownloadIcon,
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 3,
          background: (theme) =>
            theme.palette.mode === "light"
              ? "linear-gradient(140deg, rgba(0,93,170,0.1), rgba(255,184,0,0.08))"
              : "linear-gradient(140deg, rgba(30,64,175,0.4), rgba(14,116,144,0.3))",
        }}
      >
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Planner overview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track required courses, mark completions, and visualize progress
                toward graduation.
              </Typography>
            </Box>

            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={2.5}
              alignItems={{ xs: "flex-start", lg: "center" }}
            >
              <Stack direction="row" spacing={4} flexWrap="wrap">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {progress.completed}
                  </Typography>
                </Box>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ display: { xs: "none", md: "block" } }}
                />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Remaining
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {progress.planned}
                  </Typography>
                </Box>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ display: { xs: "none", md: "block" } }}
                />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total courses
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {progress.total}
                  </Typography>
                </Box>
              </Stack>
              <Tooltip title="Download this plan as a JSON file for backups or advising">
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<DownloadIcon />}
                  onClick={handleExport}
                >
                  Export plan
                </Button>
              </Tooltip>
            </Stack>
          </Stack>

          <Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
                Completion
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress.percentage}
                sx={{ flexGrow: 1, height: 8, borderRadius: 5 }}
              />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {progress.percentage}%
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {requirementProgress.length > 0 && (
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              spacing={2}
              alignItems={{ xs: "flex-start", md: "center" }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Requirement tracker
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  See how your current plan covers each program requirement and
                  identify any remaining gaps.
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

            <Stack spacing={2.5}>
              {requirementProgress.map((group, idx) => (
                <Paper
                  key={`${group.description}-${idx}`}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    p: { xs: 2, md: 2.5 },
                    backgroundColor: (theme) =>
                      group.status === "complete"
                        ? theme.palette.mode === "light"
                          ? "rgba(16,185,129,0.08)"
                          : "rgba(34,197,94,0.15)"
                        : group.status === "in-progress"
                        ? theme.palette.mode === "light"
                          ? "rgba(59,130,246,0.08)"
                          : "rgba(96,165,250,0.12)"
                        : undefined,
                  }}
                >
                  <Stack spacing={1.5}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      spacing={1.5}
                      alignItems={{ xs: "flex-start", sm: "center" }}
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
                          variant={option.planned || option.completed ? "filled" : "outlined"}
                          onClick={() => openDialog(option.code)}
                          sx={{ cursor: "pointer" }}
                        />
                      ))}
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Stack
          direction={{ xs: "column", xl: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", xl: "center" }}
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
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(auto-fit, minmax(280px, 1fr))",
          },
          gap: 3,
        }}
      >
        {termKeys.map((term) => {
          const courses = groupedPlan.get(term) || [];
          return (
            <Paper
              key={term}
              variant="outlined"
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                minHeight: 200,
              }}
            >
              <Box
                sx={{
                  px: 2.5,
                  py: 2,
                  bgcolor: (theme) =>
                    theme.palette.mode === "light"
                      ? "rgba(0,93,170,0.08)"
                      : "rgba(30,64,175,0.35)",
                  borderBottom: (theme) =>
                    `1px solid ${
                      theme.palette.mode === "light"
                        ? "rgba(148, 163, 184, 0.3)"
                        : "rgba(71, 85, 105, 0.6)"
                    }`,
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {term}
                  </Typography>
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={`${courses.length} course${courses.length === 1 ? "" : "s"}`}
                  />
                </Stack>
              </Box>

              <Stack spacing={2} sx={{ p: 2.5 }}>
                {courses.length === 0 ? (
                  <Typography color="text.secondary" variant="body2">
                    No courses scheduled for this term.
                  </Typography>
                ) : (
                  courses.map((item) => {
                    const code = item.course_code;
                    const course = coursesMap[code] || {};
                    const isRequired = requiredSet.has(code);
                    return (
                  <Paper
                    key={code}
                    variant="outlined"
                    sx={{
                      p: 2,
                          borderRadius: 2,
                          position: "relative",
                          borderColor: item.completed
                            ? (theme) => theme.palette.success.main
                            : undefined,
                          backgroundColor: (theme) => {
                            if (item.completed) {
                              return theme.palette.mode === "light"
                                ? "rgba(46, 204, 113, 0.08)"
                                : "rgba(34, 197, 94, 0.15)";
                            }
                            return theme.palette.mode === "light"
                              ? "rgba(255,255,255,0.9)"
                              : theme.palette.background.paper;
                          },
                        }}
                      >
                        <Stack spacing={1.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {code}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {course.title || "Title not available"}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {isRequired && <Chip color="secondary" size="small" label="Required" />}
                            </Stack>
                          </Stack>
                          {course.requirementsDescription && (
                            <Typography variant="caption" color="text.secondary">
                              Prerequisites: {course.requirementsDescription}
                            </Typography>
                          )}
                          <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel>Term</InputLabel>
                            <Select
                              label="Term"
                              value={item.term || fallbackTerm}
                              onChange={(e) => handleTermChange(code, e.target.value)}
                            >
                              {termOptions.map((term) => (
                                <MenuItem key={term} value={term}>
                                  {term === fallbackTerm ? "Unassigned" : term}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip
                              title={item.completed ? "Mark as incomplete" : "Mark as completed"}
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
                      </Paper>
                    );
                  })
                )}
              </Stack>
            </Paper>
          );
        })}
        {termKeys.length === 0 && (
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 3,
              p: { xs: 3, md: 4 },
            }}
          >
            <Typography variant="h6" gutterBottom>
              No courses in your plan yet
            </Typography>
            <Typography color="text.secondary">
              Search the course catalog and add classes to build your personalized
              roadmap.
            </Typography>
          </Paper>
        )}
      </Box>

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
    </Box>
  );
}
