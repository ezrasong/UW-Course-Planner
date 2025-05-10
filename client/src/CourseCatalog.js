import React, { useState, useMemo } from "react";
import compMathPlan from "../data/comp_math_plan.json"; 
import {
  Box,
  TextField,
  Checkbox,
  FormControlLabel,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  useTheme,
  useMediaQuery,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Chip,
} from "@mui/material";
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

export default function CourseCatalog({ courses, planCodes, onAddCourse }) {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down("sm"));

  // Build sets from comp_math_plan.json
  const requiredSet = useMemo(() => {
    const s = new Set();
    compMathPlan.requirements.forEach((r) =>
      r.options.forEach((code) => s.add(code))
    );
    return s;
  }, []);

  // Filters state
  const [search, setSearch] = useState("");
  const [programOnly, setProgramOnly] = useState(false);
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [dialogCourse, setDialogCourse] = useState(null);
  const [dialogTerm, setDialogTerm] = useState(termOptions[0]);

  // Unique subjects for dropdown
  const allSubjects = useMemo(() => {
    return Array.from(new Set(courses.map((c) => c.subjectCode))).sort();
  }, [courses]);

  // Helpers
  const isRequired = (course) =>
    requiredSet.has(course.subjectCode + course.catalogNumber);
  const isRelevant = (course) =>
    isRequired(course) || relevantSubjects.has(course.subjectCode);

  // Filtered list
  const list = courses.filter((c) => {
    if (programOnly && !isRelevant(c)) return false;
    if (requiredOnly && !isRequired(c)) return false;
    if (subjects.length > 0 && !subjects.includes(c.subjectCode)) return false;
    const q = search.trim().toLowerCase();
    if (q) {
      const code = `${c.subjectCode} ${c.catalogNumber}`.toLowerCase();
      if (!code.includes(q) && !c.title.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Dialog handlers
  const openInfo = (course) => {
    setDialogCourse(course);
    setDialogTerm(termOptions[0]);
  };
  const closeInfo = () => setDialogCourse(null);
  const handleAdd = () => {
    onAddCourse(
      dialogCourse.subjectCode + dialogCourse.catalogNumber,
      dialogTerm
    );
    closeInfo();
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        p: 2,
      }}
    >
      {/* Top controls */}
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
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
                <Checkbox checked={subjects.includes(sub)} />
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

      {/* Main content */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {isSm ? (
          <Grid container spacing={2}>
            {list.map((c) => {
              const code = `${c.subjectCode} ${c.catalogNumber}`;
              const added = planCodes.has(code.replace(" ", ""));
              return (
                <Grid item xs={12} key={code}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6">{code}</Typography>
                      <Typography variant="subtitle1" gutterBottom>
                        {c.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Prereq: {c.requirementsDescription || "None"}
                      </Typography>
                    </CardContent>
                    <CardActions
                      sx={{ justifyContent: "space-between", px: 2 }}
                    >
                      <IconButton size="small" onClick={() => openInfo(c)}>
                        <InfoIcon />
                      </IconButton>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => openInfo(c)}
                        disabled={added}
                      >
                        {added ? "Added" : "Add"}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ minWidth: 650 }}
          >
            <Table stickyHeader size="medium">
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Prerequisites</TableCell>
                  <TableCell align="center">Info</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((c) => {
                  const code = `${c.subjectCode} ${c.catalogNumber}`;
                  const added = planCodes.has(code.replace(" ", ""));
                  return (
                    <TableRow
                      key={code}
                      hover
                      sx={{
                        "&:nth-of-type(even)": {
                          backgroundColor: theme.palette.action.hover,
                        },
                      }}
                    >
                      <TableCell>
                        <strong>{code}</strong>
                      </TableCell>
                      <TableCell>{c.title}</TableCell>
                      <TableCell>
                        {c.requirementsDescription || <em>None</em>}
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => openInfo(c)}>
                          <InfoIcon />
                        </IconButton>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => openInfo(c)}
                          disabled={added}
                        >
                          {added ? "Added" : "Add"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Info Dialog */}
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
            <Grid container spacing={2}>
              {[
                ["Grading Basis", dialogCourse.gradingBasis],
                ["Component Code", dialogCourse.courseComponentCode],
                [
                  "Enroll Consent",
                  `${dialogCourse.enrollConsentCode || "—"} ${
                    dialogCourse.enrollConsentDescription || ""
                  }`.trim(),
                ],
                [
                  "Drop Consent",
                  `${dialogCourse.dropConsentCode || "—"} ${
                    dialogCourse.dropConsentDescription || ""
                  }`.trim(),
                ],
                [
                  "Prerequisites",
                  dialogCourse.requirementsDescription || "None",
                ],
              ].map(([label, val]) => (
                <Grid item xs={12} sm={6} key={label}>
                  <Typography variant="subtitle2">{label}</Typography>
                  <Typography variant="body2">{val || "—"}</Typography>
                </Grid>
              ))}
            </Grid>
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
