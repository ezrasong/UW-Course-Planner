import React, { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Chip,
  Checkbox,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Info as InfoIcon, Delete as DeleteIcon, Close as CloseIcon } from '@mui/icons-material';

const termOptions = ['1A','1B','2A','2B','3A','3B','4A','4B'];

export default function Planner({ plan, coursesMap, onRemoveCourse, onToggleComplete }) {
  const theme = useTheme();
  const isSm = useMediaQuery(theme.breakpoints.down('sm'));

  // Filter state
  const [search, setSearch] = useState('');
  const [subjects, setSubjects] = useState([]);

  // Derive unique subjects from the plan’s courses
  const allSubjects = useMemo(() => {
    const set = new Set(plan.map(item => {
      const c = coursesMap[item.code] || {};
      return c.subjectCode;
    }));
    return Array.from(set).sort();
  }, [plan, coursesMap]);

  // Prepare rows and apply search + subject filters
  const rows = useMemo(() => {
    return plan
      .filter(item => {
        const course = coursesMap[item.code] || {};
        const code = `${course.subjectCode || ''} ${course.catalogNumber || ''}`.trim();
        // Search filter
        const q = search.trim().toLowerCase();
        if (q && !(
          code.toLowerCase().includes(q) ||
          (course.title || '').toLowerCase().includes(q)
        )) {
          return false;
        }
        // Subject filter
        if (subjects.length && !subjects.includes(course.subjectCode)) {
          return false;
        }
        return true;
      })
      .map(item => {
        const course = coursesMap[item.code] || {};
        const code = `${course.subjectCode || ''} ${course.catalogNumber || ''}`.trim();
        return {
          id: item.code,
          code,
          title: course.title || '',
          term: item.term,
          completed: item.completed,
          raw: { ...course, ...item }
        };
      });
  }, [plan, coursesMap, search, subjects]);

  // DataGrid columns
  const columns = [
    { field: 'code', headerName: 'Code', width: 120 },
    { field: 'title', headerName: 'Title', flex: 1, minWidth: 200 },
    { field: 'term', headerName: 'Term', width: 90 },
    {
      field: 'completed',
      headerName: 'Done',
      width: 80,
      renderCell: params => (
        <Checkbox
          checked={params.row.completed}
          onChange={() => onToggleComplete(params.row.id)}
        />
      )
    },
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
      field: 'remove',
      headerName: '',
      width: 80,
      sortable: false,
      renderCell: params => (
        <IconButton size="small" onClick={() => onRemoveCourse(params.row.id)}>
          <DeleteIcon />
        </IconButton>
      )
    }
  ];

  // Info dialog state
  const [dialogCourse, setDialogCourse] = useState(null);
  const openInfo = course => setDialogCourse(course);
  const closeInfo = () => setDialogCourse(null);

  return (
    <Box sx={{ display:'flex', flexDirection:'column', height:'100vh', p:2 }}>
      {/* Filters */}
      <Box sx={{ display:'flex', flexWrap:'wrap', gap:2, mb:2, alignItems:'center' }}>
        <TextField
          label="Search"
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth:200, flexGrow:1 }}
        />
        <FormControl size="small" sx={{ minWidth:180 }}>
          <InputLabel>Subject</InputLabel>
          <Select
            multiple
            value={subjects}
            onChange={e => setSubjects(e.target.value)}
            input={<OutlinedInput label="Subject" />}
            renderValue={sel => (
              <Box sx={{ display:'flex', flexWrap:'wrap', gap:.5 }}>
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
      </Box>

      {/* Planner content */}
      <Box sx={{ flex:1, overflow:'auto' }}>
        {isSm ? (
          <Grid container spacing={2}>
            {rows.map(r => (
              <Grid item xs={12} key={r.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6">{r.code}</Typography>
                    <Typography variant="subtitle1">{r.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Term: {r.term}
                    </Typography>
                    <Box sx={{ display:'flex', alignItems:'center', mt:1 }}>
                      <Checkbox
                        checked={r.completed}
                        onChange={() => onToggleComplete(r.id)}
                      />
                      <Typography variant="body2">Completed</Typography>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent:'space-between', px:2 }}>
                    <IconButton size="small" onClick={() => openInfo(r.raw)}>
                      <InfoIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => onRemoveCourse(r.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10,25]}
            disableSelectionOnClick
            autoHeight
          />
        )}
      </Box>

      {/* Info Dialog */}
      {dialogCourse && (
        <Dialog open onClose={closeInfo} fullWidth maxWidth="md">
          <DialogTitle>
            {dialogCourse.subjectCode} {dialogCourse.catalogNumber} — {dialogCourse.title}
            <IconButton onClick={closeInfo} sx={{ position:'absolute', right:8, top:8 }}>
              <CloseIcon/>
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
              ].map(([label, val])=>(
                <Grid item xs={12} sm={6} key={label}>
                  <Typography variant="subtitle2">{label}</Typography>
                  <Typography variant="body2">{val||'—'}</Typography>
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeInfo}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}