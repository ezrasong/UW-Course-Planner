import React, { useState, useMemo, useRef } from "react";
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox as MuiCheckbox,
  Chip,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  IconButton,
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Alert,
  Divider,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";

export default function Planner({
  plan,
  coursesMap,
  onRemoveCourse,
  onToggleComplete,
  onImportPlan,
}) {
  const [search, setSearch] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [status, setStatus] = useState("all");
  const [termFilter, setTermFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "term", direction: "asc" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [importState, setImportState] = useState({ type: null, message: "" });
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const allSubjects = useMemo(() => {
    const setSub = new Set();
    plan.forEach((item) => {
      const match = item.course_code.match(/^[A-Za-z]+/);
      if (match?.[0]) setSub.add(match[0]);
    });
    return Array.from(setSub).sort();
  }, [plan]);

  const allTerms = useMemo(() => {
    const setTerm = new Set(plan.map((item) => item.term).filter(Boolean));
    return ["all", ...Array.from(setTerm)];
  }, [plan]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plan.filter((item) => {
      const subjMatch = item.course_code.match(/^[A-Za-z]+/);
      const subj = subjMatch ? subjMatch[0] : "";
      if (subjects.length && !subjects.includes(subj)) return false;
      if (termFilter !== "all" && item.term !== termFilter) return false;
      if (status === "completed" && !item.completed) return false;
      if (status === "planned" && item.completed) return false;
      if (q) {
        const code = item.course_code.toLowerCase();
        const title = (coursesMap[item.course_code]?.title || "").toLowerCase();
        return code.includes(q) || title.includes(q);
      }
      return true;
    });
  }, [plan, search, subjects, coursesMap, status, termFilter]);

  const sorted = useMemo(() => {
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) => {
      let av, bv;
      switch (sortConfig.key) {
        case "code":
          av = a.course_code;
          bv = b.course_code;
          break;
        case "title":
          av = coursesMap[a.course_code]?.title || "";
          bv = coursesMap[b.course_code]?.title || "";
          break;
        case "term":
          av = a.term || "";
          bv = b.term || "";
          break;
        case "completed":
          av = a.completed ? 1 : 0;
          bv = b.completed ? 1 : 0;
          break;
        default:
          av = "";
          bv = "";
      }
      if (av < bv) return sortConfig.direction === "asc" ? -1 : 1;
      if (av > bv) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortConfig, coursesMap]);

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  };

  const openDialog = (code) => {
    setSelectedCode(code);
    setDialogOpen(true);
  };
  const closeDialog = () => {
    setSelectedCode(null);
    setDialogOpen(false);
  };
  const selectedCourse = selectedCode ? coursesMap[selectedCode] : {};

  const plannedCount = plan.length;
  const completedCount = plan.filter((p) => p.completed).length;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportState({ type: null, message: "" });
    setImporting(true);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalized = normalizePlanJson(parsed);
      const count = await onImportPlan(normalized);
      setImportState({
        type: "success",
        message: `Imported ${count} courses from ${file.name}.`,
      });
    } catch (err) {
      console.error("Import error:", err);
      setImportState({
        type: "error",
        message:
          err?.message ||
          "We could not read that file. Ensure it is valid JSON.",
      });
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.paper" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
        >
          <Stack spacing={0.5}>
            <Typography variant="h6">Planner</Typography>
            <Typography variant="body2" color="text.secondary">
              Track courses per term, mark them completed, or bulk import from JSON.
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <StatPill label="Planned" value={plannedCount} />
            <StatPill label="Completed" value={completedCount} />
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={handleImportClick}
              disabled={importing}
            >
              Import JSON
            </Button>
            <input
              type="file"
              accept="application/json"
              hidden
              ref={fileInputRef}
              onChange={handleFile}
            />
          </Stack>
        </Stack>
        {importState.type && (
          <Alert
            sx={{ mt: 2 }}
            severity={importState.type}
            onClose={() => setImportState({ type: null, message: "" })}
          >
            {importState.message}
          </Alert>
        )}
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary">
          JSON format: [{"{"} "course_code": "MATH135", "term": "1A", "completed": false {"}"}]
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.paper" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <TextField
            label="Search"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            placeholder="Course code or title"
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Subject</InputLabel>
            <Select
              multiple
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              renderValue={(sel) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {sel.map((s) => (
                    <Chip key={s} label={s} size="small" />
                  ))}
                </Box>
              )}
            >
              {allSubjects.map((s) => (
                <MenuItem key={s} value={s}>
                  <MuiCheckbox checked={subjects.includes(s)} /> {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="planned">Planned</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Term</InputLabel>
            <Select
              value={termFilter}
              label="Term"
              onChange={(e) => setTermFilter(e.target.value)}
            >
              {allTerms.map((term) => (
                <MenuItem key={term} value={term}>
                  {term === "all" ? "All terms" : term}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {["code", "title", "term", "completed"].map((col) => (
                <TableCell key={col}>
                  <TableSortLabel
                    active={sortConfig.key === col}
                    direction={sortConfig.direction}
                    onClick={() => handleSort(col)}
                  >
                    {col.charAt(0).toUpperCase() + col.slice(1)}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell>Info</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No courses match the filters.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((item) => {
                const code = item.course_code;
                const course = coursesMap[code] || {};
                return (
                  <TableRow
                    key={code}
                    hover
                    sx={{
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight={700}>{code}</Typography>
                        {item.completed && (
                          <Chip label="Done" color="success" size="small" />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>
                        {course.title || "-"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {course.description || ""}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.term}</TableCell>
                    <TableCell>
                      <Checkbox
                        size="small"
                        checked={!!item.completed}
                        onChange={() => onToggleComplete(code)}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => openDialog(code)}>
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Remove from plan">
                        <IconButton
                          size="small"
                          onClick={() => onRemoveCourse(code)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {selectedCode} — {selectedCourse?.title}
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
              No description available.
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

function normalizePlanJson(parsed) {
  if (!Array.isArray(parsed)) {
    throw new Error("The uploaded file must be a JSON array.");
  }
  return parsed.map((entry, idx) => {
    const code =
      entry.course_code ||
      entry.courseCode ||
      (entry.subjectCode && entry.catalogNumber
        ? `${entry.subjectCode}${entry.catalogNumber}`
        : null) ||
      (entry.subject && entry.catalog_number
        ? `${entry.subject}${entry.catalog_number}`
        : null);

    if (!code) {
      throw new Error(`Missing course_code on item ${idx + 1}.`);
    }

    return {
      course_code: String(code).replace(/\s+/g, "").toUpperCase(),
      term: entry.term ? String(entry.term) : "TBD",
      completed: Boolean(entry.completed),
    };
  });
}

function StatPill({ label, value }) {
  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        bgcolor: "action.hover",
        borderRadius: 2,
        minWidth: 90,
        textAlign: "center",
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography fontWeight={700}>{value}</Typography>
    </Box>
  );
}
