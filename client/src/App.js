import React, { useState, useEffect, useMemo } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Button,
  Toolbar as Spacer,
} from "@mui/material";
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import CourseCatalog from "./components/CourseCatalog";
import Planner from "./components/Planner";
import Login from "./components/Login";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import uwLogo from "./images/uwlogo.svg";

function App() {
  // Application state
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [plan, setPlan] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [page, setPage] = useState("catalog"); // 'catalog' or 'planner'

  // Map for quick course lookups
  const coursesMap = useMemo(() => {
    const map = {};
    courses.forEach((c) => {
      map[c.subjectCode + c.catalogNumber] = c;
    });
    return map;
  }, [courses]);

  // Fetch courses and user plan on login
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        // Courses (public)
        const res1 = await fetch("/api/courses");
        const courseList = await res1.json();
        setCourses(courseList);

        // User plan (protected)
        const token = await user.getIdToken();
        const res2 = await fetch("/api/plan", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { plan: userPlan } = await res2.json();
        setPlan(userPlan);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [user]);

  // Login handler
  const handleLogin = (firebaseUser) => {
    setUser(firebaseUser);
    setPage("catalog");
  };

  // Logout handler
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setCourses([]);
    setPlan([]);
  };

  // Add a course to plan
  const addCourse = async (code, term) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch("/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courseCode: code, term, completed: false }),
      });
      setPlan((prev) => [...prev, { code, term, completed: false }]);
    } catch (err) {
      console.error(err);
    }
  };

  // Remove a course from plan
  const removeCourse = async (code) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch(`/api/plan/${code}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlan((prev) => prev.filter((item) => item.code !== code));
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle course completion
  const toggleComplete = async (code) => {
    if (!user) return;
    const item = plan.find((p) => p.code === code);
    if (!item) return;
    const updated = !item.completed;
    try {
      const token = await user.getIdToken();
      await fetch(`/api/plan/${code}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ completed: updated }),
      });
      setPlan((prev) =>
        prev.map((p) => (p.code === code ? { ...p, completed: updated } : p))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: { mode: darkMode ? "dark" : "light" },
      }),
    [darkMode]
  );

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <AppBar position="fixed">
        <Toolbar>
          {/* UW Logo */}
          <Box
            component="img"
            src={uwLogo}
            alt="University of Waterloo"
            sx={{ height: 48, width: "auto", mr: 2 }}
          />

          {/* Navigation Buttons */}
          <Box sx={{ ml: 1, display: "flex", gap: 2 }}>
            {["catalog", "planner"].map((view) => {
              const label = view === "catalog" ? "Course Catalog" : "Planner";
              const isActive = page === view;
              return (
                <Button
                  key={view}
                  color="inherit"
                  variant="text"
                  onClick={() => setPage(view)}
                  sx={{
                    minWidth: 140,
                    border: "1px solid",
                    borderColor: isActive
                      ? "rgba(255,255,255,0.7)"
                      : "transparent",
                    borderRadius: 1,
                    textTransform: "none",
                  }}
                >
                  {label}
                </Button>
              );
            })}
          </Box>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* User Greeting */}
          <Typography variant="body1" sx={{ mr: 2 }}>
            Hello, {user.displayName}
          </Typography>

          {/* Logout & Dark Mode */}
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
          <IconButton color="inherit" onClick={toggleDarkMode}>
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Push content below AppBar */}
      <Spacer />

      {/* Main content */}
      <Box sx={{ p: 3 }}>
        {page === "catalog" ? (
          <CourseCatalog
            courses={courses}
            planCodes={new Set(plan.map((p) => p.code))}
            onAddCourse={addCourse}
          />
        ) : (
          <Planner
            plan={plan}
            coursesMap={coursesMap}
            onRemoveCourse={removeCourse}
            onToggleComplete={toggleComplete}
          />
        )}
      </Box>
    </ThemeProvider>
  );
}

export default App;
