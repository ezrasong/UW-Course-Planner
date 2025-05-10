import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Divider
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import GitHubIcon from '@mui/icons-material/GitHub';
import { auth, googleProvider, githubProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

export default function Login({ onLogin }) {
  const signIn = (provider) => {
    signInWithPopup(auth, provider)
      .then(res => onLogin(res.user))
      .catch(err => console.error(err));
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 360, width: '100%' }} elevation={6}>
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Waterloo Course Planner
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            Sign in to continue
          </Typography>

          <Button
            variant="contained"
            fullWidth
            startIcon={<GoogleIcon />}
            sx={{ mt: 2, textTransform: 'none' }}
            onClick={() => signIn(googleProvider)}
          >
            Sign in with Google
          </Button>

          <Button
            variant="outlined"
            fullWidth
            startIcon={<GitHubIcon />}
            sx={{ mt: 1, textTransform: 'none' }}
            onClick={() => signIn(githubProvider)}
          >
            Sign in with GitHub
          </Button>

          <Divider sx={{ my: 3 }}>or</Divider>
          <Typography variant="caption" color="text.secondary">
            Use your Google or GitHub account to log in.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
