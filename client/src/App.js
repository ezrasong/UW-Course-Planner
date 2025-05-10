// client/src/App.js
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
  // Auth & data state
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [plan, setPlan] = useState([]);

  // Which view to show: 'catalog' or 'planner'
  const [view, setView] = useState("catalog");

  // Dark mode
  const [darkMode, setDarkMode] = useState(false);
  const theme = useMemo(
    () => createTheme({ palette: { mode: darkMode ? "dark" : "light" } }),
    [darkMode]
  );

  // 1) Check existing Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user);
      }
    });
  }, []);

  // 2) After login, fetch catalog & plan
  useEffect(() => {
    if (!user) return;

    // Fetch all courses
    supabase
      .from("courses")
      .select("*")
      .then(({ data, error }) => {
        if (error) console.error("Fetch courses error:", error);
        else setCourses(data);
      });

    // Fetch user’s plan
    supabase
      .from("user_courses")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) console.error("Fetch plan error:", error);
        else setPlan(data);
      });
  }, [user]);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPlan([]);
  };

  // If not logged in, show the login page
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Helper: set of codes in the plan
  const planCodes = new Set(plan.map((c) => c.course_code));

  // Add a course
  const addCourse = (code, term) => {
    supabase
      .from("user_courses")
      .insert({ user_id: user.id, course_code: code, term })
      .then(({ data, error }) => {
        if (error) console.error(error);
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
        if (error) console.error(error);
        else
          setPlan((prev) => prev.filter((item) => item.course_code !== code));
      });
  };

  // Toggle completion
  const toggleComplete = (code) => {
    const entry = plan.find((item) => item.course_code === code);
    if (!entry) return;
    supabase
      .from("user_courses")
      .update({ completed: !entry.completed })
      .eq("user_id", user.id)
      .eq("course_code", code)
      .then(({ data, error }) => {
        if (error) console.error(error);
        else {
          setPlan((prev) =>
            prev.map((item) => (item.course_code === code ? data[0] : item))
          );
        }
      });
  };

  // Derive a display name: use full_name metadata or fallback to email prefix
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

      {/* AppBar */}
      <AppBar position="sticky">
        <Toolbar>
          {/* UW Crest */}
          <Box
            component="img"
            src={`${process.env.PUBLIC_URL}/uwlogo.svg`}
            alt="UW Logo"
            sx={{ height: 32, mr: 2 }}
          />

          {/* Title (optional, you can hide if too long) */}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {/* empty flexGrow to push tabs right */}
          </Typography>

          {/* Course Catalog Tab */}
          <Button
            onClick={() => setView("catalog")}
            sx={{
              mr: 1,
              textTransform: "none",
              ...(view === "catalog"
                ? {
                    bgcolor: "common.white",
                    color: "primary.main",
                    "&:hover": { bgcolor: "grey.100" },
                  }
                : { color: "common.white" }),
            }}
          >
            Course Catalog
          </Button>

          {/* Planner Tab */}
          <Button
            onClick={() => setView("planner")}
            sx={{
              mr: 3,
              textTransform: "none",
              ...(view === "planner"
                ? {
                    bgcolor: "common.white",
                    color: "primary.main",
                    "&:hover": { bgcolor: "grey.100" },
                  }
                : { color: "common.white" }),
            }}
          >
            Planner
          </Button>

          {/* Greeting */}
          <Typography sx={{ color: "common.white", mr: 2 }}>
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

      {/* Main content */}
      <Box sx={{ p: 2 }}>
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

export default App;
