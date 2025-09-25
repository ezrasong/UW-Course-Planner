import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  Fade,
  Chip as MuiChip,
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
import { DEFAULT_PLAN, normalizePlan } from "../utils/programPlan";

const termOptions = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];

export default function CourseCatalog({
  courses,
  planCodes,
  onAddCourse,
  onRemoveCourse,
  loading = false,
  storedPlan,
  onPlanSave,
  savingPlan = false,
  planSyncError = null,
  planSyncLoading = false,
  lastSyncedAt = null,
}) {
  const [rawSearch, setRawSearch] = useState("");
  const [search, setSearch] = useState("");
  const [programOnly, setProgramOnly] = useState(false);
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [dialogCourse, setDialogCourse] = useState(null);
  const [dialogTerm, setDialogTerm] = useState(termOptions[0]);
  const [planData, setPlanData] = useState(() =>
    storedPlan ? normalizePlan(storedPlan) : DEFAULT_PLAN
  );
  const [uploadError, setUploadError] = useState(null);

  const debouncedSetSearch = useMemo(
    () => debounce((val) => setSearch(val), 300),
    []
  );
  useEffect(() => {
    debouncedSetSearch(rawSearch);
  }, [rawSearch, debouncedSetSearch]);
  useEffect(() => () => debouncedSetSearch.cancel(), [debouncedSetSearch]);

  useEffect(() => {
    if (planSyncLoading) return;
    if (storedPlan) {
      setPlanData(normalizePlan(storedPlan));
    } else {
      setPlanData(DEFAULT_PLAN);
    }
  }, [storedPlan, planSyncLoading]);

  const normalizeCode = (code = "") => code.replace(/\s+/g, "");

  const presentableCode = (code = "") => {
    const trimmed = code.trim();
    if (!trimmed) return "";
    const match = trimmed.match(/^([A-Za-z]+)([0-9].*)$/);
    if (!match) return trimmed;
    return `${match[1]} ${match[2]}`;
  };

  const requiredSet = useMemo(() => {
    const s = new Set();
    planData.requirements.forEach((r) =>
      r.options.forEach((code) => s.add(normalizeCode(code)))
    );
    return s;
  }, [planData]);

  const programSubjects = useMemo(
    () => new Set(planData.relevantSubjects ?? []),
    [planData]
  );

  const requirementProgress = useMemo(() => {
    return planData.requirements.map((req) => {
      const matchedCode = req.options.find((code) =>
        planCodes.has(normalizeCode(code))
      );
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

  const courseMap = useMemo(() => {
    return courses.reduce((map, course) => {
      const key = course.subjectCode + course.catalogNumber;
      map.set(key, course);
      return map;
    }, new Map());
  }, [courses]);

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

  const visibleCount = rows.length;
  const filtersActive =
    programOnly ||
    requiredOnly ||
    subjects.length > 0 ||
    Boolean(search.trim());

  const NoRowsOverlay = () => (
    <Stack spacing={1} alignItems="center" justifyContent="center" sx={{ p: 4 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        No courses match the current filters
      </Typography>
      <Typography variant="body2" color="text.secondary" align="center">
        {filtersActive
          ? "Adjust or clear the search filters to discover more offerings."
          : "The catalog may still be loading—please check back in a moment."}
      </Typography>
    </Stack>
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

  const handlePlanUpload = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
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
          if (onPlanSave) {
            await onPlanSave(normalized);
          }
        } catch (err) {
          console.error("Failed to load custom plan", err);
          setUploadError(
            "Unable to read or save that file. Make sure it's valid JSON with a requirements array."
          );
        }
      };
      reader.readAsText(file);
      // Allow re-uploading the same file by clearing the input value
      event.target.value = "";
    },
    [onPlanSave]
  );

  const resetPlan = useCallback(async () => {
    setPlanData(DEFAULT_PLAN);
    setUploadError(null);
    if (onPlanSave) {
      try {
        await onPlanSave(DEFAULT_PLAN);
      } catch (err) {
        console.error("Failed to reset plan", err);
        setUploadError("We couldn't save the default plan. Please try again.");
      }
    }
  }, [onPlanSave]);

  function openInfo(courseOrCode) {
    if (!courseOrCode) return;
    let nextCourse = courseOrCode;
    if (typeof courseOrCode === "string") {
      const normalized = normalizeCode(courseOrCode);
      nextCourse = courseMap.get(normalized);
      if (!nextCourse) {
        const subject = normalized.match(/^[A-Za-z]+/)?.[0] || normalized;
        const catalog = normalized.slice(subject.length);
        nextCourse = {
          subjectCode: subject,
          catalogNumber: catalog,
          title: "Course details unavailable",
          description:
            "We couldn't find this course in the current catalog, but it is still part of the structured requirement list.",
        };
      }
    }
    setDialogCourse(nextCourse);
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

  const handleRequirementChipClick = (code) => {
    const normalized = normalizeCode(code);
    openInfo(normalized);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, gap: 3 }}>
      <Box
        sx={{
          mt: 0,
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          alignItems: "stretch",
          gap: { xs: 2.5, lg: 4 },
          flex: 1,
          minHeight: 0,
        }}
      >
        <Paper
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 3,
            position: "relative",
            overflow: "hidden",
            backdropFilter: "blur(18px)",
            background: (theme) =>
              `linear-gradient(160deg, ${alpha(
                theme.palette.background.paper,
                0.65
              )} 0%, ${alpha(theme.palette.background.paper, 0.42)} 100%)`,
            border: (theme) =>
              `1px solid ${alpha(theme.palette.divider, 0.35)}`,
            boxShadow: (theme) =>
              `0 30px 70px ${alpha(theme.palette.common.black, 0.22)}`,
            width: { xs: "100%", lg: 320 },
            flexShrink: 0,
            alignSelf: { lg: "flex-start" },
            position: { lg: "sticky" },
            top: { lg: 0 },
            maxHeight: { lg: "calc(100vh - 200px)" },
            display: "flex",
            flexDirection: "column",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: -60,
              background: (theme) =>
                `radial-gradient(55% 55% at 15% 20%, ${alpha(
                  theme.palette.primary.light,
                  0.25
                )} 0%, transparent 65%)`,
              filter: "blur(80px)",
              opacity: 0.9,
            },
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              background: (theme) =>
                `linear-gradient(120deg, ${alpha(
                  theme.palette.common.white,
                  0.08
                )} 0%, transparent 45%, ${alpha(
                  theme.palette.primary.main,
                  0.12
                )} 100%)`,
              pointerEvents: "none",
            },
          }}
        >
          <Stack spacing={2.5} sx={{ position: "relative", flex: 1, minHeight: 0 }}>
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

          <Divider sx={{ opacity: 0.6 }} />

          <Stack spacing={1.25} sx={{ flexGrow: 1, minHeight: 0 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Requirement checklist
            </Typography>
            <List
              dense
              sx={{
                borderRadius: 2.5,
                overflow: "auto",
                flex: 1,
                minHeight: 0,
                pr: 0.5,
                pt: 0.5,
                pb: 0.75,
                position: "relative",
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
                  <ListItem
                    key={`${req.description}-${idx}`}
                    disableGutters
                    sx={{
                      mb: 1,
                      px: 1.25,
                      py: 1.1,
                      borderRadius: 2,
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 0.75,
                      bgcolor: (theme) =>
                        alpha(theme.palette.background.paper, 0.55),
                      border: (theme) =>
                        `1px solid ${alpha(
                          req.satisfied
                            ? theme.palette.success.main
                            : theme.palette.primary.main,
                          req.satisfied ? 0.35 : 0.2
                        )}`,
                      boxShadow: (theme) =>
                        `0 18px 32px ${alpha(
                          req.satisfied
                            ? theme.palette.success.main
                            : theme.palette.primary.main,
                          0.14
                        )}`,
                      backdropFilter: "blur(12px)",
                      transition: "transform 0.25s ease, box-shadow 0.25s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: (theme) =>
                          `0 24px 40px ${alpha(
                            req.satisfied
                              ? theme.palette.success.main
                              : theme.palette.primary.main,
                            0.22
                          )}`,
                      },
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
                        {req.satisfied ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : (
                          <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={req.description}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                        secondaryTypographyProps={{ fontSize: 12 }}
                        secondary={
                          req.satisfied
                            ? `Satisfied by ${presentableCode(req.matchedCode)}`
                            : "Tap a course below to review and add it to your plan."
                        }
                      />
                    </Stack>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap">
                      {req.options.map((optionCode) => {
                        const normalized = normalizeCode(optionCode);
                        const inPlan = planCodes.has(normalized);
                        return (
                          <Tooltip
                            key={optionCode}
                            title={
                              inPlan
                                ? "Already in your planner"
                                : "Preview details and choose a term"
                            }
                          >
                            <Chip
                              clickable
                              label={presentableCode(optionCode)}
                              color={inPlan ? "success" : "primary"}
                              variant={inPlan ? "filled" : "outlined"}
                              icon={
                                inPlan ? (
                                  <CheckCircleIcon sx={{ fontSize: 18 }} />
                                ) : undefined
                              }
                              onClick={() => handleRequirementChipClick(optionCode)}
                              sx={{
                                fontSize: 13,
                                backdropFilter: "blur(6px)",
                                boxShadow: (theme) =>
                                  `0 12px 24px ${alpha(
                                    inPlan
                                      ? theme.palette.success.main
                                      : theme.palette.primary.main,
                                    0.22
                                  )}`,
                                borderColor: (theme) =>
                                  alpha(
                                    inPlan
                                      ? theme.palette.success.main
                                      : theme.palette.primary.main,
                                    inPlan ? 0.45 : 0.35
                                  ),
                                "& .MuiChip-icon": {
                                  color: (theme) => theme.palette.success.contrastText,
                                },
                              }}
                            />
                          </Tooltip>
                        );
                      })}
                    </Stack>
                  </ListItem>
                ))
              )}
            </List>
          </Stack>

          <Divider sx={{ opacity: 0.6 }} />

          <Stack spacing={1.75}>
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

          <Divider sx={{ opacity: 0.6 }} />

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
                disabled={savingPlan}
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
                disabled={savingPlan}
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
            {!uploadError && planSyncError && (
              <Alert severity="error">{planSyncError}</Alert>
            )}
            {!planSyncError && (
              <Typography variant="caption" color="text.secondary">
                {savingPlan
                  ? "Saving your requirement plan..."
                  : planSyncLoading
                  ? "Loading your saved requirement plan..."
                  : lastSyncedAt
                  ? `Last saved ${new Date(lastSyncedAt).toLocaleString()}`
                  : "Changes save to your account automatically."}
              </Typography>
            )}
          </Stack>
        </Stack>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            position: "relative",
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
            backdropFilter: "blur(16px)",
            background: (theme) =>
              `linear-gradient(150deg, ${alpha(
                theme.palette.background.paper,
                0.7
              )} 0%, ${alpha(theme.palette.background.paper, 0.45)} 100%)`,
            border: (theme) =>
              `1px solid ${alpha(theme.palette.divider, 0.35)}`,
            boxShadow: (theme) =>
              `0 28px 60px ${alpha(theme.palette.common.black, 0.2)}`,
            flex: 1,
            minWidth: 0,
            "&::before": {
              content: '""',
              position: "absolute",
              inset: -80,
              background: (theme) =>
                `radial-gradient(65% 55% at 85% 15%, ${alpha(
                  theme.palette.secondary.light,
                  0.3
                )} 0%, transparent 70%)`,
              filter: "blur(90px)",
              opacity: 0.9,
            },
          }}
        >
          <Box sx={{ p: 3, pb: 2 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Course Catalog
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Browse offerings and add them directly to your planner.
                </Typography>
              </Box>
              <MuiChip
                label={`${visibleCount.toLocaleString()} result${
                  visibleCount === 1 ? "" : "s"
                }`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <Fade in={loading} unmountOnExit>
              <LinearProgress sx={{ borderRadius: 999 }} />
            </Fade>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <DataGrid
                rows={rows}
                columns={columns}
                disableRowSelectionOnClick
                loading={loading}
                slots={{
                  noRowsOverlay: NoRowsOverlay,
                }}
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
                      alpha(theme.palette.background.paper, 0.55),
                  },
                  "& .MuiDataGrid-row": {
                    transition: "background 0.2s ease",
                    borderRadius: 12,
                    overflow: "hidden",
                  },
                  "& .MuiDataGrid-row:hover": {
                    backgroundColor: (theme) =>
                      alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              />
            </Box>
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