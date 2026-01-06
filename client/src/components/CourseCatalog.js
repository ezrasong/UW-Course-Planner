import React, { useState, useMemo, useEffect } from "react";
import compMathPlan from "../data/comp_math_plan.json";
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

  const debouncedSetSearch = useMemo(
    () => debounce((val) => setSearch(val), 250),
    []
  );

  useEffect(() => {
    debouncedSetSearch(rawSearch);
  }, [rawSearch, debouncedSetSearch]);

  const requiredSet = useMemo(() => {
    const s = new Set();
    compMathPlan.requirements.forEach((r) =>
      r.options.forEach((code) => s.add(code))
    );
    return s;
  }, []);

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
            !requiredSet.has(key) &&
            !relevantSubjects.has(c.subjectCode)
          )
            return false;
          if (requiredOnly && !requiredSet.has(key)) return false;
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
          required: requiredSet.has(c.subjectCode + c.catalogNumber),
          relevant:
            requiredSet.has(c.subjectCode + c.catalogNumber) ||
            relevantSubjects.has(c.subjectCode),
          raw: c,
        })),
    [
      courses,
      programOnly,
      requiredOnly,
      subjects,
      search,
      requiredSet,
      hasPrereq,
      hasDescription,
      levelRange,
    ]
  );

  const columns = [
    {
      field: "code",
      headerName: "Code",
      width: 120,
      renderCell: ({ value }) => (
        <Typography fontWeight={700}>{value}</Typography>
      ),
    },
    {
      field: "title",
      headerName: "Course",
      flex: 1,
      minWidth: 220,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
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
      width: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
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
      width: 180,
      sortable: false,
      renderCell: (params) => {
        const id = params.row.id;
        const added = planCodes.has(id);
        return (
          <Stack direction="row" spacing={1} alignItems="center">
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

  return (
    <Stack spacing={2}>
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
          sx={{ minWidth: 280, flex: 1 }}
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
          sx={{ minWidth: 240 }}
        />
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={onRefresh}
          disabled={loading}
        >
          Refresh catalog
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, bgcolor: "background.paper" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} flexWrap="wrap">
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

          <Box sx={{ minWidth: 240 }}>
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
              sx={{ mt: 0.5 }}
            />
          </Box>
        </Stack>
      </Paper>

      <Paper
        variant="outlined"
        sx={{ p: 1, height: "calc(100vh - 280px)", minHeight: 420 }}
      >
        {loading && <LinearProgress />}
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          disableSelectionOnClick
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
            },
            "& .MuiDataGrid-row": {
              borderBottom: "1px solid",
              borderColor: "divider",
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
              {requiredSet.has(
                dialogCourse.subjectCode + dialogCourse.catalogNumber
              ) && (
                <Chip color="secondary" size="small" label="Required" />
              )}
              {relevantSubjects.has(dialogCourse.subjectCode) && (
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
