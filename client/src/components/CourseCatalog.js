import React, { useState, useMemo, useEffect } from "react";
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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import debounce from "lodash.debounce";
import { Info as InfoIcon, Close as CloseIcon } from "@mui/icons-material";

const termOptions = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];
const relevantSubjects = new Set([
  "MATH",
  "AMATH",
  "CO",
  "CS",
  "PMATH",
  "STAT",
]);

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

  const debouncedSetSearch = useMemo(
    () => debounce((val) => setSearch(val), 300),
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
          if (
            programOnly &&
            !requiredSet.has(key) &&
            !relevantSubjects.has(c.subjectCode)
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          mb: 2,
          alignItems: "center",
        }}
      >
        <TextField
          label="Search courses"
          size="small"
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
          sx={{ minWidth: 200, flexGrow: 1 }}
        />
        <FormControl sx={{ minWidth: 180 }} size="small">
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
                <Checkbox checked={subjects.includes(sub)} />{" "}
                <Typography>{sub}</Typography>
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
          label="Program only"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={requiredOnly}
              onChange={(e) => setRequiredOnly(e.target.checked)}
            />
          }
          label="Required only"
        />
      </Box>

      <Box sx={{ flex: 1 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={25}
          rowsPerPageOptions={[25, 50, 100]}
          disableSelectionOnClick
          autoHeight
        />
      </Box>

      {dialogCourse && (
        <Dialog open onClose={closeInfo} fullWidth maxWidth="md">
          <DialogTitle>
            {dialogCourse.subjectCode} {dialogCourse.catalogNumber} —{" "}
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
            {/* Additional fields... */}
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