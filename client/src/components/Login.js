import React, { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider
} from '@mui/material';
import {
  Google as GoogleIcon,
  GitHub as GitHubIcon
} from '@mui/icons-material';

export default function Login({ onLogin }) {
  // Disable page scroll while mounted
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Subscribe to auth state
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) onLogin(session.user);
    });
    return () => sub.unsubscribe();
  }, [onLogin]);

  const handleLogin = provider => {
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    });
  };

  const bgUrl = `${process.env.PUBLIC_URL}/login-bg.jpg`;

  return (
    <>
      {/* Fixed full-screen background */}
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: -1
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Paper
          elevation={6}
          sx={{
            width: 360,
            height: 360,
            bgcolor: 'rgba(255,255,255,0.9)',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            textAlign: 'center',
            borderRadius: 2,
            justifyContent: 'center'
          }}
        >
          <Typography variant="h5" gutterBottom>
            Waterloo Course Planner
          </Typography>
          <Typography variant="body1" gutterBottom>
            Sign in to continue
          </Typography>

          <Button
            fullWidth
            variant="contained"
            startIcon={<GoogleIcon />}
            sx={{ mt: 1 }}
            onClick={() => handleLogin('google')}
          >
            Sign in with Google
          </Button>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<GitHubIcon />}
            sx={{ mt: 1 }}
            onClick={() => handleLogin('github')}
          >
            Sign in with GitHub
          </Button>

          <Divider sx={{ width: '100%', my: 2 }}>or</Divider>

          <Typography variant="caption" color="text.secondary">
            Use your Google or GitHub account to log in.
          </Typography>
        </Paper>
      </Box>
    </>
  );
}