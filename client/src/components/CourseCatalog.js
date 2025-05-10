import React, { useState, useMemo } from "react";
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Button,
} from "@mui/material";

export default function CourseCatalog({ courses, planCodes, onAddCourse }) {
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [programOnly, setProgramOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const subjects = useMemo(() => {
    const unique = new Set();
    courses.forEach((c) => unique.add(c.subject_code));
    return Array.from(unique).sort();
  }, [courses]);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const code = `${c.subject_code} ${c.catalog_number}`.toLowerCase();
      const title = c.title?.toLowerCase() || "";
      const matchesSearch =
        code.includes(search.toLowerCase()) ||
        title.includes(search.toLowerCase());

      const matchesSubject = subjectFilter
        ? c.subject_code === subjectFilter
        : true;
      const matchesRequired = requiredOnly ? c.is_required : true;
      const matchesProgram = programOnly ? c.program_relevant : true;

      return (
        matchesSearch && matchesSubject && matchesRequired && matchesProgram
      );
    });
  }, [courses, search, subjectFilter, requiredOnly, programOnly]);

  const handleOpen = (course) => {
    setSelected(course);
    setOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
        <TextField
          label="Search"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Subject</InputLabel>
          <Select
            value={subjectFilter}
            label="Subject"
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {subjects.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Checkbox
              checked={requiredOnly}
              onChange={(e) => setRequiredOnly(e.target.checked)}
            />
          }
          label="Required only"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={programOnly}
              onChange={(e) => setProgramOnly(e.target.checked)}
            />
          }
          label="Program relevant only"
        />
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Term</TableCell>
              <TableCell>View</TableCell>
              <TableCell>Add</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No courses found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((course) => {
                const code = `${course.subject_code} ${course.catalog_number}`;
                return (
                  <TableRow key={code}>
                    <TableCell>{code}</TableCell>
                    <TableCell>{course.title}</TableCell>
                    <TableCell>{course.term_name}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => handleOpen(course)}>
                        Details
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        disabled={planCodes.has(code)}
                        onClick={() => onAddCourse(code, course.term_code)}
                      >
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selected && (
          <>
            <DialogTitle>
              {selected.subject_code} {selected.catalog_number} —{" "}
              {selected.title}
            </DialogTitle>
            <DialogContent dividers>
              <Typography gutterBottom>
                <strong>Description:</strong> {selected.description || "—"}
              </Typography>
              <Typography gutterBottom>
                <strong>Prerequisites:</strong>{" "}
                {selected.requirements_description || "—"}
              </Typography>
              <Typography gutterBottom>
                <strong>Grading Basis:</strong> {selected.grading_basis || "—"}
              </Typography>
              <Typography gutterBottom>
                <strong>Component:</strong>{" "}
                {selected.course_component_code || "—"}
              </Typography>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
