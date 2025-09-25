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
  Avatar,
  Box,
  Container,
  Paper,
  Stack,
  Fade,
  LinearProgress,
  Alert,
  Tooltip,
  Divider,
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
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
    px: 2.5,
    py: 1.1,
    borderRadius: 999,
    fontWeight: view === viewName ? 700 : 500,
    transition: "all 0.25s ease",
    color: (theme) =>
      view === viewName
        ? theme.palette.primary.main
        : alpha(theme.palette.text.primary, 0.78),
    bgcolor: (theme) =>
      view === viewName
        ? alpha(theme.palette.primary.main, darkMode ? 0.22 : 0.15)
        : alpha(theme.palette.text.primary, darkMode ? 0.16 : 0.08),
    border: (theme) =>
      `1px solid ${alpha(
        theme.palette.primary.main,
        view === viewName ? 0.55 : 0.25
      )}`,
    boxShadow:
      view === viewName
        ? `0 12px 26px ${alpha(
            theme.palette.primary.main,
            darkMode ? 0.45 : 0.25
          )}`
        : `inset 0 0 0 1px ${alpha(
            theme.palette.text.primary,
            darkMode ? 0.12 : 0.08
          )}`,
    backdropFilter: "blur(6px)",
    "&:hover": {
      bgcolor: (theme) =>
        view === viewName
          ? alpha(theme.palette.primary.main, darkMode ? 0.28 : 0.2)
          : alpha(theme.palette.text.primary, darkMode ? 0.24 : 0.14),
      boxShadow:
        view === viewName
          ? `0 14px 32px ${alpha(
              theme.palette.primary.main,
              darkMode ? 0.5 : 0.32
            )}`
          : `inset 0 0 0 1px ${alpha(
              theme.palette.text.primary,
              darkMode ? 0.2 : 0.12
            )}`,
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          minHeight: "100vh",
          background: (theme) =>
            darkMode
              ? `radial-gradient(circle at -10% 0%, ${alpha(
                  theme.palette.primary.light,
                  0.4
                )} 0%, transparent 55%), radial-gradient(circle at 120% 15%, ${alpha(
                  theme.palette.secondary.dark,
                  0.35
                )} 0%, transparent 62%), ${theme.palette.background.default}`
              : `radial-gradient(circle at -5% -5%, ${alpha(
                  theme.palette.primary.main,
                  0.3
                )} 0%, transparent 55%), radial-gradient(circle at 110% 20%, ${alpha(
                  theme.palette.secondary.light,
                  0.38
                )} 0%, transparent 65%), ${theme.palette.background.default}`,
          "&::before": {
            content: '""',
            position: "absolute",
            inset: "-30%", 
            background: (theme) =>
              `radial-gradient(60% 60% at 30% 30%, ${alpha(
                theme.palette.primary.main,
                darkMode ? 0.18 : 0.22
              )} 0%, transparent 70%)`,
            filter: "blur(80px)",
            opacity: darkMode ? 0.8 : 0.6,
          },
          "&::after": {
            content: '""',
            position: "absolute",
            inset: "-20%",
            background: (theme) =>
              `radial-gradient(55% 55% at 70% 70%, ${alpha(
                theme.palette.secondary.main,
                darkMode ? 0.22 : 0.28
              )} 0%, transparent 75%)`,
            filter: "blur(90px)",
            opacity: darkMode ? 0.65 : 0.55,
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <AppBar
            position="sticky"
            elevation={0}
            color="transparent"
            sx={{
              backdropFilter: "blur(14px)",
              backgroundColor: (theme) =>
                alpha(theme.palette.background.paper, darkMode ? 0.92 : 0.96),
              border: (theme) =>
                `1px solid ${alpha(theme.palette.divider, darkMode ? 0.6 : 0.3)}`,
              boxShadow: (theme) =>
                `0 18px 40px ${alpha(
                  theme.palette.common.black,
                  darkMode ? 0.45 : 0.12
                )}`,
              mx: { xs: 0, md: 3 },
              mt: { xs: 0, md: 3 },
              borderRadius: { xs: 0, md: 28 },
              color: (theme) => theme.palette.text.primary,
            }}
          >
            <Toolbar disableGutters sx={{ minHeight: 72 }}>
            <Container
              maxWidth="xl"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                px: { xs: 2, sm: 3, md: 4 },
              }}
            >
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
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    px: { xs: 0.75, md: 1 },
                    py: { xs: 0.6, md: 0.7 },
                    borderRadius: 999,
                    position: "relative",
                    backdropFilter: "blur(14px)",
                    background: (theme) =>
                      `linear-gradient(130deg, ${alpha(
                        theme.palette.background.paper,
                        darkMode ? 0.35 : 0.75
                      )}, ${alpha(theme.palette.background.paper, darkMode ? 0.18 : 0.55)})`,
                    border: (theme) =>
                      `1px solid ${alpha(
                        theme.palette.divider,
                        darkMode ? 0.55 : 0.32
                      )}`,
                    boxShadow: (theme) =>
                      `0 18px 34px ${alpha(
                        theme.palette.common.black,
                        darkMode ? 0.45 : 0.15
                      )}`,
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      inset: 0,
                      borderRadius: "inherit",
                      background: (theme) =>
                        `linear-gradient(120deg, ${alpha(
                          theme.palette.primary.main,
                          darkMode ? 0.22 : 0.18
                        )} 0%, transparent 55%, ${alpha(
                          theme.palette.secondary.main,
                          darkMode ? 0.18 : 0.16
                        )} 100%)`,
                      opacity: 0.4,
                      pointerEvents: "none",
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ position: "relative" }}>
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
                </Box>
              </Stack>
              <Box
                sx={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 0.75, sm: 1 },
                  px: { xs: 1, sm: 1.75 },
                  py: { xs: 0.85, sm: 0.9 },
                  borderRadius: 999,
                  backdropFilter: "blur(16px)",
                  background: (theme) =>
                    `linear-gradient(135deg, ${alpha(
                      theme.palette.primary.main,
                      darkMode ? 0.4 : 0.55
                    )} 0%, ${alpha(
                      theme.palette.secondary.main,
                      darkMode ? 0.32 : 0.42
                    )} 100%)`,
                  border: (theme) =>
                    `1px solid ${alpha(
                      theme.palette.common.white,
                      darkMode ? 0.24 : 0.4
                    )}`,
                  boxShadow: (theme) =>
                    `0 24px 46px ${alpha(
                      theme.palette.primary.main,
                      darkMode ? 0.45 : 0.3
                    )}`,
                  color: (theme) =>
                    theme.palette.getContrastText(theme.palette.primary.main),
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    background: (theme) =>
                      `radial-gradient(80% 120% at 20% 10%, ${alpha(
                        theme.palette.common.white,
                        0.22
                      )} 0%, transparent 60%)`,
                    opacity: 0.85,
                    pointerEvents: "none",
                  },
                }}
              >
                <Stack spacing={0.2} sx={{ textAlign: "right", position: "relative" }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, lineHeight: 1.2 }}
                    color="inherit"
                  >
                    {displayName}
                  </Typography>
                  <Typography variant="caption" color="inherit" sx={{ opacity: 0.85 }}>
                    Signed in
                  </Typography>
                </Stack>
                <Avatar
                  alt={displayName}
                  sx={{
                    bgcolor: alpha("#000", 0.2),
                    color: "inherit",
                    fontWeight: 600,
                    position: "relative",
                  }}
                >
                  {initials}
                </Avatar>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{
                    borderColor: alpha("#fff", 0.35),
                    mx: { xs: 0.5, sm: 0.75 },
                  }}
                />
                <Tooltip title="Sign out">
                  <span>
                    <IconButton
                      onClick={handleLogout}
                      sx={{
                        color: "inherit",
                        bgcolor: alpha("#000", 0.18),
                        "&:hover": {
                          bgcolor: alpha("#000", 0.28),
                        },
                      }}
                    >
                      <LogoutIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
                  <IconButton
                    onClick={() => setDarkMode((d) => !d)}
                    sx={{
                      color: "inherit",
                      bgcolor: alpha("#000", 0.18),
                      "&:hover": {
                        bgcolor: alpha("#000", 0.28),
                      },
                    }}
                  >
                    {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Container>
          </Toolbar>
        </AppBar>

        <Container
          component="main"
          maxWidth="xl"
          sx={{
            py: { xs: 4, md: 6 },
            flex: "1 1 auto",
            display: "flex",
            width: "100%",
            px: { xs: 2, sm: 3, md: 4 },
          }}
        >
          <Paper
            elevation={0}
            sx={{
              position: "relative",
              overflow: "hidden",
              p: { xs: 3, md: 5 },
              flex: 1,
              borderRadius: 4,
              backdropFilter: "blur(28px)",
              background: (theme) =>
                `linear-gradient(140deg, ${alpha(
                  theme.palette.background.paper,
                  darkMode ? 0.16 : 0.88
                )}, ${alpha(theme.palette.background.paper, darkMode ? 0.06 : 0.72)})`,
              border: (theme) =>
                `1px solid ${alpha(theme.palette.divider, darkMode ? 0.5 : 0.32)}`,
              boxShadow: (theme) =>
                `0 35px 90px ${alpha(
                  theme.palette.common.black,
                  darkMode ? 0.35 : 0.12
                )}`,
              display: "flex",
              flexDirection: "column",
              gap: 3,
              maxWidth: 1280,
              mx: "auto",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: -1,
                borderRadius: "inherit",
                background: (theme) =>
                  `radial-gradient(80% 80% at 20% 20%, ${alpha(
                    theme.palette.primary.main,
                    darkMode ? 0.16 : 0.18
                  )} 0%, transparent 65%)`,
                opacity: darkMode ? 0.75 : 0.55,
                filter: "blur(60px)",
              },
              "&::after": {
                content: '""',
                position: "absolute",
                inset: 0,
                borderRadius: "inherit",
                background: (theme) =>
                  `linear-gradient(160deg, transparent 0%, ${alpha(
                    theme.palette.common.white,
                    darkMode ? 0.05 : 0.18
                  )} 45%, transparent 100%)`,
                pointerEvents: "none",
              },
            }}
          >
            <Fade in={loadingCourses || loadingPlan} unmountOnExit>
              <LinearProgress
                color="primary"
                sx={{
                  borderRadius: 999,
                }}
              />
            </Fade>
            <Stack spacing={1}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {activeView.title}
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ maxWidth: 720 }}
              >
                {activeView.description}
              </Typography>
            </Stack>
            {(catalogError || planError) && (
              <Stack spacing={2}>
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
            <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
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
            </Box>
          </Paper>
        </Container>
      </Box>
    </Box>
    </ThemeProvider>
  );
}

export default App;
