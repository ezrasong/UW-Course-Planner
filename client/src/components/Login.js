// client/src/components/Login.js
import React from "react";
import { supabase } from "../supabaseClient";
import { Button, Box, Typography } from "@mui/material";
import {
  GitHub as GitHubIcon,
  Google as GoogleIcon,
} from "@mui/icons-material";

export default function Login({ onLogin }) {
  const handleOAuth = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) console.error("OAuth error:", error.message);
  };

  // Listen for the auth event on mount
  React.useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          onLogin(session.user);
        }
      }
    );
    return () => listener.unsubscribe();
  }, [onLogin]);

  return (
    <Box sx={{ textAlign: "center", mt: 10 }}>
      <Typography variant="h5" gutterBottom>
        Sign in to continue
      </Typography>
      <Button
        startIcon={<GoogleIcon />}
        variant="contained"
        sx={{ mx: 1 }}
        onClick={() => handleOAuth("google")}
      >
        Sign in with Google
      </Button>
      <Button
        startIcon={<GitHubIcon />}
        variant="contained"
        sx={{ mx: 1 }}
        onClick={() => handleOAuth("github")}
      >
        Sign in with GitHub
      </Button>
    </Box>
  );
}
