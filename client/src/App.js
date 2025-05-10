import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
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

  // Check existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser(data.session.user);
    });
  }, []);

  // Fetch catalog from Supabase, and user plan
  useEffect(() => {
    if (!user) return;

    // 1) Course catalog
    supabase
      .from("courses")
      .select("*")
      .then(({ data, error }) => {
        if (error) console.error("Error fetching courses", error);
        else setCourses(data);
      });

    // 2) User plan
    supabase
      .from("user_courses")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) console.error("Error fetching plan", error);
        else setPlan(data);
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
            supabase
              .from("user_courses")
              .insert({ user_id: user.id, course_code: code, term })
              .then(({ data, error }) => {
                if (error) console.error(error);
                else setPlan((prev) => [...prev, data[0]]);
              });
          }}
        />
      </Box>

      <Box sx={{ p: 2 }}>
        <Planner
          plan={plan}
          coursesMap={courses.reduce((m, c) => {
            m[`${c.subjectCode} ${c.catalogNumber}`] = c;
            return m;
          }, {})}
          onRemoveCourse={(code) => {
            supabase
              .from("user_courses")
              .delete()
              .eq("user_id", user.id)
              .eq("course_code", code)
              .then(({ error }) => {
                if (error) console.error(error);
                else
                  setPlan((prev) =>
                    prev.filter((item) => item.course_code !== code)
                  );
              });
          }}
          onToggleComplete={(code) => {
            const current = plan.find((item) => item.course_code === code);
            if (!current) return;
            supabase
              .from("user_courses")
              .update({ completed: !current.completed })
              .eq("user_id", user.id)
              .eq("course_code", code)
              .then(({ data, error }) => {
                if (error) console.error(error);
                else
                  setPlan((prev) =>
                    prev.map((item) =>
                      item.course_code === code
                        ? { ...item, completed: data[0].completed }
                        : item
                    )
                  );
              });
          }}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
