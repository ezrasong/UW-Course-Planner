import React from "react";
import {
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton,
  Typography,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";

const termSequence = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"];

export default function Planner({
  plan,
  coursesMap,
  onRemoveCourse,
  onToggleComplete,
}) {
  const planByTerm = termSequence.map((term) => ({
    term,
    courses: plan.filter((item) => item.term === term),
  }));

  return (
    <Grid container spacing={2}>
      {planByTerm.map(({ term, courses }) => (
        <Grid item xs={12} md={6} lg={3} key={term}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {term}
            </Typography>
            {courses.length === 0 ? (
              <Typography sx={{ fontStyle: "italic", color: "text.secondary" }}>
                None
              </Typography>
            ) : (
              <List dense>
                {courses.map((item) => {
                  const course = coursesMap[item.code];
                  const label = course
                    ? `${course.subjectCode} ${course.catalogNumber} – ${course.title}`
                    : item.code;
                  return (
                    <ListItem
                      key={item.code}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          onClick={() => onRemoveCourse(item.code)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={item.completed}
                          onChange={() => onToggleComplete(item.code)}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={label}
                        primaryTypographyProps={{
                          style: {
                            textDecoration: item.completed
                              ? "line-through"
                              : "none",
                            color: item.completed ? "gray" : "inherit",
                          },
                        }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
