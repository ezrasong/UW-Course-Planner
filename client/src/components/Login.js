import React, { useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider
} from '@mui/material';
import {
  Google as GoogleIcon,
  GitHub as GitHubIcon
} from '@mui/icons-material';

const GITHUB_PAGES_URL = 'https://ezrasong.github.io/UW-Course-Planner';

export default function Login({ onLogin }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) onLogin(session.user);
    });
    return () => sub.unsubscribe();
  }, [onLogin]);

  const handleLogin = provider => {
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: GITHUB_PAGES_URL }
    });
  };

  const bgUrl = `${process.env.PUBLIC_URL}/login-bg.jpg`;

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
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
          justifyContent: 'center',
          p: 2
        }}
      >
        <Paper
          elevation={6}
          sx={{
            width: 360,
            height: 360,
            bgcolor: 'rgba(255,255,255,0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            textAlign: 'center',
            borderRadius: 2
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