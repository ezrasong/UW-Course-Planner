import React, { useState, useMemo, useEffect } from 'react';
import compMathPlan from '../data/comp_math_plan.json';
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
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  IconButton
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import debounce from 'lodash.debounce';
import { Info as InfoIcon, Close as CloseIcon } from '@mui/icons-material';

const termOptions = ['1A','1B','2A','2B','3A','3B','4A','4B'];
const relevantSubjects = new Set(['MATH','AMATH','CO','CS','PMATH','STAT']);

export default function CourseCatalog({ courses, planCodes, onAddCourse }) {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));

  // Build sets from comp_math_plan.json
  const requiredSet = useMemo(() => {
    const s = new Set();
    compMathPlan.requirements.forEach(r =>
      r.options.forEach(code => s.add(code))
    );
    return s;
  }, []);

  // Filter states
  const [rawSearch, setRawSearch] = useState('');
  const [search, setSearch] = useState('');
  const [programOnly, setProgramOnly] = useState(false);
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [dialogCourse, setDialogCourse] = useState(null);
  const [dialogTerm, setDialogTerm] = useState(termOptions[0]);

  // Debounce the search input
  const debouncedSetSearch = useMemo(
    () => debounce(val => setSearch(val), 300),
    []
  );
  useEffect(() => {
    debouncedSetSearch(rawSearch);
  }, [rawSearch]);

  // Unique subjects for filter
  const allSubjects = useMemo(
    () => Array.from(new Set(courses.map(c => c.subjectCode))).sort(),
    [courses]
  );

  // Helpers
  const isRequired = c => requiredSet.has(c.subjectCode + c.catalogNumber);
  const isRelevant = c =>
    isRequired(c) || relevantSubjects.has(c.subjectCode);

  // Filtered & memoized rows
  const rows = useMemo(() => {
    return courses
      .filter(c => {
        if (programOnly && !isRelevant(c)) return false;
        if (requiredOnly && !isRequired(c)) return false;
        if (subjects.length && !subjects.includes(c.subjectCode)) return false;
        const q = search.trim().toLowerCase();
        if (q) {
          const code = `${c.subjectCode} ${c.catalogNumber}`.toLowerCase();
          if (!code.includes(q) && !c.title.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .map(c => ({
        id: c.subjectCode + c.catalogNumber,
        code: `${c.subjectCode} ${c.catalogNumber}`,
        title: c.title,
        prereq: c.requirementsDescription || 'None',
        raw: c
      }));
  }, [courses, programOnly, requiredOnly, subjects, search]);

  // DataGrid columns
  const columns = [
    { field: 'code', headerName: 'Code', width: 120 },
    { field: 'title', headerName: 'Title', flex: 1, minWidth: 200 },
    { field: 'prereq', headerName: 'Prerequisites', flex: 1, minWidth: 200 },
    {
      field: 'info',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: params => (
        <IconButton size="small" onClick={() => openInfo(params.row.raw)}>
          <InfoIcon />
        </IconButton>
      )
    },
    {
      field: 'action',
      headerName: '',
      width: 100,
      sortable: false,
      renderCell: params => {
        const added = planCodes.has(params.row.id);
        return (
          <Button
            size="small"
            variant="contained"
            disabled={added}
            onClick={() => openInfo(params.row.raw)}
          >
            {added ? 'Added' : 'Add'}
          </Button>
        );
      }
    }
  ];

  // Dialog Handlers
  const openInfo = c => {
    setDialogCourse(c);
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
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        p: 2
      }}
    >
      {/* Controls */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2,
          alignItems: 'center'
        }}
      >
        <TextField
          label="Search courses"
          size="small"
          value={rawSearch}
          onChange={e => setRawSearch(e.target.value)}
          sx={{ minWidth: 200, flexGrow: 1 }}
        />

        <FormControl sx={{ minWidth: 180 }} size="small">
          <InputLabel>Subject</InputLabel>
          <Select
            multiple
            value={subjects}
            onChange={e => setSubjects(e.target.value)}
            input={<OutlinedInput label="Subject" />}
            renderValue={sel => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {sel.map(s => <Chip key={s} label={s} size="small" />)}
              </Box>
            )}
          >
            {allSubjects.map(sub => (
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
              onChange={e => setProgramOnly(e.target.checked)}
            />
          }
          label="Program only"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={requiredOnly}
              onChange={e => setRequiredOnly(e.target.checked)}
            />
          }
          label="Required only"
        />
      </Box>

      {/* DataGrid */}
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

      {/* Info Dialog */}
      {dialogCourse && (
        <Dialog open onClose={closeInfo} fullWidth maxWidth="md">
          <DialogTitle>
            {dialogCourse.subjectCode} {dialogCourse.catalogNumber} — {dialogCourse.title}
            <IconButton onClick={closeInfo} sx={{ position:'absolute', right:8, top:8 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Typography variant="subtitle1" gutterBottom>Description</Typography>
            <Typography variant="body2" paragraph>
              {dialogCourse.description || 'None'}
            </Typography>
            <Grid container spacing={2}>
              {[
                ['Grading Basis', dialogCourse.gradingBasis],
                ['Component Code', dialogCourse.courseComponentCode],
                ['Enroll Consent', `${dialogCourse.enrollConsentCode||'—'} ${dialogCourse.enrollConsentDescription||''}`.trim()],
                ['Drop Consent', `${dialogCourse.dropConsentCode||'—'} ${dialogCourse.dropConsentDescription||''}`.trim()],
                ['Prerequisites', dialogCourse.requirementsDescription||'None'],
              ].map(([label, val]) => (
                <Grid item xs={12} sm={6} key={label}>
                  <Typography variant="subtitle2">{label}</Typography>
                  <Typography variant="body2">{val || '—'}</Typography>
                </Grid>
              ))}
            </Grid>
            <Box mt={3}>
              <TextField
                select
                label="Term"
                value={dialogTerm}
                onChange={e => setDialogTerm(e.target.value)}
                fullWidth
              >
                {termOptions.map(t => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeInfo}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleAdd}
              disabled={planCodes.has(dialogCourse.subjectCode + dialogCourse.catalogNumber)}
            >
              {planCodes.has(dialogCourse.subjectCode + dialogCourse.catalogNumber) ? 'Added' : 'Add to Plan'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
);
}
