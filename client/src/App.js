import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Avatar,
  Box,
  Container,
  Paper,
  Stack,
  Tooltip,
  Divider,
  Chip,
} from "@mui/material";
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Logout as LogoutIcon,
  LibraryBooks as LibraryBooksIcon,
  EventNote as EventNoteIcon,
} from "@mui/icons-material";

import { fetchCourses } from "./api/fetchCourses";
import CourseCatalog from "./components/CourseCatalog";
import Planner from "./components/Planner";
import Login from "./components/Login";
import defaultProgramPlan from "./data/comp_math_plan.json";

function App() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [plan, setPlan] = useState([]);
  const [view, setView] = useState("catalog");
  const [darkMode, setDarkMode] = useState(false);
  const [programPlan, setProgramPlan] = useState(() =>
    JSON.parse(JSON.stringify(defaultProgramPlan))
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? "dark" : "light",
          primary: {
            main: darkMode ? "#7dd3fc" : "#005bea",
          },
          secondary: {
            main: darkMode ? "#fda4af" : "#ff7a18",
          },
          background: {
            default: darkMode ? "#050b1a" : "#eff3ff",
            paper: darkMode ? "#0f172a" : "rgba(255, 255, 255, 0.86)",
          },
        },
        shape: {
          borderRadius: 16,
        },
        typography: {
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          h4: {
            fontWeight: 700,
            letterSpacing: "-0.02em",
          },
          h5: {
            fontWeight: 700,
            letterSpacing: "-0.015em",
          },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                transition: "box-shadow 0.3s ease, transform 0.3s ease",
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 999,
                textTransform: "none",
                fontWeight: 600,
                boxShadow: "none",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.14)",
                },
              },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 600,
                minHeight: 0,
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backdropFilter: "blur(18px)",
                backgroundImage: "none",
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

  useEffect(() => {
    if (!user) return;

    fetchCourses()
      .then(setCourses)
      .catch((err) => console.error("Error loading courses:", err));

    supabase
      .from("user_courses")
      .select("course_code, term, completed")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) console.error("Error loading plan:", error);
        else setPlan(data || []);
      });
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPlan([]);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const viewMeta = useMemo(
    () =>
      view === "catalog"
        ? {
            label: "Catalog",
            title: "Design a program that reflects your goals",
            description:
              "Browse the live course catalog, spotlight program requirements, and curate classes into your academic roadmap.",
          }
        : {
            label: "Planner",
            title: "Turn requirements into a term-by-term strategy",
            description:
              "Visualize progress, fine-tune term assignments, and surface the next required courses to keep your momentum.",
          },
    [view]
  );

  const addCourse = (code, term) => {
    supabase
      .from("user_courses")
      .insert({ user_id: user.id, course_code: code, term })
      .select()
      .then(({ data, error }) => {
        if (error) console.error("Add course error:", error);
        else setPlan((prev) => [...prev, data[0]]);
      });
  };

  const removeCourse = (code) => {
    supabase
      .from("user_courses")
      .delete()
      .eq("user_id", user.id)
      .eq("course_code", code)
      .then(({ error }) => {
        if (error) console.error("Remove course error:", error);
        else setPlan((prev) => prev.filter((p) => p.course_code !== code));
      });
  };

  const updateCourseTerm = (code, term) => {
    supabase
      .from("user_courses")
      .update({ term })
      .eq("user_id", user.id)
      .eq("course_code", code)
      .select()
      .then(({ data, error }) => {
        if (error) {
          console.error("Update term error:", error);
          return;
        }
        if (!data?.length) return;
        const updated = data[0];
        setPlan((prev) =>
          prev.map((entry) =>
            entry.course_code === code ? { ...entry, term: updated.term } : entry
          )
        );
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
        if (error) console.error("Toggle complete error:", error);
        else {
          setPlan((prev) =>
            prev.map((p) => (p.course_code === code ? data[0] : p))
          );
        }
      });
  };

  const displayName =
    user.user_metadata?.full_name ||
    user.email
      .split("@")[0]
      .split(".")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",
          background: (theme) =>
            theme.palette.mode === "light"
              ? "radial-gradient(circle at 15% 20%, rgba(0,91,234,0.18), transparent 55%), radial-gradient(circle at 80% 10%, rgba(255,122,24,0.2), transparent 45%), radial-gradient(circle at 50% 80%, rgba(17,94,89,0.12), transparent 50%)"
              : "radial-gradient(circle at 15% 20%, rgba(125,211,252,0.2), transparent 55%), radial-gradient(circle at 85% 15%, rgba(253,164,175,0.25), transparent 40%), radial-gradient(circle at 50% 80%, rgba(59,130,246,0.18), transparent 55%)",
          "&::before": {
            content: "''",
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(120deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 40%)",
            pointerEvents: "none",
            mixBlendMode: "overlay",
          },
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            background: (theme) =>
              theme.palette.mode === "light"
                ? "linear-gradient(110deg, rgba(5,27,90,0.92), rgba(0,91,234,0.88))"
                : "linear-gradient(110deg, rgba(2,6,23,0.92), rgba(17,94,89,0.75))",
            borderBottom: (theme) =>
              `1px solid ${
                theme.palette.mode === "light"
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(148, 163, 184, 0.18)"
              }`,
            backdropFilter: "blur(20px)",
          }}
        >
          <Toolbar sx={{ gap: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mr: "auto" }}>
              <Avatar
                src={`${process.env.PUBLIC_URL}/uwlogo.svg`}
                alt="UW Logo"
                sx={{ width: 40, height: 40, bgcolor: "transparent" }}
                variant="rounded"
              />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  UW Course Planner
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  Design a personalized academic path
                </Typography>
              </Box>
            </Stack>

            <Tabs
              value={view}
              onChange={(_, newValue) => setView(newValue)}
              textColor="inherit"
              TabIndicatorProps={{
                sx: {
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: "secondary.main",
                },
              }}
              sx={{
                minHeight: 0,
                "& .MuiTab-root": {
                  color: "rgba(255,255,255,0.72)",
                  minHeight: 0,
                  paddingX: 2.5,
                  paddingY: 1,
                },
                "& .Mui-selected": {
                  color: "#fff",
                },
              }}
            >
              <Tab
                value="catalog"
                icon={<LibraryBooksIcon fontSize="small" />}
                iconPosition="start"
                label="Catalog"
              />
              <Tab
                value="planner"
                icon={<EventNoteIcon fontSize="small" />}
                iconPosition="start"
                label="Planner"
              />
            </Tabs>

            <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.24)" }} />

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box textAlign="right">
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.92)" }}>
                  {displayName}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  Signed in
                </Typography>
              </Box>
              <Tooltip title="Sign out">
                <IconButton color="inherit" onClick={handleLogout}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
                <IconButton
                  color="inherit"
                  onClick={() => setDarkMode((d) => !d)}
                >
                  {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
          <Stack spacing={3}
            sx={{ position: "relative", zIndex: 1 }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 4 },
                borderRadius: 4,
                background: (theme) =>
                  theme.palette.mode === "light"
                    ? "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))"
                    : "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.6))",
                border: (theme) =>
                  `1px solid ${
                    theme.palette.mode === "light"
                      ? "rgba(148, 163, 184, 0.22)"
                      : "rgba(148, 163, 184, 0.24)"
                  }`,
              }}
            >
              <Stack spacing={1.5}>
                <Chip
                  color="secondary"
                  size="small"
                  label={viewMeta.label}
                  sx={{ alignSelf: "flex-start", fontWeight: 600 }}
                />
                <Typography variant="h4">{viewMeta.title}</Typography>
                <Typography variant="body1" color="text.secondary">
                  {viewMeta.description}
                </Typography>
              </Stack>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 4 },
                borderRadius: 4,
                backgroundColor: (theme) =>
                  theme.palette.mode === "light"
                    ? "rgba(255,255,255,0.92)"
                    : "rgba(15,23,42,0.9)",
                border: (theme) =>
                  `1px solid ${
                    theme.palette.mode === "light"
                      ? "rgba(148, 163, 184, 0.26)"
                      : "rgba(148, 163, 184, 0.24)"
                  }`,
                boxShadow: (theme) =>
                  theme.palette.mode === "light"
                    ? "0px 24px 48px rgba(15, 23, 42, 0.1)"
                    : "0px 24px 48px rgba(0, 0, 0, 0.55)",
              }}
            >
              {view === "catalog" ? (
                <CourseCatalog
                  courses={courses}
                  planCodes={planCodes}
                  onAddCourse={addCourse}
                  onRemoveCourse={removeCourse}
                  programPlan={programPlan}
                  onProgramPlanChange={setProgramPlan}
                  onProgramPlanReset={() =>
                    setProgramPlan(JSON.parse(JSON.stringify(defaultProgramPlan)))
                  }
                />
              ) : (
                <Planner
                  plan={plan}
                  coursesMap={coursesMap}
                  onRemoveCourse={removeCourse}
                  onToggleComplete={toggleComplete}
                  onUpdateCourseTerm={updateCourseTerm}
                  programPlan={programPlan}
                />
              )}
            </Paper>
          </Stack>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
