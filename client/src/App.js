import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box
} from '@mui/material';
import {
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import CourseCatalog from './components/CourseCatalog';
import Planner from './components/Planner';
import Login from './components/Login';

function App() {
  // Authentication state
  const [user, setUser] = useState(null);

  // Data: all courses from Supabase, and the user's plan
  const [courses, setCourses] = useState([]);
  const [plan, setPlan] = useState([]);

  // Current view: 'catalog' or 'planner'
  const [view, setView] = useState('catalog');

  // Dark mode toggle
  const [darkMode, setDarkMode] = useState(false);
  const theme = useMemo(
    () => createTheme({ palette: { mode: darkMode ? 'dark' : 'light' } }),
    [darkMode]
  );

  // On mount, check for an existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user);
      }
    });
  }, []);

  // After login, fetch courses and the user's plan
  useEffect(() => {
    if (!user) return;

    // Fetch all courses
    supabase
      .from('courses')
      .select('*')
      .then(({ data, error }) => {
        if (error) console.error('Error fetching courses:', error);
        else setCourses(data);
      });

    // Fetch the user's saved plan
    supabase
      .from('user_courses')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) console.error('Error fetching plan:', error);
        else setPlan(data || []);
      });
  }, [user]);

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPlan([]);
  };

  // If not logged in, show the Login screen
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  // Build a Set of codes in the plan for quick lookup
  const planCodes = new Set(plan.map(c => c.course_code));

  // Handler to add a course to the plan
  const addCourse = (code, term) => {
    supabase
      .from('user_courses')
      .insert({ user_id: user.id, course_code: code, term })
      .then(({ data, error }) => {
        if (error) {
          console.error('Error adding course:', error);
        } else {
          setPlan(prev => [...prev, data[0]]);
        }
      });
  };

  // Handler to remove a course
  const removeCourse = code => {
    supabase
      .from('user_courses')
      .delete()
      .eq('user_id', user.id)
      .eq('course_code', code)
      .then(({ error }) => {
        if (error) console.error('Error removing course:', error);
        else setPlan(prev => prev.filter(item => item.course_code !== code));
      });
  };

  // Handler to toggle completion flag
  const toggleComplete = code => {
    const entry = plan.find(item => item.course_code === code);
    if (!entry) return;
    supabase
      .from('user_courses')
      .update({ completed: !entry.completed })
      .eq('user_id', user.id)
      .eq('course_code', code)
      .then(({ data, error }) => {
        if (error) console.error('Error toggling complete:', error);
        else {
          const updated = data[0];
          setPlan(prev =>
            prev.map(item =>
              item.course_code === code ? updated : item
            )
          );
        }
      });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* AppBar / NavBar */}
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Waterloo Course Planner
          </Typography>

          {/* View Switch Buttons */}
          <Button
            color={view === 'catalog' ? 'secondary' : 'inherit'}
            onClick={() => setView('catalog')}
          >
            Course Catalog
          </Button>
          <Button
            color={view === 'planner' ? 'secondary' : 'inherit'}
            onClick={() => setView('planner')}
            sx={{ ml: 1 }}
          >
            Planner
          </Button>

          {/* User Info & Actions */}
          <Typography sx={{ ml: 3, mr: 1 }}>
            {user.email}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
          <IconButton color="inherit" onClick={() => setDarkMode(d => !d)}>
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ p: 2 }}>
        {view === 'catalog' ? (
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
