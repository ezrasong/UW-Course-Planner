import React, { useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Box, Paper, Typography, Button, Divider } from "@mui/material";
import {
  Google as GoogleIcon,
  GitHub as GitHubIcon,
} from "@mui/icons-material";

const GITHUB_PAGES_URL = "https://ezrasong.github.io/UW-Course-Planner";

export default function Login({ onLogin }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) onLogin(session.user);
    });
    return () => subscription.unsubscribe();
  }, [onLogin]);

  const handleLogin = (provider) => {
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: GITHUB_PAGES_URL },
    });
  };

  const bgUrl = `${process.env.PUBLIC_URL}/login-bg.jpg`;
  const logoUrl = `${process.env.PUBLIC_URL}/uwlogo.svg`;

  return (
    <>
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          background: `url(${bgUrl}) center/cover no-repeat`,
          zIndex: -1,
        }}
      />

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={6}
          sx={{
            width: 360,
            height: 360,
            bgcolor: "rgba(255,255,255,0.9)",
            p: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            borderRadius: 2,
            justifyContent: "center",
          }}
        >
          <Box
            component="img"
            src={logoUrl}
            alt="UW Logo"
            sx={{ width: 80, mb: 1 }}
          />

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
            onClick={() => handleLogin("google")}
          >
            Sign in with Google
          </Button>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<GitHubIcon />}
            sx={{ mt: 1 }}
            onClick={() => handleLogin("github")}
          >
            Sign in with GitHub
          </Button>
        </Paper>
      </Box>
    </>
  );
}