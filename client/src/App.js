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

  // Dark mode
  const [darkMode, setDarkMode] = useState(false);
  const theme = useMemo(
    () => createTheme({ palette: { mode: darkMode ? "dark" : "light" } }),
    [darkMode]
  );

  // On mount, check for existing session
  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser(data.session.user);
    });
  }, []);

  // Fetch data on login
  useEffect(() => {
    if (!user) return;
    // fetch courses.json or supabase data...
    fetch("/api/courses")
      .then((r) => r.json())
      .then(setCourses);
    // fetch user plan from supabase table 'user_courses' via supabase.from(...)
    supabase
      .from("user_courses")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => setPlan(data || []));
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPlan([]);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Course Planner
          </Typography>
          <Typography sx={{ mr: 2 }}>{user.email}</Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => setDarkMode((d) => !d)}>
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2 }}>
        <CourseCatalog
          courses={courses}
          planCodes={new Set(plan.map((c) => c.course_code))}
          onAddCourse={(code, term) => {
            // insert into supabase
            supabase
              .from("user_courses")
              .insert({ user_id: user.id, course_code: code, term })
              .then(() => setPlan((p) => [...p, { course_code: code, term }]));
          }}
        />
      </Box>
      <Box sx={{ p: 2 }}>
        <Planner plan={plan} /* ...rest props... */ />
      </Box>
    </ThemeProvider>
  );
}

export default App;
