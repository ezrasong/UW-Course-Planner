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

function App() {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [plan, setPlan] = useState([]);
  const [view, setView] = useState("catalog");
  const [darkMode, setDarkMode] = useState(prefersDark);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState("");

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
          primary: { main: darkMode ? "#67e8f9" : "#0ea5e9" },
          secondary: { main: darkMode ? "#c084fc" : "#7c3aed" },
          background: {
            default: darkMode ? "#0b1221" : "#f6f7fb",
            paper: darkMode ? "#0f172a" : "#ffffff",
          },
        },
        shape: { borderRadius: 14 },
        typography: {
          fontFamily: '"Space Grotesk", "Inter", system-ui, -apple-system, sans-serif',
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

  const displayName =
    user.user_metadata?.full_name ||
    user.email
      .split("@")[0]
      .split(".")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");

  const tabSx = (viewName) => ({
    textTransform: "none",
    px: 2.5,
    borderRadius: 10,
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
        <div className="ambient-blob blob-1" />
        <div className="ambient-blob blob-2" />

        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(14px)",
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
              <Typography variant="h6" sx={{ letterSpacing: 0.4 }}>
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
          <Paper elevation={0} className="glass-panel">
            <Stack spacing={2}>
              {coursesError && <Alert severity="error">{coursesError}</Alert>}
              {view === "catalog" ? (
                <CourseCatalog
                  courses={courses}
                  loading={loadingCourses}
                  planCodes={planCodes}
                  onAddCourse={addCourse}
                  onRemoveCourse={removeCourse}
                  onRefresh={loadCourses}
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

export default App;
