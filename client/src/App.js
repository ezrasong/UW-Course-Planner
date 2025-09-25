import React, { useState, useEffect, useMemo } from "react";
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
  Paper,
  Stack,
  Fade,
  LinearProgress,
  Alert,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";

import { fetchCourses } from "./api/fetchCourses";
import CourseCatalog from "./components/CourseCatalog";
import Planner from "./components/Planner";
import Login from "./components/Login";
import InfoHub from "./components/InfoHub";

function App() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [plan, setPlan] = useState([]);
  const [view, setView] = useState("catalog");
  const [darkMode, setDarkMode] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [catalogError, setCatalogError] = useState(null);
  const [planError, setPlanError] = useState(null);

  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode: darkMode ? "dark" : "light" },
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

  useEffect(() => {
    if (!user) return;

    setLoadingCourses(true);
    setCatalogError(null);
    fetchCourses()
      .then((fetched) => {
        setCourses(fetched);
      })
      .catch((err) => {
        console.error("Error loading courses:", err);
        setCatalogError(
          "We ran into a problem loading the catalog. Please try again in a moment."
        );
      })
      .finally(() => setLoadingCourses(false));

    setPlanError(null);
    setLoadingPlan(true);

    supabase
      .from("user_courses")
      .select("course_code, term, completed")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) {
          console.error("Error loading plan:", error);
          setPlanError(
            "Your saved plan could not be retrieved. Refresh or try again shortly."
          );
        } else {
          setPlanError(null);
          setPlan(data || []);
        }
      })
      .finally(() => setLoadingPlan(false));
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPlan([]);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const addCourse = (code, term) => {
    setLoadingPlan(true);
    supabase
      .from("user_courses")
      .insert({ user_id: user.id, course_code: code, term })
      .select()
      .then(({ data, error }) => {
        if (error) console.error("Add course error:", error);
        else {
          setPlanError(null);
          setPlan((prev) => [...prev, data[0]]);
        }
      })
      .finally(() => setLoadingPlan(false));
  };

  const removeCourse = (code) => {
    setLoadingPlan(true);
    supabase
      .from("user_courses")
      .delete()
      .eq("user_id", user.id)
      .eq("course_code", code)
      .then(({ error }) => {
        if (error) console.error("Remove course error:", error);
        else {
          setPlanError(null);
          setPlan((prev) => prev.filter((p) => p.course_code !== code));
        }
      })
      .finally(() => setLoadingPlan(false));
  };

  const toggleComplete = (code) => {
    const entry = plan.find((p) => p.course_code === code);
    if (!entry) return;
    setLoadingPlan(true);
    supabase
      .from("user_courses")
      .update({ completed: !entry.completed })
      .eq("user_id", user.id)
      .eq("course_code", code)
      .select()
      .then(({ data, error }) => {
        if (error) console.error("Toggle complete error:", error);
        else {
          setPlanError(null);
          setPlan((prev) =>
            prev.map((p) => (p.course_code === code ? data[0] : p))
          );
        }
      })
      .finally(() => setLoadingPlan(false));
  };

  const displayName =
    user.user_metadata?.full_name ||
    user.email
      .split("@")[0]
      .split(".")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");
  const viewMeta = {
    catalog: {
      title: "Explore the catalog",
      description:
        "Filter the university catalog, inspect prerequisites, and add courses straight into your personalized plan.",
    },
    planner: {
      title: "Plan with clarity",
      description:
        "Track completion status term-by-term, balance workloads, and keep your graduation checklist within reach.",
    },
    guides: {
      title: "Master the workflow",
      description:
        "Understand JSON plan formatting, data expectations, and process tips so custom requirement files feel production-ready.",
    },
  };

  const activeView = viewMeta[view] ?? viewMeta.catalog;

  const tabSx = (viewName) => ({
    textTransform: "none",
    whiteSpace: "nowrap",
    px: 2,
    color: view === viewName ? "primary.main" : "common.white",
    bgcolor: view === viewName ? "common.white" : "transparent",
    borderRadius: 1,
    fontWeight: view === viewName ? "bold" : "normal",
    "&:hover": {
      bgcolor: view === viewName ? "common.white" : "rgba(255,255,255,0.2)",
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background: (theme) =>
            darkMode
              ? `radial-gradient(circle at 10% 20%, ${alpha(
                  theme.palette.primary.dark,
                  0.35
                )} 0%, transparent 55%), radial-gradient(circle at 90% 0%, ${alpha(
                  theme.palette.secondary.dark,
                  0.3
                )} 0%, transparent 60%), ${theme.palette.background.default}`
              : `radial-gradient(circle at 0% 0%, ${alpha(
                  theme.palette.primary.light,
                  0.4
                )} 0%, transparent 55%), radial-gradient(circle at 100% 10%, ${alpha(
                  theme.palette.secondary.light,
                  0.35
                )} 0%, transparent 60%), ${theme.palette.background.default}`,
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backdropFilter: "blur(12px)",
            backgroundColor: (theme) =>
              alpha(theme.palette.background.paper, darkMode ? 0.08 : 0.7),
            borderBottom: (theme) =>
              `1px solid ${alpha(theme.palette.divider, darkMode ? 0.4 : 0.3)}`,
          }}
        >
          <Toolbar sx={{ gap: 2 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={3}
              sx={{ mr: "auto" }}
            >
              <Box
                component="img"
                src={`${process.env.PUBLIC_URL}/uwlogo.svg`}
                alt="UW Logo"
                sx={{ height: 42 }}
              />
              <Stack direction="row" spacing={1.5}>
                <Button
                  sx={{ ...tabSx("catalog"), minWidth: 150 }}
                  onClick={() => setView("catalog")}
                >
                  Course Catalog
                </Button>
                <Button
                  sx={{ ...tabSx("planner"), minWidth: 120 }}
                  onClick={() => setView("planner")}
                >
                  Planner
                </Button>
                <Button
                  sx={{ ...tabSx("guides"), minWidth: 150 }}
                  onClick={() => setView("guides")}
                >
                  Resource Hub
                </Button>
              </Stack>
            </Stack>
            <Typography sx={{ color: "text.primary", fontWeight: 500 }}>
              Hello, {displayName}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
            <IconButton
              color="inherit"
              onClick={() => setDarkMode((d) => !d)}
              sx={{ ml: 1 }}
            >
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Toolbar>
        </AppBar>

        <Container
          maxWidth="xl"
          sx={{ py: { xs: 3, md: 5 }, minHeight: "calc(100vh - 64px)" }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              minHeight: "70vh",
              borderRadius: 4,
              backdropFilter: "blur(18px)",
              backgroundColor: (theme) =>
                alpha(theme.palette.background.paper, darkMode ? 0.25 : 0.85),
              border: (theme) =>
                `1px solid ${alpha(theme.palette.divider, darkMode ? 0.4 : 0.3)}`,
              boxShadow: (theme) =>
                `0 25px 60px ${alpha(
                  theme.palette.common.black,
                  darkMode ? 0.25 : 0.08
                )}`,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Fade in={loadingCourses || loadingPlan} unmountOnExit>
              <LinearProgress
                color="primary"
                sx={{
                  borderRadius: 999,
                  mb: 3,
                }}
              />
            </Fade>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {activeView.title}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {activeView.description}
              </Typography>
            </Stack>
            {(catalogError || planError) && (
              <Stack spacing={2} sx={{ mb: 3 }}>
                {catalogError && (
                  <Alert severity="error" onClose={() => setCatalogError(null)}>
                    {catalogError}
                  </Alert>
                )}
                {planError && (
                  <Alert severity="warning" onClose={() => setPlanError(null)}>
                    {planError}
                  </Alert>
                )}
              </Stack>
            )}
            {view === "catalog" ? (
              <CourseCatalog
                courses={courses}
                planCodes={planCodes}
                onAddCourse={addCourse}
                onRemoveCourse={removeCourse}
                loading={loadingCourses}
              />
            ) : view === "planner" ? (
              <Planner
                plan={plan}
                coursesMap={coursesMap}
                onRemoveCourse={removeCourse}
                onToggleComplete={toggleComplete}
                loading={loadingPlan}
              />
            ) : (
              <InfoHub />
            )}
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
