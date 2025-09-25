import React, { useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Box, Paper, Typography, Button, Stack, Divider } from "@mui/material";
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
          position: "fixed",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(13, 30, 66, 0.65), rgba(0, 0, 0, 0.7))",
          backdropFilter: "blur(6px)",
          zIndex: 0,
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
            width: { xs: 340, sm: 380 },
            p: { xs: 3, sm: 4 },
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            textAlign: "center",
            borderRadius: 3,
            backgroundColor: "rgba(255,255,255,0.92)",
            boxShadow: (theme) =>
              `0 30px 80px rgba(0,0,0,${theme.palette.mode === "dark" ? 0.65 : 0.25})`,
          }}
        >
          <Stack spacing={2} alignItems="center">
            <Box
              component="img"
              src={logoUrl}
              alt="UW Logo"
              sx={{ width: 84, height: 84 }}
            />
            <Stack spacing={0.5}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Waterloo Course Planner
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Curate your academic journey, organize terms, and keep track of
                every requirement in one place.
              </Typography>
            </Stack>
          </Stack>

          <Divider sx={{ my: 3 }}>Sign in to continue</Divider>

          <Stack spacing={1.5}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<GoogleIcon />}
              onClick={() => handleLogin("google")}
              sx={{
                py: 1,
                fontWeight: 600,
                textTransform: "none",
              }}
            >
              Continue with Google
            </Button>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<GitHubIcon />}
              onClick={() => handleLogin("github")}
              sx={{
                py: 1,
                fontWeight: 600,
                textTransform: "none",
                borderWidth: 2,
                "&:hover": {
                  borderWidth: 2,
                },
              }}
            >
              Continue with GitHub
            </Button>
          </Stack>
        </Paper>
      </Box>
    </>
  );
}