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
  Stack,
  Paper,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
  IconButton,
  Tooltip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Fade,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import CloseIcon from "@mui/icons-material/Close";
import { alpha } from "@mui/material/styles";

const TERM_ORDER = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];

export default function Planner({
  plan,
  coursesMap,
  onRemoveCourse,
  onToggleComplete,
  loading = false,
}) {
  const [search, setSearch] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);

  const allSubjects = useMemo(() => {
    const setSub = new Set();
    plan.forEach((item) => {
      const match = item.course_code?.match(/^[A-Za-z]+/);
      if (match) setSub.add(match[0]);
    });
    return Array.from(setSub).sort();
  }, [plan]);

  const filtersActive =
    Boolean(search.trim()) || subjects.length > 0 || statusFilter !== "all";

  const filteredPlan = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plan.filter((item) => {
      const code = item.course_code || "";
      const subject = code.match(/^[A-Za-z]+/)?.[0] || "";
      if (subjects.length && !subjects.includes(subject)) return false;
      if (statusFilter === "completed" && !item.completed) return false;
      if (statusFilter === "planned" && item.completed) return false;
      if (q) {
        const title = (coursesMap[code]?.title || "").toLowerCase();
        if (!code.toLowerCase().includes(q) && !title.includes(q)) return false;
      }
      return true;
    });
  }, [plan, search, subjects, statusFilter, coursesMap]);

  const groupedTerms = useMemo(() => {
    const bucket = new Map();
    filteredPlan.forEach((item) => {
      const key = item.term && item.term.trim() ? item.term.trim() : "Unassigned";
      if (!bucket.has(key)) bucket.set(key, []);
      bucket.get(key).push(item);
    });

    const orderedKnown = TERM_ORDER.filter((term) => bucket.has(term));
    const extras = Array.from(bucket.keys())
      .filter((term) => !TERM_ORDER.includes(term) && term !== "Unassigned")
      .sort((a, b) => a.localeCompare(b));
    const tail = bucket.has("Unassigned") ? ["Unassigned"] : [];

    return [...orderedKnown, ...extras, ...tail].map((term) => {
      const entries = bucket.get(term) ?? [];
      const completed = entries.filter((entry) => entry.completed).length;
      const percent = entries.length
        ? Math.round((completed / entries.length) * 100)
        : 0;
      return { term, entries, completed, percent };
    });
  }, [filteredPlan]);

  const computeSummary = useCallback(
    (items) => {
      const total = items.length;
      const completed = items.filter((item) => item.completed).length;
      const estimatedUnits = items.reduce((sum, item) => {
        const units = parseFloat(coursesMap[item.course_code]?.units);
        return Number.isFinite(units) ? sum + units : sum;
      }, 0);

      return {
        total,
        completed,
        remaining: total - completed,
        percent: total ? Math.round((completed / total) * 100) : 0,
        units: Math.round(estimatedUnits * 10) / 10,
      };
    },
    [coursesMap]
  );

  const summary = useMemo(() => computeSummary(plan), [computeSummary, plan]);

  const openDialog = (code) => {
    setSelectedCode(code);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setSelectedCode(null);
    setDialogOpen(false);
  };

  const handleStatusChange = (_event, value) => {
    if (value !== null) setStatusFilter(value);
  };

  const selectedCourse = selectedCode ? coursesMap[selectedCode] : null;

  const resetFilters = () => {
    setSearch("");
    setSubjects([]);
    setStatusFilter("all");
  };

  const emptyStateCopy = !filteredPlan.length
    ? plan.length === 0
      ? {
          title: "Start building your roadmap",
          description:
            "Add courses from the catalog to begin organizing your terms and tracking completion.",
          action: null,
        }
      : filtersActive
      ? {
          title: "No courses match the current filters",
          description:
            "Relax the filters or clear them to see every course that is currently in your plan.",
          action: resetFilters,
        }
      : {
          title: "Nothing scheduled for these terms yet",
          description:
            "Use the course cards to assign terms and mark progress as you complete requirements.",
          action: null,
        }
    : null;

  return (
    <Stack spacing={3} sx={{ flex: 1, minHeight: 0 }}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Planner overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visualize your degree progress across terms and stay ahead of
          prerequisite chains.
        </Typography>
      </Stack>

      <Paper
        variant="outlined"
        sx={{ p: 3, borderRadius: 3, backdropFilter: "blur(10px)" }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary">
              Planned courses
            </Typography>
            <Typography variant="h4">{summary.total || 0}</Typography>
          </Stack>
          <Stack spacing={1} sx={{ minWidth: { sm: 240 } }}>
            <Typography variant="overline" color="text.secondary">
              Completion
            </Typography>
            <LinearProgress
              variant="determinate"
              value={summary.percent}
              sx={{ height: 10, borderRadius: 999 }}
            />
            <Typography variant="body2" color="text.secondary">
              {summary.completed} completed • {summary.remaining} remaining
            </Typography>
          </Stack>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary">
              Estimated units
            </Typography>
            <Typography variant="h5">{summary.units.toFixed(1)}</Typography>
          </Stack>
        </Stack>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderRadius: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ md: "center" }}
        >
          <TextField
            label="Search by code or title"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1, minWidth: { xs: "100%", md: 240 } }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Subject</InputLabel>
            <Select
              multiple
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              input={<OutlinedInput label="Subject" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((s) => (
                    <Chip key={s} label={s} size="small" />
                  ))}
                </Box>
              )}
            >
              {allSubjects.map((subject) => (
                <MenuItem key={subject} value={subject}>
                  <Chip
                    label={subject}
                    size="small"
                    color="primary"
                    variant={subjects.includes(subject) ? "filled" : "outlined"}
                    sx={{ mr: 1 }}
                  />
                  {subject}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={handleStatusChange}
            size="small"
            color="primary"
            sx={{ flexWrap: "wrap" }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="planned">Planned</ToggleButton>
            <ToggleButton value="completed">Completed</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Filters apply instantly to the timeline below so you can focus on the
          term or workload that matters most.
        </Typography>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
        }}
      >
        <Fade in={loading} unmountOnExit>
          <LinearProgress
            sx={{ gridColumn: "1 / -1", borderRadius: 999, width: "100%" }}
          />
        </Fade>
        {groupedTerms.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 3,
              gridColumn: "1 / -1",
            }}
          >
            <Typography variant="h6" gutterBottom>
              {emptyStateCopy?.title ?? "No courses to display"}
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 420, mx: "auto" }}>
              {emptyStateCopy?.description ??
                "Once courses are planned they will appear here organized by term."}
            </Typography>
            {emptyStateCopy?.action && (
              <Button
                onClick={emptyStateCopy.action}
                sx={{ mt: 2 }}
                variant="outlined"
                size="small"
              >
                Clear filters
              </Button>
            )}
          </Paper>
        ) : (
          groupedTerms.map(({ term, entries, completed, percent }) => (
            <Paper
              key={term}
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 3,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={2}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {term}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {completed} of {entries.length} completed
                  </Typography>
                </Box>
                <Box sx={{ minWidth: 120 }}>
                  <LinearProgress
                    variant="determinate"
                    value={percent}
                    sx={{ height: 8, borderRadius: 999 }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5, textAlign: "right" }}
                  >
                    {percent}%
                  </Typography>
                </Box>
              </Stack>
              <Divider />
              <Stack spacing={1.5}>
                {entries.map((item) => {
                  const code = item.course_code;
                  const course = coursesMap[code] || {};
                  const isCompleted = Boolean(item.completed);
                  return (
                    <Box
                      key={code}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: (theme) =>
                          `1px solid ${alpha(
                            isCompleted
                              ? theme.palette.success.main
                              : theme.palette.primary.main,
                            isCompleted ? 0.45 : 0.3
                          )}`,
                        background: (theme) =>
                          alpha(
                            isCompleted
                              ? theme.palette.success.light
                              : theme.palette.primary.light,
                            0.15
                          ),
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.25,
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1.5}
                        justifyContent="space-between"
                        alignItems={{ sm: "center" }}
                      >
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {code}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {course.title || "Title unavailable"}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Chip
                            label={isCompleted ? "Completed" : "Planned"}
                            color={isCompleted ? "success" : "warning"}
                            size="small"
                            variant={isCompleted ? "filled" : "outlined"}
                          />
                          <Tooltip
                            title={
                              isCompleted
                                ? "Mark as planned"
                                : "Mark as completed"
                            }
                          >
                            <Switch
                              checked={isCompleted}
                              onChange={() => onToggleComplete(code)}
                              size="small"
                              inputProps={{
                                "aria-label": `Toggle completion for ${code}`,
                              }}
                            />
                          </Tooltip>
                          <Tooltip title="Course details">
                            <IconButton
                              size="small"
                              onClick={() => openDialog(code)}
                            >
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remove from planner">
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
                      {course.requirementsDescription && (
                        <Typography variant="caption" color="text.secondary">
                          Prerequisites: {course.requirementsDescription}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          ))
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {selectedCode}
          {selectedCourse?.title ? ` — ${selectedCourse.title}` : ""}
          <IconButton
            onClick={closeDialog}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedCourse?.description ? (
            <Typography paragraph>{selectedCourse.description}</Typography>
          ) : (
            <Typography color="text.secondary">
              No description available for this course yet.
            </Typography>
          )}
          {selectedCourse?.requirementsDescription && (
            <Typography variant="body2" color="text.secondary">
              Prerequisites: {selectedCourse.requirementsDescription}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
