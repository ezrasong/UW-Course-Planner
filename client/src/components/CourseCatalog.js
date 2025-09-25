import React, { useState, useMemo, useEffect, useCallback } from "react";
import compMathPlan from "../data/comp_math_plan.json";
import {
  Box,
  TextField,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
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
  LinearProgress,
  Tooltip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import debounce from "lodash.debounce";
import {
  Info as InfoIcon,
  Close as CloseIcon,
  Upload as UploadIcon,
  RestartAlt as RestartAltIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
} from "@mui/icons-material";

const termOptions = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];
const DEFAULT_SUBJECTS = ["MATH", "AMATH", "CO", "CS", "PMATH", "STAT"];
const DEFAULT_PLAN_NAME = "Computational Mathematics";

function normalizePlan(rawPlan = {}) {
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

const DEFAULT_PLAN = normalizePlan(compMathPlan);

export default function CourseCatalog({
  courses,
  planCodes,
  onAddCourse,
  onRemoveCourse,
}) {
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [programOnly, setProgramOnly] = useState(false);
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [dialogCourse, setDialogCourse] = useState(null);
  const [dialogTerm, setDialogTerm] = useState(termOptions[0]);
  const [planData, setPlanData] = useState(DEFAULT_PLAN);
  const [uploadError, setUploadError] = useState(null);

  const debouncedSetSearch = useMemo(
    () => debounce((val) => setSearch(val), 300),
    []
  );
  useEffect(() => {
    debouncedSetSearch(rawSearch);
  }, [rawSearch, debouncedSetSearch]);
  useEffect(() => () => debouncedSetSearch.cancel(), [debouncedSetSearch]);

  const requiredSet = useMemo(() => {
    const s = new Set();
    planData.requirements.forEach((r) =>
      r.options.forEach((code) => s.add(code))
    );
    return s;
  }, [planData]);

  const programSubjects = useMemo(
    () => new Set(planData.relevantSubjects ?? DEFAULT_SUBJECTS),
    [planData]
  );

  const requirementProgress = useMemo(() => {
    return planData.requirements.map((req) => {
      const matchedCode = req.options.find((code) => planCodes.has(code));
      return {
        ...req,
        matchedCode,
        satisfied: Boolean(matchedCode),
      };
    });
  }, [planData, planCodes]);

  const totalRequirements = requirementProgress.length;
  const satisfiedCount = requirementProgress.filter((req) => req.satisfied).length;
  const completionPercent = totalRequirements
    ? Math.round((satisfiedCount / totalRequirements) * 100)
    : 0;

  const allSubjects = useMemo(
    () => Array.from(new Set(courses.map((c) => c.subjectCode))).sort(),
    [courses]
  );

  const rows = useMemo(
    () =>
      courses
        .filter((c) => {
          const key = c.subjectCode + c.catalogNumber;
          if (
            programOnly &&
            !requiredSet.has(key) &&
            !programSubjects.has(c.subjectCode)
          )
            return false;
          if (requiredOnly && !requiredSet.has(key)) return false;
          if (subjects.length && !subjects.includes(c.subjectCode))
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
          raw: c,
        })),
    [
      courses,
      programOnly,
      requiredOnly,
      subjects,
      search,
      requiredSet,
      programSubjects,
    ]
  );

  const columns = [
    { field: "code", headerName: "Code", width: 120 },
    { field: "title", headerName: "Title", flex: 1, minWidth: 200 },
    {
      field: "prereq",
      headerName: "Prerequisites",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "action",
      headerName: "",
      width: 110,
      sortable: false,
      renderCell: (params) => {
        const id = params.row.id;
        const added = planCodes.has(id);
        return (
          <Button
            size="small"
            variant={added ? "outlined" : "contained"}
            color={added ? "secondary" : "primary"}
            onClick={() => (added ? onRemoveCourse(id) : openInfo(params.row.raw))}
          >
            {added ? "Remove" : "Add"}
          </Button>
        );
      },
    },
    {
      field: "info",
      headerName: "",
      width: 60,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="View course details">
          <span>
            <IconButton size="small" onClick={() => openInfo(params.row.raw)}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ),
    },
  ];

  const handlePlanUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const normalized = normalizePlan({
          ...parsed,
          name:
            parsed?.name || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        });
        if (!normalized.requirements.length) {
          throw new Error("Plan must include at least one requirement");
        }
        setPlanData(normalized);
        setUploadError(null);
      } catch (err) {
        console.error("Failed to load custom plan", err);
        setUploadError(
          "Unable to read that file. Make sure it's valid JSON with a requirements array."
        );
      }
    };
    reader.readAsText(file);
    // Allow re-uploading the same file by clearing the input value
    event.target.value = "";
  }, []);

  const resetPlan = () => {
    setPlanData(DEFAULT_PLAN);
    setUploadError(null);
  };

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
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, gap: 3 }}>
      <Box
        sx={{
          display: "grid",
          gap: { xs: 3, lg: 4 },
          gridTemplateColumns: { xs: "1fr", lg: "320px 1fr" },
          flex: 1,
          minHeight: 0,
        }}
      >
        <Stack
          component={Paper}
          spacing={3}
          sx={{
            p: 3,
            borderRadius: 3,
            height: "100%",
            position: "relative",
            overflow: "hidden",
            backdropFilter: "blur(10px)",
            background: (theme) =>
              alpha(theme.palette.background.paper, 0.85),
          }}
        >
          <Stack spacing={1.5}>
            <Typography variant="overline" color="text.secondary">
              Program Planner
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {planData.name}
            </Typography>
            <Stack spacing={1}>
              <LinearProgress
                variant="determinate"
                value={completionPercent}
                sx={{ height: 8, borderRadius: 999 }}
              />
              <Typography variant="body2" color="text.secondary">
                {satisfiedCount} of {totalRequirements} core requirements
                completed ({completionPercent}%).
              </Typography>
            </Stack>
            <Chip
              label={`${planData.relevantSubjects.length} tracked subjects`}
              size="small"
              variant="outlined"
              sx={{ alignSelf: "flex-start" }}
            />
          </Stack>

          <Divider />

          <Stack spacing={1} sx={{ flexGrow: 1, minHeight: 0 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Requirement checklist
            </Typography>
            <List
              dense
              sx={{
                borderRadius: 2,
                overflow: "auto",
                maxHeight: 220,
              }}
            >
              {requirementProgress.length === 0 ? (
                <ListItem>
                  <ListItemText
                    primary="No structured requirements loaded"
                    primaryTypographyProps={{ color: "text.secondary" }}
                  />
                </ListItem>
              ) : (
                requirementProgress.map((req, idx) => (
                  <ListItem key={`${req.description}-${idx}`} disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {req.satisfied ? (
                        <CheckCircleIcon color="success" fontSize="small" />
                      ) : (
                        <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={req.description}
                      secondary={
                        req.satisfied
                          ? `Satisfied by ${req.matchedCode}`
                          : `Choose: ${req.options.join(", ")}`
                      }
                      primaryTypographyProps={{ fontSize: 14 }}
                      secondaryTypographyProps={{ fontSize: 12 }}
                    />
                  </ListItem>
                ))
              )}
            </List>
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Typography variant="subtitle2" color="text.secondary">
              Catalog filters
            </Typography>
            <TextField
              label="Search courses"
              size="small"
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
              placeholder="Search by code or title"
            />
            <FormControl size="small">
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
                {allSubjects.map((sub) => (
                  <MenuItem key={sub} value={sub}>
                    <Checkbox checked={subjects.includes(sub)} />
                    <Typography sx={{ ml: 1 }}>{sub}</Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={programOnly}
                    onChange={(e) => setProgramOnly(e.target.checked)}
                    size="small"
                  />
                }
                label="Show tracked subjects"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={requiredOnly}
                    onChange={(e) => setRequiredOnly(e.target.checked)}
                    size="small"
                  />
                }
                label="Show requirements only"
              />
            </Stack>
          </Stack>

          <Divider />

          <Stack spacing={1.5}>
            <Typography variant="subtitle2" color="text.secondary">
              Custom requirement plan
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                component="label"
                variant="contained"
                size="small"
                startIcon={<UploadIcon />}
              >
                Upload JSON
                <input
                  hidden
                  type="file"
                  accept="application/json"
                  onChange={handlePlanUpload}
                />
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RestartAltIcon />}
                onClick={resetPlan}
              >
                Reset to default
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary" component="div">
              Provide a JSON file with a
              <Box component="code" sx={{ px: 0.5 }}>
                name
              </Box>
              field, optional
              <Box component="code" sx={{ px: 0.5 }}>
                relevantSubjects
              </Box>
              , and a
              <Box component="code" sx={{ px: 0.5 }}>
                requirements
              </Box>
              array. Each requirement should include a description and a list of
              course codes.
            </Typography>
            {uploadError && <Alert severity="error">{uploadError}</Alert>}
          </Stack>
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          <Box sx={{ p: 3, pb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Course Catalog
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Browse offerings and add them directly to your planner.
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <DataGrid
              rows={rows}
              columns={columns}
              disableRowSelectionOnClick
              initialState={{
                pagination: { paginationModel: { pageSize: 25, page: 0 } },
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              sx={{
                border: 0,
                px: 2,
                "& .MuiDataGrid-columnHeaders": {
                  fontWeight: 600,
                },
                "& .MuiDataGrid-virtualScroller": {
                  backgroundColor: (theme) =>
                    alpha(theme.palette.background.paper, 0.6),
                },
              }}
            />
          </Box>
        </Paper>
      </Box>

      {dialogCourse && (
        <Dialog open onClose={closeInfo} fullWidth maxWidth="md">
          <DialogTitle>
            {dialogCourse.subjectCode} {dialogCourse.catalogNumber} — {" "}
            {dialogCourse.title}
            <IconButton
              onClick={closeInfo}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="subtitle1" gutterBottom>
              Description
            </Typography>
            <Typography variant="body2" paragraph>
              {dialogCourse.description || "No description available."}
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
              Prerequisites
            </Typography>
            <Typography variant="body2" paragraph>
              {dialogCourse.requirementsDescription || "None"}
            </Typography>
            <Box mt={3}>
              <TextField
                select
                label="Planned term"
                value={dialogTerm}
                onChange={(e) => setDialogTerm(e.target.value)}
                fullWidth
              >
                {termOptions.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeInfo}>Cancel</Button>
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
                ? "Already in planner"
                : "Add to planner"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}