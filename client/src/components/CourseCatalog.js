import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Stack,
  Paper,
  Divider,
  Slider,
  Tooltip,
  Autocomplete,
  LinearProgress,
  MenuItem,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import debounce from "lodash.debounce";
import {
  Info as InfoIcon,
  Close as CloseIcon,
  Add as AddIcon,
  FilterAltOutlined as FilterIcon,
  UploadFile as UploadFileIcon,
} from "@mui/icons-material";

const termOptions = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];
const relevantSubjects = new Set([
  "MATH",
  "AMATH",
  "CO",
  "CS",
  "PMATH",
  "STAT",
]);
const levelMarks = [
  { value: 100, label: "100s" },
  { value: 200, label: "200s" },
  { value: 300, label: "300s" },
  { value: 400, label: "400s" },
];

export default function CourseCatalog({
  courses,
  planCodes,
  onAddCourse,
  onRemoveCourse,
  loading = false,
  onRefresh,
  programProfile,
  onProgramUpload,
}) {
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [programOnly, setProgramOnly] = useState(false);
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [hasPrereq, setHasPrereq] = useState(false);
  const [hasDescription, setHasDescription] = useState(false);
  const [levelRange, setLevelRange] = useState([100, 400]);
  const [dialogCourse, setDialogCourse] = useState(null);
  const [dialogTerm, setDialogTerm] = useState(termOptions[0]);
  const [programStatus, setProgramStatus] = useState(null);
  const [programInfoOpen, setProgramInfoOpen] = useState(false);
  const fileInputRef = useRef(null);

  const debouncedSetSearch = useMemo(
    () => debounce((val) => setSearch(val), 250),
    []
  );

  useEffect(() => {
    debouncedSetSearch(rawSearch);
  }, [rawSearch, debouncedSetSearch]);

  const programRequiredSet = useMemo(() => {
    const s = new Set();
    (programProfile?.requirements || []).forEach((r) =>
      (r.options || []).forEach((code) => s.add(String(code).replace(/\s+/g, "")))
    );
    return s;
  }, [programProfile]);

  const programSubjectSet = useMemo(() => {
    const s = new Set();
    programRequiredSet.forEach((code) => {
      const match = code.match(/^[A-Za-z]+/);
      if (match?.[0]) s.add(match[0]);
    });
    return s;
  }, [programRequiredSet]);

  const relevantSubjectSet = useMemo(() => {
    const combined = new Set(relevantSubjects);
    programSubjectSet.forEach((s) => combined.add(s));
    return combined;
  }, [programSubjectSet]);

  const requiredCount = programRequiredSet.size;
  const coveredCount = useMemo(() => {
    let count = 0;
    programRequiredSet.forEach((code) => {
      if (planCodes.has(code)) count += 1;
    });
    return count;
  }, [planCodes, programRequiredSet]);
  const activeFilters = useMemo(() => {
    let count = 0;
    if (programOnly) count++;
    if (requiredOnly) count++;
    if (hasPrereq) count++;
    if (hasDescription) count++;
    if (subjects.length) count++;
    if (levelRange[0] !== 100 || levelRange[1] !== 400) count++;
    return count;
  }, [programOnly, requiredOnly, hasPrereq, hasDescription, subjects, levelRange]);

  const resetFilters = () => {
    setRawSearch("");
    setSubjects([]);
    setProgramOnly(false);
    setRequiredOnly(false);
    setHasPrereq(false);
    setHasDescription(false);
    setLevelRange([100, 400]);
  };

  const allSubjects = useMemo(
    () => Array.from(new Set(courses.map((c) => c.subjectCode))).sort(),
    [courses]
  );

  const rows = useMemo(
    () =>
      courses
        .filter((c) => {
          const key = c.subjectCode + c.catalogNumber;
          const catalogNum = Number(String(c.catalogNumber).replace(/\D/g, ""));
          const hasLevel = Number.isFinite(catalogNum) && catalogNum > 0;
          const level = hasLevel ? Math.min(499, catalogNum) : 0;

          if (
            programOnly &&
            !programRequiredSet.has(key) &&
            !relevantSubjectSet.has(c.subjectCode)
          )
            return false;
          if (requiredOnly && !programRequiredSet.has(key)) return false;
          if (subjects.length && !subjects.includes(c.subjectCode))
            return false;
          if (hasPrereq && !c.requirementsDescription) return false;
          if (hasDescription && !c.description) return false;
          if (
            hasLevel &&
            levelRange &&
            (level < levelRange[0] || level > levelRange[1] + 99)
          )
            return false;

          const q = search.trim().toLowerCase();
          if (q) {
            const codeStr = `${c.subjectCode} ${c.catalogNumber}`.toLowerCase();
            if (
              !codeStr.includes(q) &&
              !c.title.toLowerCase().includes(q)
            )
              return false;
          }
          return true;
        })
        .map((c) => ({
          id: c.subjectCode + c.catalogNumber,
          code: `${c.subjectCode} ${c.catalogNumber}`,
          title: c.title,
          prereq: c.requirementsDescription || "None",
          hasDescription: !!c.description,
          level: Number(String(c.catalogNumber).replace(/\D/g, "")) || 0,
          required: programRequiredSet.has(c.subjectCode + c.catalogNumber),
          relevant:
            programRequiredSet.has(c.subjectCode + c.catalogNumber) ||
            relevantSubjectSet.has(c.subjectCode),
          raw: c,
        })),
    [
      courses,
      programOnly,
      requiredOnly,
      subjects,
      search,
      programRequiredSet,
      hasPrereq,
      hasDescription,
      levelRange,
      relevantSubjectSet,
    ]
  );

  const columns = [
    {
      field: "code",
      headerName: "Code",
      width: 120,
      headerAlign: "center",
      align: "center",
      renderCell: ({ value }) => (
        <Typography fontWeight={600} fontSize={15}>
          {value}
        </Typography>
      ),
    },
    {
      field: "title",
      headerName: "Course",
      flex: 1,
      minWidth: 240,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          <Typography fontWeight={600}>{row.title}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {row.prereq === "None"
              ? "No listed prerequisites"
              : row.prereq}
          </Typography>
        </Box>
      ),
    },
    {
      field: "tags",
      headerName: "Tags",
      width: 240,
      sortable: false,
      headerAlign: "center",
      align: "center",
      renderCell: ({ row }) => (
        <Stack
          direction="row"
          spacing={1.1}
          flexWrap="wrap"
          justifyContent="center"
          sx={{ width: "100%" }}
        >
          {row.required && (
            <Chip size="small" color="secondary" label="Required" />
          )}
          {row.relevant && (
            <Chip
              size="small"
              variant="outlined"
              color="primary"
              label="Program"
            />
          )}
          {row.hasDescription && (
            <Chip size="small" variant="outlined" label="Description" />
          )}
        </Stack>
      ),
    },
    {
      field: "action",
      headerName: "Plan",
      width: 200,
      sortable: false,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const id = params.row.id;
        const added = planCodes.has(id);
        return (
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
            justifyContent="center"
            sx={{ width: "100%" }}
          >
            <Button
              size="small"
              variant={added ? "outlined" : "contained"}
              color={added ? "secondary" : "primary"}
              startIcon={added ? null : <AddIcon fontSize="small" />}
              onClick={() =>
                added ? onRemoveCourse(id) : openInfo(params.row.raw)
              }
            >
              {added ? "Remove" : "Add"}
            </Button>
            <Tooltip title="More details">
              <IconButton size="small" onClick={() => openInfo(params.row.raw)}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];

  function openInfo(course) {
    setDialogCourse(course);
    setDialogTerm(termOptions[0]);
  }
  function closeInfo() {
    setDialogCourse(null);
  }
  function handleAdd() {
    onAddCourse(
      dialogCourse.subjectCode + dialogCourse.catalogNumber,
      dialogTerm
    );
    closeInfo();
  }

  const handleProgramUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleProgramFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalized = normalizeProgramProfile(parsed);
      onProgramUpload?.(normalized);
      setProgramStatus({
        type: "success",
        message: `Loaded ${normalized.name || "program"} (${normalized.requirements.length} requirements) from ${file.name}.`,
      });
    } catch (err) {
      setProgramStatus({
        type: "error",
        message: err?.message || "Invalid program JSON. Expected keys: name, requirements[].",
      });
    } finally {
      event.target.value = "";
    }
  };

  return (
    <Stack spacing={3.5}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, md: 3 },
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2.5}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          sx={{ gap: { xs: 2, md: 3 } }}
        >
          <Box sx={{ maxWidth: 760 }}>
            <Typography variant="h6" gutterBottom>
              Program profile
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
              Load a JSON for your specialized program to tailor required courses and filters.
              Format: {"{ \"name\": \"Computer Science\", \"requirements\": [ { \"description\": \"Core\", \"options\": [\"CS135\",\"CS136\"] } ] }"}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap">
              <Chip
                label={`Loaded: ${programProfile?.name || "Custom program"}`}
                size="small"
                color="primary"
              />
              <Chip
                label={`${requiredCount} requirements`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`${coveredCount} in your plan`}
                size="small"
                variant="outlined"
              />
            </Stack>
            {programStatus?.message && (
              <Typography
                variant="body2"
                sx={{ mt: 1 }}
                color={programStatus.type === "error" ? "error.main" : "success.main"}
              >
                {programStatus.message}
              </Typography>
            )}
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={handleProgramUploadClick}
              sx={{ minWidth: 180 }}
            >
              Upload program JSON
            </Button>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={onRefresh}
              disabled={loading}
            >
              Refresh catalog
            </Button>
            <Button
              variant="text"
              startIcon={<InfoIcon />}
              onClick={() => setProgramInfoOpen(true)}
            >
              JSON format help
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept="application/json"
              onChange={handleProgramFile}
            />
          </Stack>
        </Stack>
      </Paper>

      <Paper
        variant="outlined"
        sx={{ p: { xs: 2.5, md: 3 }, bgcolor: "background.paper" }}
      >
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <TextField
              label="Search courses"
              size="small"
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              placeholder="MATH 135, calculus, optimization..."
              sx={{ minWidth: 320, flex: 1 }}
            />
            <Autocomplete
              multiple
              size="small"
              options={allSubjects}
              value={subjects}
              onChange={(_, val) => setSubjects(val)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} size="small" {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Subjects" placeholder="Filter" />
              )}
              sx={{ minWidth: 260, maxWidth: 420 }}
            />
            <Button
              variant="text"
              color="inherit"
              onClick={resetFilters}
              sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
            >
              Reset filters {activeFilters > 0 ? `(${activeFilters})` : ""}
            </Button>
          </Stack>

          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2.5}
            alignItems={{ xs: "stretch", lg: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1.1 }}>
              <FilterPill
                label="Program relevant"
                active={programOnly}
                onChange={setProgramOnly}
              />
              <FilterPill
                label="Required courses"
                active={requiredOnly}
                onChange={setRequiredOnly}
              />
              <FilterPill
                label="Has prerequisites"
                active={hasPrereq}
                onChange={setHasPrereq}
              />
              <FilterPill
                label="Has description"
                active={hasDescription}
                onChange={setHasDescription}
              />
            </Stack>

            <Box sx={{ minWidth: 280 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Level filter
              </Typography>
              <Slider
                getAriaLabel={() => "Course level"}
                value={levelRange}
                onChange={(_, val) => setLevelRange(val)}
                step={100}
                valueLabelDisplay="auto"
                marks={levelMarks}
                min={100}
                max={400}
                sx={{ mt: 1 }}
              />
            </Box>
          </Stack>
        </Stack>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 2.5 },
          height: "calc(100vh - 340px)",
          minHeight: 500,
        }}
      >
        {loading && <LinearProgress sx={{ mb: 1.5 }} />}
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          disableSelectionOnClick
          disableColumnMenu
          getRowHeight={() => 72}
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25, page: 0 } },
          }}
          sx={{
            border: "none",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "action.hover",
              borderBottom: "1px solid",
              borderColor: "divider",
              py: 1.2,
              px: 2,
              fontWeight: 700,
              fontSize: 14,
            },
            "& .MuiDataGrid-row": {
              borderBottom: "1px solid",
              borderColor: "divider",
              minHeight: 68,
              "&:hover": {
                bgcolor: "action.hover",
              },
            },
            "& .MuiDataGrid-cell": {
              py: 1.4,
              px: 2,
              fontSize: 14,
            },
            "& .MuiDataGrid-virtualScroller": {
              backgroundColor: "background.default",
            },
            "& .MuiDataGrid-row:nth-of-type(odd)": {
              backgroundColor: "rgba(255,255,255,0.03)",
            },
            "& .MuiDataGrid-columnSeparator": {
              display: "none",
            },
          }}
        />
      </Paper>

      {dialogCourse && (
        <Dialog open onClose={closeInfo} fullWidth maxWidth="md">
          <DialogTitle sx={{ pr: 6 }}>
            {dialogCourse.subjectCode} {dialogCourse.catalogNumber} —{" "}
            {dialogCourse.title}
            <IconButton
              onClick={closeInfo}
              sx={{ position: "absolute", right: 12, top: 12 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ display: "grid", gap: 2 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {programRequiredSet.has(
                dialogCourse.subjectCode + dialogCourse.catalogNumber
              ) && (
                <Chip color="secondary" size="small" label="Required" />
              )}
              {relevantSubjectSet.has(dialogCourse.subjectCode) && (
                <Chip color="primary" variant="outlined" size="small" label="Program relevant" />
              )}
              {dialogCourse.gradingBasis && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Grading: ${dialogCourse.gradingBasis}`}
                />
              )}
            </Stack>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Description
              </Typography>
              <Typography variant="body2">
                {dialogCourse.description || "No description listed."}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Prerequisites
              </Typography>
              <Typography variant="body2">
                {dialogCourse.requirementsDescription || "No prerequisites listed."}
              </Typography>
            </Box>

            <Divider />

            <TextField
              select
              label="Add to term"
              value={dialogTerm}
              onChange={(e) => setDialogTerm(e.target.value)}
              fullWidth
              size="small"
            >
              {termOptions.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={closeInfo}>Close</Button>
            <Button
              variant="contained"
              onClick={handleAdd}
              disabled={planCodes.has(
                dialogCourse.subjectCode + dialogCourse.catalogNumber
              )}
            >
              {planCodes.has(
                dialogCourse.subjectCode + dialogCourse.catalogNumber
              )
                ? "Added"
                : "Add to plan"}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Dialog
        open={programInfoOpen}
        onClose={() => setProgramInfoOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Program JSON format
          <IconButton
            onClick={() => setProgramInfoOpen(false)}
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography paragraph>
            Upload a JSON file describing the requirements for your program. It should include a
            name and a list of requirements, each with an optional description and one or more course codes.
          </Typography>
          <Typography variant="subtitle2" gutterBottom>
            Example
          </Typography>
          <Box
            component="pre"
            sx={{
              bgcolor: "action.hover",
              p: 2,
              borderRadius: 1,
              fontSize: 13,
              overflowX: "auto",
            }}
          >
{`{
  "name": "Computer Science",
  "requirements": [
    { "description": "Core", "options": ["CS135", "CS136"] },
    { "description": "Math", "options": ["MATH135", "MATH137"] }
  ]
}`}
          </Box>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Course codes should match the catalog exactly (e.g., "CS136", "MATH137"). You can include multiple options per requirement.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProgramInfoOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function FilterPill({ label, active, onChange }) {
  return (
    <Chip
      clickable
      color={active ? "primary" : "default"}
      variant={active ? "filled" : "outlined"}
      label={label}
      onClick={() => onChange(!active)}
      size="small"
      sx={{ fontWeight: 600 }}
    />
  );
}

function normalizeProgramProfile(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Program JSON must be an object.");
  }
  if (!Array.isArray(data.requirements) || data.requirements.length === 0) {
    throw new Error("Program JSON must include a 'requirements' array.");
  }

  const requirements = data.requirements.map((req, idx) => {
    const options = Array.isArray(req.options) ? req.options : [];
    if (!options.length) {
      throw new Error(`Requirement #${idx + 1} is missing an 'options' array.`);
    }
    return {
      description: req.description || `Requirement ${idx + 1}`,
      options: options.map((c) => String(c).replace(/\s+/g, "")),
    };
  });

  return {
    name: data.name || "Custom program",
    requirements,
  };
}
