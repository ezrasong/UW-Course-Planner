import React, { useState, useMemo } from "react";
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export default function Planner({
  plan,
  coursesMap,
  onRemoveCourse,
  onToggleComplete,
}) {
  const [search, setSearch] = useState("");
  const [subjects, setSubjects] = useState([]);

  // Derive unique subjects from the plan
  const allSubjects = useMemo(() => {
    const s = new Set();
    plan.forEach((item) => {
      // course_code is like "CS115" → extract letters
      const subj = item.course_code.match(/^[A-Za-z]+/)[0];
      s.add(subj);
    });
    return Array.from(s).sort();
  }, [plan]);

  // Filtered plan rows
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plan.filter((item) => {
      const subj = item.course_code.match(/^[A-Za-z]+/)[0];
      if (subjects.length > 0 && !subjects.includes(subj)) return false;

      if (q) {
        const code = item.course_code.toLowerCase();
        const title = (coursesMap[item.course_code]?.title || "").toLowerCase();
        return code.includes(q) || title.includes(q);
      }
      return true;
    });
  }, [plan, search, subjects, coursesMap]);

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          label="Search"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
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
            {allSubjects.map((s) => (
              <MenuItem key={s} value={s}>
                <MuiCheckbox checked={subjects.includes(s)} />
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Term</TableCell>
              <TableCell>Done</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No rows
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => {
                const code = item.course_code;
                const course = coursesMap[code] || {};
                return (
                  <TableRow key={code}>
                    <TableCell>{code}</TableCell>
                    <TableCell>{course.title || "-"}</TableCell>
                    <TableCell>{item.term}</TableCell>
                    <TableCell>
                      <Checkbox
                        size="small"
                        checked={!!item.completed}
                        onChange={() => onToggleComplete(code)}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => onRemoveCourse(code)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}