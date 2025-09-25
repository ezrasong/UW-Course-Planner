import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
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
  Alert,
  Tooltip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import debounce from "lodash.debounce";
import {
  Info as InfoIcon,
  Close as CloseIcon,
  Upload as UploadIcon,
  RestartAlt as RestartAltIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

const termOptions = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];
export default function CourseCatalog({
  courses,
  planCodes,
  onAddCourse,
  onRemoveCourse,
  programPlan,
  onProgramPlanChange,
  onProgramPlanReset,
}) {
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [programOnly, setProgramOnly] = useState(false);
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [dialogCourse, setDialogCourse] = useState(null);
  const [dialogTerm, setDialogTerm] = useState(termOptions[0]);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const debouncedSetSearch = useMemo(
    () => debounce((val) => setSearch(val), 300),
    []
  );
  useEffect(() => {
    debouncedSetSearch(rawSearch);
  }, [rawSearch, debouncedSetSearch]);

  const requiredSet = useMemo(() => {
    const s = new Set();
    (programPlan?.requirements || []).forEach((group) => {
      (group?.options || []).forEach((code) => s.add(code));
    });
    return s;
  }, [programPlan]);

  const allSubjects = useMemo(
    () => Array.from(new Set(courses.map((c) => c.subjectCode))).sort(),
    [courses]
  );

  const rows = useMemo(
    () =>
      courses
        .filter((c) => {
          const key = c.subjectCode + c.catalogNumber;
          if (programOnly && !requiredSet.has(key)) return false;
          if (requiredOnly && !requiredSet.has(key)) return false;
          if (subjects.length && !subjects.includes(c.subjectCode))
            return false;
          const q = search.trim().toLowerCase();
          if (q) {
            const codeStr = `${c.subjectCode} ${c.catalogNumber}`.toLowerCase();
            if (
              !codeStr.includes(q) &&
              !c.title.toLowerCase().includes(q) &&
              !(c.requirementsDescription || "")
                .toLowerCase()
                .includes(q)
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
    [courses, programOnly, requiredOnly, subjects, search, requiredSet]
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
      field: "required",
      headerName: "Program fit",
      width: 150,
      sortable: false,
      renderCell: (params) =>
        requiredSet.has(params.row.id) ? (
          <Chip size="small" color="secondary" label="Required" />
        ) : (
          <Chip size="small" variant="outlined" label="Elective" />
        ),
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
        <IconButton size="small" onClick={() => openInfo(params.row.raw)}>
          <InfoIcon />
        </IconButton>
      ),
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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (!Array.isArray(parsed?.requirements)) {
            throw new Error(
              "Invalid format: expected a `requirements` array in the JSON file."
            );
          }
          setUploadError(null);
          onProgramPlanChange(parsed);
        } catch (error) {
          console.error("Program upload error", error);
          setUploadError(error.message || "Unable to parse JSON file.");
        }
      };
      reader.onerror = () => {
        setUploadError("Unable to read the selected file.");
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    [onProgramPlanChange]
  );

  const programName = programPlan?.programName || "Program requirements";
  const requirementGroups = programPlan?.requirements || [];
  const totalRequirementCount = requirementGroups.length;
  const flattenedRequirementCount = requiredSet.size;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          background: (theme) =>
            theme.palette.mode === "light"
              ? "linear-gradient(135deg, rgba(0,93,170,0.08), rgba(0,93,170,0))"
              : "linear-gradient(135deg, rgba(144,202,249,0.15), rgba(17,24,39,0.6))",
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {programName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload a JSON file with your specialized program requirements to
                tailor the catalog and planner experience.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                hidden
                onChange={handleFileUpload}
              />
              <Tooltip title="Import a JSON plan exported by your program advisor">
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<UploadIcon />}
                  onClick={handleUploadClick}
                >
                  Upload plan
                </Button>
              </Tooltip>
              <Tooltip title="Restore the default Computational Mathematics plan">
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<RestartAltIcon />}
                  onClick={() => {
                    setUploadError(null);
                    onProgramPlanReset();
                  }}
                >
                  Reset
                </Button>
              </Tooltip>
            </Stack>
          </Stack>

          {uploadError && <Alert severity="error">{uploadError}</Alert>}

          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Chip
              icon={<CheckCircleIcon />}
              color="primary"
              label={`${totalRequirementCount} requirement group${
                totalRequirementCount === 1 ? "" : "s"
              }`}
            />
            <Chip
              variant="outlined"
              color="primary"
              label={`${flattenedRequirementCount} individual course${
                flattenedRequirementCount === 1 ? "" : "s"
              } tracked`}
            />
            {programPlan?.cohort && (
              <Chip
                variant="outlined"
                color="secondary"
                label={`Cohort: ${programPlan.cohort}`}
              />
            )}
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", lg: "center" }}
          flexWrap="wrap"
        >
          <TextField
            label="Search courses"
            size="small"
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
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
              {allSubjects.map((sub) => (
                <MenuItem key={sub} value={sub}>
                  <Checkbox checked={subjects.includes(sub)} />
                  <Typography sx={{ ml: 1 }}>{sub}</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={programOnly}
                onChange={(e) => setProgramOnly(e.target.checked)}
              />
            }
            label="Show program matches"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={requiredOnly}
                onChange={(e) => setRequiredOnly(e.target.checked)}
              />
            }
            label="Only required courses"
          />
        </Stack>
      </Paper>

      <Box sx={{ flex: 1 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={25}
          rowsPerPageOptions={[25, 50, 100]}
          disableSelectionOnClick
          autoHeight
          sx={{
            bgcolor: "transparent",
            border: 0,
            "& .MuiDataGrid-columnHeaders": {
              borderRadius: 0,
              backgroundColor: (theme) =>
                theme.palette.mode === "light"
                  ? "rgba(226, 232, 240, 0.6)"
                  : "rgba(30, 41, 59, 0.7)",
            },
            "& .MuiDataGrid-cell": {
              borderColor: (theme) =>
                theme.palette.mode === "light"
                  ? "rgba(148, 163, 184, 0.3)"
                  : "rgba(71, 85, 105, 0.5)",
            },
            "& .MuiDataGrid-row:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "light"
                  ? "rgba(0,93,170,0.06)"
                  : "rgba(148, 197, 239, 0.12)",
            },
          }}
        />
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
              {dialogCourse.description || "None"}
            </Typography>
            {dialogCourse.requirementsDescription && (
              <>
                <Typography variant="subtitle1" gutterBottom>
                  Prerequisites
                </Typography>
                <Typography variant="body2" paragraph>
                  {dialogCourse.requirementsDescription}
                </Typography>
              </>
            )}
            <Box mt={3}>
              <TextField
                select
                label="Term"
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
                ? "Added"
                : "Add to Plan"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
