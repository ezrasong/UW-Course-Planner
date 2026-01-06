import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Container,
  Stack,
  Paper,
  Avatar,
  Tooltip,
  Alert,
  useMediaQuery,
} from "@mui/material";
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

import { fetchCourses } from "./api/fetchCourses";
import CourseCatalog from "./components/CourseCatalog";
import Planner from "./components/Planner";
import Login from "./components/Login";
import defaultProgram from "./data/comp_math_plan.json";

function App() {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [plan, setPlan] = useState([]);
  const [view, setView] = useState("catalog");
  const [darkMode, setDarkMode] = useState(prefersDark);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState("");
  const [programProfile, setProgramProfile] = useState(() => ({
    name: defaultProgram.name || "Program plan",
    requirements: defaultProgram.requirements || [],
  }));

  useEffect(() => {
    const saved = localStorage.getItem("uwcp_theme");
    if (saved === "dark" || saved === "light") {
      setDarkMode(saved === "dark");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("uwcp_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? "dark" : "light",
          primary: { main: darkMode ? "#60a5fa" : "#2563eb" },
          secondary: { main: darkMode ? "#22d3ee" : "#0891b2" },
          background: {
            default: darkMode ? "#0b1221" : "#f6f7fb",
            paper: darkMode ? "#0f172a" : "#ffffff",
          },
        },
        shape: { borderRadius: 12 },
        typography: {
          fontFamily:
            '"Space Grotesk", "Inter", system-ui, -apple-system, sans-serif',
          h6: { fontWeight: 700 },
          button: { fontWeight: 600, textTransform: "none" },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                border: "1px solid",
                borderColor: darkMode ? "#1e293b" : "#e5e7eb",
              },
            },
          },
        },
      }),
    [darkMode]
  );

  const planCodes = useMemo(
    () => new Set(plan.map((entry) => entry.course_code)),
    [plan]
  );
  const requiredSet = useMemo(() => {
    const s = new Set();
    (programProfile.requirements || []).forEach((r) =>
      (r.options || []).forEach((code) => s.add(code))
    );
    return s;
  }, [programProfile]);
  const requiredCovered = useMemo(() => {
    let count = 0;
    requiredSet.forEach((code) => {
      if (planCodes.has(code)) count += 1;
    });
    return count;
  }, [planCodes, requiredSet]);
  const requiredTotal = requiredSet.size;
  const completedCount = useMemo(
    () => plan.filter((p) => p.completed).length,
    [plan]
  );
  const coursesMap = useMemo(() => {
    return courses.reduce((map, c) => {
      const key = c.subjectCode + c.catalogNumber;
      map[key] = c;
      return map;
    }, {});
  }, [courses]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser(data.session.user);
    });
  }, []);

  const loadPlan = useCallback(() => {
    if (!user) return;
    supabase
      .from("user_courses")
      .select("course_code, term, completed")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error("Error loading plan:", error);
          return;
        }
        setPlan(data || []);
      });
  }, [user]);

  const loadCourses = useCallback(async () => {
    if (!user) return;
    setLoadingCourses(true);
    setCoursesError("");
    try {
      const results = await fetchCourses();
      setCourses(results);
    } catch (err) {
      console.error("Error loading courses:", err);
      setCoursesError("Unable to load the course catalog right now.");
    } finally {
      setLoadingCourses(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadCourses();
    loadPlan();
  }, [user, loadCourses, loadPlan]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPlan([]);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const addCourse = (code, term) => {
    supabase
      .from("user_courses")
      .insert({ user_id: user.id, course_code: code, term })
      .select()
      .then(({ data, error }) => {
        if (error) {
          console.error("Add course error:", error);
          return;
        }
        setPlan((prev) => [...prev, data[0]]);
      });
  };

  const removeCourse = (code) => {
    supabase
      .from("user_courses")
      .delete()
      .eq("user_id", user.id)
      .eq("course_code", code)
      .then(({ error }) => {
        if (error) {
          console.error("Remove course error:", error);
          return;
        }
        setPlan((prev) => prev.filter((p) => p.course_code !== code));
      });
  };

  const toggleComplete = (code) => {
    const entry = plan.find((p) => p.course_code === code);
    if (!entry) return;
    supabase
      .from("user_courses")
      .update({ completed: !entry.completed })
      .eq("user_id", user.id)
      .eq("course_code", code)
      .select()
      .then(({ data, error }) => {
        if (error) {
          console.error("Toggle complete error:", error);
          return;
        }
        setPlan((prev) =>
          prev.map((p) => (p.course_code === code ? data[0] : p))
        );
      });
  };

  const importPlan = async (entries) => {
    if (!entries.length) return 0;
    const payload = entries.map((entry) => ({
      user_id: user.id,
      course_code: entry.course_code,
      term: entry.term || "TBD",
      completed: !!entry.completed,
    }));

    const { data, error } = await supabase
      .from("user_courses")
      .upsert(payload, { onConflict: "user_id,course_code" })
      .select();

    if (error) {
      console.error("Import plan error:", error);
      throw error;
    }

    setPlan((prev) => {
      const next = new Map(prev.map((p) => [p.course_code, p]));
      data.forEach((row) => next.set(row.course_code, row));
      return Array.from(next.values());
    });

    return data.length;
  };

  const updateProgramProfile = (profile) => {
    if (!profile || !Array.isArray(profile.requirements)) return;
    setProgramProfile({
      name: profile.name || "Custom program",
      requirements: profile.requirements.map((req) => ({
        description: req.description || "Requirement",
        options: (req.options || []).map((c) => String(c).replace(/\s+/g, "")),
      })),
    });
  };

  const displayName =
    user.user_metadata?.full_name ||
    user.email
      .split("@")[0]
      .split(".")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");

  const tabSx = (viewName) => ({
    textTransform: "none",
    px: 2.75,
    py: 0.8,
    borderRadius: 12,
    fontWeight: 700,
    bgcolor: view === viewName ? "primary.main" : "transparent",
    color: view === viewName ? "grey.900" : "common.white",
    "&:hover": {
      bgcolor: view === viewName ? "primary.light" : "rgba(255,255,255,0.08)",
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className={`app-shell ${darkMode ? "dark" : "light"}`}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            background: darkMode ? "rgba(15, 23, 42, 0.9)" : "rgba(255,255,255,0.92)",
            color: darkMode ? "common.white" : "text.primary",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Toolbar sx={{ py: 1.5, gap: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
              <Avatar
                src={`${process.env.PUBLIC_URL}/uwlogo.svg`}
                alt="UW"
                sx={{ width: 40, height: 40, bgcolor: "primary.main" }}
              />
              <Typography variant="h6" sx={{ letterSpacing: 0.2 }}>
                UW Course Planner
              </Typography>
              <Button sx={tabSx("catalog")} onClick={() => setView("catalog")}>
                Catalog
              </Button>
              <Button sx={tabSx("planner")} onClick={() => setView("planner")}>
                Planner
              </Button>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Tooltip title="Reload catalog">
                <IconButton color="inherit" onClick={loadCourses} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="body2" sx={{ color: "grey.100" }}>
                {displayName}
              </Typography>
              <Tooltip title="Sign out">
                <IconButton color="inherit" onClick={handleLogout} size="small">
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
                <IconButton
                  color="inherit"
                  onClick={() => setDarkMode((d) => !d)}
                  size="small"
                >
                  {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ pt: 4, pb: 6 }}>
          <Paper elevation={0} className="summary-panel">
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Stack spacing={0.75}>
                <Typography variant="subtitle2" color="text.secondary">
                  Overview
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {programProfile.name || "Program plan"}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="outlined"
                  onClick={() => setView("catalog")}
                  color={view === "catalog" ? "primary" : "inherit"}
                >
                  Catalog
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setView("planner")}
                  color={view === "planner" ? "primary" : "secondary"}
                >
                  Planner
                </Button>
              </Stack>
            </Stack>

            <Box className="metric-grid">
              <MetricCard
                label="Catalog courses"
                value={courses.length || "…"}
                hint="Loaded from Supabase"
                highlight
              />
              <MetricCard
                label="In planner"
                value={plan.length}
                hint={`${completedCount} marked complete`}
              />
              <MetricCard
                label="Requirement coverage"
                value={
                  requiredTotal
                    ? `${Math.round((requiredCovered / requiredTotal) * 100)}%`
                    : "—"
                }
                hint={
                  requiredTotal
                    ? `${requiredCovered} of ${requiredTotal} required`
                    : "Upload a program JSON"
                }
              />
              <MetricCard
                label="Program profile"
                value={programProfile.name || "Custom"}
                hint={`${requiredTotal || 0} requirements tracked`}
              />
            </Box>
          </Paper>

          {coursesError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {coursesError}
            </Alert>
          )}

          <Paper elevation={0} className="glass-panel main-panel">
            <Stack spacing={3}>
              {view === "catalog" ? (
                <CourseCatalog
                  courses={courses}
                  loading={loadingCourses}
                  planCodes={planCodes}
                  onAddCourse={addCourse}
                  onRemoveCourse={removeCourse}
                  onRefresh={loadCourses}
                  programProfile={programProfile}
                  onProgramUpload={updateProgramProfile}
                />
              ) : (
                <Planner
                  plan={plan}
                  coursesMap={coursesMap}
                  onRemoveCourse={removeCourse}
                  onToggleComplete={toggleComplete}
                  onImportPlan={importPlan}
                />
              )}
            </Stack>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

function MetricCard({ label, value, hint, highlight = false }) {
  return (
    <Paper
      variant="outlined"
      className="metric-card"
      sx={{
        borderColor: highlight ? "primary.main" : "divider",
        backgroundColor: highlight ? "primary.main" : "background.paper",
        color: highlight ? "grey.900" : "text.primary",
      }}
    >
      <Typography
        variant="body2"
        color={highlight ? "grey.900" : "text.secondary"}
      >
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
        {value}
      </Typography>
      <Typography
        variant="caption"
        color={highlight ? "grey.900" : "text.secondary"}
        sx={{ mt: 0.5 }}
      >
        {hint}
      </Typography>
    </Paper>
  );
}

export default App;
