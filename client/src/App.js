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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser(data.session.user);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("courses")
      .select("*")
      .then(({ data, error }) => {
        if (!error) setCourses(data);
      });
    supabase
      .from("user_courses")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (!error) setPlan(data || []);
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

  const planCodes = new Set(plan.map((c) => c.course_code));

  const addCourse = (code, term) => {
    supabase
      .from("user_courses")
      .insert({ user_id: user.id, course_code: code, term })
      .then(({ data, error }) => {
        if (!error) setPlan((prev) => [...prev, data[0]]);
      });
  };

  const removeCourse = (code) => {
    supabase
      .from("user_courses")
      .delete()
      .eq("user_id", user.id)
      .eq("course_code", code)
      .then(({ error }) => {
        if (!error)
          setPlan((prev) => prev.filter((item) => item.course_code !== code));
      });
  };

  const toggleComplete = (code) => {
    const entry = plan.find((item) => item.course_code === code);
    if (!entry) return;
    supabase
      .from("user_courses")
      .update({ completed: !entry.completed })
      .eq("user_id", user.id)
      .eq("course_code", code)
      .then(({ data, error }) => {
        if (!error) {
          setPlan((prev) =>
            prev.map((item) => (item.course_code === code ? data[0] : item))
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

  const tabSx = (viewName) => ({
    textTransform: "none",
    mr: 2,
    width: "140px",
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
      <AppBar position="sticky">
        <Toolbar>
          <Box
            component="img"
            src={`${process.env.PUBLIC_URL}/uwlogo.svg`}
            alt="UW Logo"
            sx={{ height: 32, mr: 1 }}
          />
          <Button sx={tabSx("catalog")} onClick={() => setView("catalog")}>
            Course Catalog
          </Button>
          <Button sx={tabSx("planner")} onClick={() => setView("planner")}>
            Planner
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Typography sx={{ color: "common.white", mr: 1 }}>
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

export default App;