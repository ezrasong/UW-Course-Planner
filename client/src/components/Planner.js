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
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import CloseIcon from "@mui/icons-material/Close";

export default function Planner({
  plan,
  coursesMap,
  onRemoveCourse,
  onToggleComplete,
}) {
  const [search, setSearch] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);

  const allSubjects = useMemo(() => {
    const setSub = new Set();
    plan.forEach((item) => setSub.add(item.course_code.match(/^[A-Za-z]+/)[0]));
    return Array.from(setSub).sort();
  }, [plan]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plan.filter((item) => {
      const subj = item.course_code.match(/^[A-Za-z]+/)[0];
      if (subjects.length && !subjects.includes(subj)) return false;
      if (q) {
        const code = item.course_code.toLowerCase();
        const title = (coursesMap[item.course_code]?.title || "").toLowerCase();
        return code.includes(q) || title.includes(q);
      }
      return true;
    });
  }, [plan, search, subjects, coursesMap]);

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
          av = a.term;
          bv = b.term;
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

  return (
    <Box>
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
      </Box>

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
                  No rows
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((item) => {
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
                      <IconButton size="small" onClick={() => openDialog(code)}>
                        <InfoIcon fontSize="small" />
                      </IconButton>
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
    </Box>
  );
}
