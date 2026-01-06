import React, { useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Box, Paper, Typography, Button, Stack, Divider } from "@mui/material";
import {
  Google as GoogleIcon,
  GitHub as GitHubIcon,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";

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
          filter: "brightness(0.65)",
          transform: "scale(1.05)",
          transformOrigin: "center",
          zIndex: -2,
        }}
      />
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          overflow: "hidden",
          background: (theme) =>
            `radial-gradient(120% 120% at 0% 100%, ${alpha(
              theme.palette.primary.main,
              0.45
            )} 0%, transparent 60%), radial-gradient(120% 120% at 100% 0%, ${alpha(
              theme.palette.secondary.main,
              0.4
            )} 0%, transparent 65%), linear-gradient(135deg, ${alpha(
              theme.palette.background.default,
              0.85
            )}, ${alpha(theme.palette.background.paper, 0.9)})`,
          backdropFilter: "blur(14px)",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: "-40%",
            background: (theme) =>
              `radial-gradient(70% 70% at 50% 30%, ${alpha(
                theme.palette.common.white,
                0.35
              )} 0%, transparent 70%)`,
            filter: "blur(120px)",
            opacity: 0.55,
          },
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
          elevation={0}
          sx={{
            width: { xs: 340, sm: 380 },
            p: { xs: 3.5, sm: 4.5 },
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            textAlign: "center",
            borderRadius: 4,
            position: "relative",
            overflow: "hidden",
            gap: 3,
            background: (theme) =>
              `linear-gradient(150deg, ${alpha(
                theme.palette.background.paper,
                theme.palette.mode === "dark" ? 0.38 : 0.86
              )} 0%, ${alpha(
                theme.palette.background.paper,
                theme.palette.mode === "dark" ? 0.16 : 0.7
              )} 100%)`,
            border: (theme) =>
              `1px solid ${alpha(
                theme.palette.common.white,
                theme.palette.mode === "dark" ? 0.12 : 0.4
              )}`,
            boxShadow: (theme) =>
              `0 45px 110px ${alpha(
                theme.palette.common.black,
                theme.palette.mode === "dark" ? 0.6 : 0.22
              )}`,
            backdropFilter: "blur(24px)",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: -80,
              background: (theme) =>
                `radial-gradient(60% 55% at 30% 25%, ${alpha(
                  theme.palette.primary.main,
                  0.28
                )} 0%, transparent 70%)`,
              filter: "blur(100px)",
              opacity: 0.8,
            },
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              background: (theme) =>
                `linear-gradient(140deg, ${alpha(
                  theme.palette.common.white,
                  0.18
                )} 0%, transparent 55%, ${alpha(
                  theme.palette.common.white,
                  0.08
                )} 100%)`,
              opacity: 0.6,
              pointerEvents: "none",
            },
            "& > *": {
              position: "relative",
              zIndex: 1,
            },
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
                borderRadius: 999,
                backdropFilter: "blur(6px)",
                boxShadow: (theme) =>
                  `0 18px 45px ${alpha(
                    theme.palette.primary.main,
                    0.28
                  )}`,
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
                borderRadius: 999,
                borderWidth: 2,
                backdropFilter: "blur(6px)",
                boxShadow: (theme) =>
                  `0 16px 40px ${alpha(
                    theme.palette.common.black,
                    0.22
                  )}`,
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