import React from "react";
import {
  Box,
  Chip,
  Divider,
  Grid,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Article as ArticleIcon,
  Checklist as ChecklistIcon,
  Code as CodeIcon,
  Schema as SchemaIcon,
  TipsAndUpdates as TipsIcon,
} from "@mui/icons-material";

const samplePlan = JSON.stringify(
  {
    name: "Computational Mathematics",
    relevantSubjects: ["AMATH", "CO", "CS", "MATH", "PMATH", "STAT"],
    requirements: [
      {
        description: "Algebra foundation",
        options: ["MATH135", "MATH145"],
      },
      {
        description: "First programming course",
        options: ["CS115", "CS135"],
      },
      {
        description: "Statistics core",
        options: ["STAT230", "STAT240"],
      },
    ],
  },
  null,
  2
);

const requirementExample = JSON.stringify(
  {
    description: "Choose one of Linear Algebra 2",
    options: ["MATH235", "MATH245"],
  },
  null,
  2
);

const cardPanel = (theme) => {
  const isDark = theme.palette.mode === "dark";
  return {
    position: "relative",
    overflow: "hidden",
    borderRadius: 3,
    backgroundColor: alpha(
      theme.palette.background.paper,
      isDark ? 0.86 : 1
    ),
    border: `1px solid ${alpha(theme.palette.divider, isDark ? 0.7 : 0.45)}`,
    boxShadow: theme.shadows[4],
  };
};

export default function InfoHub() {
  return (
    <Stack spacing={4} sx={{ pb: 4, flex: 1, minHeight: 0 }}>
      <Paper
        elevation={0}
        sx={[(theme) => cardPanel(theme), { px: { xs: 3, md: 5 }, py: { xs: 4, md: 6 }, borderRadius: 4 }]}
      >
        <Stack spacing={2} sx={{ maxWidth: 720 }}>
          <Chip
            label="Resource hub"
            color="secondary"
            variant="outlined"
            size="small"
            sx={{ alignSelf: "flex-start", fontWeight: 600 }}
          />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Format custom requirement plans with confidence
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Tailor the planner to your program by supplying a structured JSON
            file. This guide explains the schema, shows working examples, and
            highlights best practices so that uploads behave reliably in
            production.
          </Typography>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={[(theme) => cardPanel(theme), { height: "100%", p: 3, display: "flex", flexDirection: "column", gap: 2 }]}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <SchemaIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Schema overview
              </Typography>
            </Stack>
            <Divider />
            <List dense>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <ArticleIcon color="secondary" />
                </ListItemIcon>
                <ListItemText
                  primary={<Box component="code">name</Box>}
                  secondary="Displayed heading for the program. Defaults to the built-in Computational Mathematics plan."
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <ArticleIcon color="secondary" />
                </ListItemIcon>
                <ListItemText
                  primary={<Box component="code">relevantSubjects</Box>}
                  secondary='Array of subject codes tracked in the catalog filters. Optional, but improves the "Show tracked subjects" filter.'
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
              <ListItem alignItems="flex-start">
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <ChecklistIcon color="secondary" />
                </ListItemIcon>
                <ListItemText
                  primary={<Box component="code">requirements</Box>}
                  secondary="Array of requirement objects. Each requirement needs a human readable description and a list of accepted course codes."
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={[(theme) => cardPanel(theme), { height: "100%", p: 3, display: "flex", flexDirection: "column", gap: 2 }]}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <CodeIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Sample plan file
              </Typography>
            </Stack>
            <Divider />
            <Typography variant="body2" color="text.secondary">
              Use this template as a starting point for new programs. Save the
              structure below as <Box component="code">.json</Box> and upload it
              through the catalog sidebar.
            </Typography>
            <Box
              component="pre"
              sx={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 2,
                p: 2,
                overflowX: "auto",
                fontFamily: "'Source Code Pro', 'Fira Code', monospace",
                fontSize: 13,
                color: "text.primary",
                backgroundColor: (theme) =>
                  alpha(
                    theme.palette.background.default,
                    theme.palette.mode === "dark" ? 0.55 : 0.92
                  ),
                border: (theme) =>
                  `1px solid ${alpha(
                    theme.palette.divider,
                    theme.palette.mode === "dark" ? 0.7 : 0.5
                  )}`,
                boxShadow: (theme) => theme.shadows[2],
              }}
            >
              {samplePlan}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper
        elevation={0}
        sx={[(theme) => cardPanel(theme), { p: { xs: 3, md: 4 }, display: "flex", flexDirection: "column", gap: 3 }]}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <TipsIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Requirement object checklist
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Every entry inside <Box component="code">requirements</Box> is parsed
          individually. Keep each object small and descriptive so students know
          exactly which courses qualify.
        </Typography>
        <Box
          component="pre"
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 2,
            p: 2,
            overflowX: "auto",
            fontFamily: "'Source Code Pro', 'Fira Code', monospace",
            fontSize: 13,
            color: "text.primary",
            backgroundColor: (theme) =>
              alpha(theme.palette.background.paper, 0.92),
            border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.6)}`,
            boxShadow: (theme) => theme.shadows[2],
          }}
        >
          {requirementExample}
        </Box>
        <List>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ChecklistIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Descriptions should read well on their own."
              secondary="Keep them concise (under 80 characters) so they stay legible in the planner checklist."
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ChecklistIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Course codes must match catalog entries exactly."
              secondary="Use the subject prefix immediately followed by the catalog number (for example, MATH136)."
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ChecklistIcon color="success" />
            </ListItemIcon>
            <ListItemText
              primary="List alternatives in the order you recommend students take them."
              secondary="The first satisfied option is displayed back to users, so prioritize the canonical choice."
            />
          </ListItem>
        </List>
      </Paper>

      <Paper
        elevation={0}
        sx={[(theme) => cardPanel(theme), { p: { xs: 3, md: 4 }, display: "flex", flexDirection: "column", gap: 2 }]}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Workflow best practices
        </Typography>
        <Divider />
        <List>
          <ListItem alignItems="flex-start">
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ChecklistIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Validate the JSON before uploading"
              secondary={
                <>
                  Run your file through a linter such as <Link href="https://jsonlint.com" target="_blank" rel="noreferrer">JSONLint</Link> to catch syntax errors and trailing commas.
                </>
              }
            />
          </ListItem>
          <ListItem alignItems="flex-start">
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ChecklistIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Keep subject lists short"
              secondary="Only include subjects you actively want highlighted in the filters. Too many subjects make the picker unwieldy."
            />
          </ListItem>
          <ListItem alignItems="flex-start">
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ChecklistIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Version control your plans"
              secondary="Store JSON files alongside program documentation so curriculum changes can be tracked and reviewed."
            />
          </ListItem>
          <ListItem alignItems="flex-start">
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ChecklistIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Test uploads in staging first"
              secondary="Load custom plans into a non-production Supabase project to verify requirement counts and filters before sharing with students."
            />
          </ListItem>
        </List>
      </Paper>
    </Stack>
  );
}
