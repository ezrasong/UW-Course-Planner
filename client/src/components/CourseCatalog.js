import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  InputLabel,
  MenuItem,
  FormControl,
  Select,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import { supabase } from "../supabaseClient";

export default function CourseCatalog({ planCodes, onAddCourse }) {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [modalCourse, setModalCourse] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("subject_code")
        .limit(1000);
      if (error) console.error(error);
      else setCourses(data);
    };
    fetchCourses();
  }, []);

  const subjects = [...new Set(courses.map((c) => c.subject_code))].sort();

  const filtered = courses.filter((c) => {
    const matchesSearch = `${c.subject_code} ${c.catalog_number} ${c.title}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesSubject = subjectFilter
      ? c.subject_code === subjectFilter
      : true;
    return matchesSearch && matchesSubject;
  });

  return (
    <>
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          label="Search"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
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
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>Add</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((course) => {
              const code = `${course.subject_code} ${course.catalog_number}`;
              return (
                <TableRow key={course.course_id}>
                  <TableCell>{code}</TableCell>
                  <TableCell>{course.title}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => setModalCourse(course)}>
                      View
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={planCodes.has(code)}
                      onClick={() => onAddCourse(code, course.term_code)}
                    >
                      Add
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={!!modalCourse}
        onClose={() => setModalCourse(null)}
        fullWidth
        maxWidth="sm"
      >
        {modalCourse && (
          <>
            <DialogTitle>
              {modalCourse.subject_code} {modalCourse.catalog_number}:{" "}
              {modalCourse.title}
            </DialogTitle>
            <DialogContent dividers>
              <DialogContentText sx={{ mb: 2 }}>
                <strong>Description:</strong>
                <br />
                {modalCourse.description || "No description available."}
              </DialogContentText>
              <DialogContentText sx={{ mb: 2 }}>
                <strong>Prerequisites:</strong>
                <br />
                {modalCourse.requirements_description || "None"}
              </DialogContentText>
              <DialogContentText>
                <strong>Component:</strong> {modalCourse.course_component_code}{" "}
                <br />
                <strong>Grading:</strong> {modalCourse.grading_basis}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setModalCourse(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
