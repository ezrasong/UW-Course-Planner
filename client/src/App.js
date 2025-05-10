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
} from "@mui/material";
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import CourseCatalog from "./components/CourseCatalog";
import Planner from "./components/Planner";
import Login from "./components/Login";

function App() {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [plan, setPlan] = useState([]);
  const [view, setView] = useState("catalog");
  const [darkMode, setDarkMode] = useState(false);

  const theme = useMemo(
    () => createTheme({ palette: { mode: darkMode ? "dark" : "light" } }),
    [darkMode]
  );

  // 1) Check existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser(data.session.user);
    });
  }, []);

  // 2) After login, fetch courses and plan
  useEffect(() => {
    if (!user) return;

    supabase
      .from("courses")
      .select("*")
      .then(({ data, error }) => {
        if (error) console.error("Fetch courses error:", error);
        else setCourses(data);
      });

    supabase
      .from("user_courses")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) console.error("Fetch plan error:", error);
        else setPlan(data || []);
      });
  }, [user]);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPlan([]);
  };

  // If not logged in, show login screen
  if (!user) return <Login onLogin={setUser} />;

  // Helper set of course codes in plan
  const planCodes = new Set(plan.map((c) => c.course_code));

  // Add a course
  const addCourse = (code, term) => {
    supabase
      .from("user_courses")
      .insert({ user_id: user.id, course_code: code, term })
      .then(({ data, error }) => {
        if (error) console.error("Add course error:", error);
        else setPlan((prev) => [...prev, data[0]]);
      });
  };

  // Remove a course
  const removeCourse = (code) => {
    supabase
      .from("user_courses")
      .delete()
      .eq("user_id", user.id)
      .eq("course_code", code)
      .then(({ error }) => {
        if (error) console.error("Remove course error:", error);
        else
          setPlan((prev) => prev.filter((item) => item.course_code !== code));
      });
  };

  // Toggle complete flag
  const toggleComplete = (code) => {
    const entry = plan.find((item) => item.course_code === code);
    if (!entry) return;
    supabase
      .from("user_courses")
      .update({ completed: !entry.completed })
      .eq("user_id", user.id)
      .eq("course_code", code)
      .then(({ data, error }) => {
        if (error) console.error("Toggle complete error:", error);
        else
          setPlan((prev) =>
            prev.map((item) => (item.course_code === code ? data[0] : item))
          );
      });
  };

  // Display name
  const displayName =
    user.user_metadata?.full_name ||
    user.email
      .split("@")[0]
      .split(".")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");

  const tabSx = (viewName) => ({
    textTransform: "none",
    mr: 2,
    px: 2,
    color: view === viewName ? "primary.main" : "common.white",
    bgcolor: view === viewName ? "common.white" : "transparent",
    borderRadius: 1,
    fontWeight: view === viewName ? "bold" : "normal",
    "&:hover": {
      bgcolor: view === viewName ? "white" : "rgba(255,255,255,0.2)",
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <AppBar position="sticky">
        <Toolbar>
          <Box
            component="img"
            src={`${process.env.PUBLIC_URL}/uwlogo.svg`}
            alt="UW Logo"
            sx={{ height: 32, mr: 1 }}
          />

          {/* Tabs */}
          <Button sx={tabSx("catalog")} onClick={() => setView("catalog")}>
            Course Catalog
          </Button>
          <Button sx={tabSx("planner")} onClick={() => setView("planner")}>
            Planner
          </Button>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* User greeting */}
          <Typography sx={{ color: "common.white", mr: 1 }}>
            Hello, {displayName}
          </Typography>

          {/* Logout */}
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>

          {/* Dark mode toggle */}
          <IconButton
            color="inherit"
            onClick={() => setDarkMode((d) => !d)}
            sx={{ ml: 1 }}
          >
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Page content */}
      <Box sx={{ p: 2, height: "calc(100vh - 64px)", overflow: "auto" }}>
        {view === "catalog" ? (
          <CourseCatalog
            courses={courses}
            planCodes={planCodes}
            onAddCourse={addCourse}
          />
        ) : (
          <Planner
            plan={plan}
            coursesMap={courses.reduce((m, c) => {
              m[`${c.subjectCode} ${c.catalogNumber}`] = c;
              return m;
            }, {})}
            onRemoveCourse={removeCourse}
            onToggleComplete={toggleComplete}
          />
        )}
      </Box>
    </ThemeProvider>
  );
}