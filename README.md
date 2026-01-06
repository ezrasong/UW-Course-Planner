# UW Course Planner

UW Course Planner is a web application for University of Waterloo students to search courses, view course details and prerequisites, and plan their academic schedule. Users can sign in with Google or GitHub (via Supabase Auth) and then browse the course catalog, filter courses by subject or program requirements, and add courses to a personal term-by-term plan. The interface, built with React and Material-UI, supports light/dark themes for comfortable viewing.

## Features

- **Search & Filter:** Quickly search courses by code or title and filter by subject, program relevance, or required courses for a given major.  
- **Course Details:** Click the info icon in the catalog to open a dialog showing detailed course information (description, grading basis, prerequisites, etc.) and choose a term to add the course to your plan.  
- **Planner View:** The *Planner* tab displays all courses you’ve added, organized by term. Each entry shows the course code, title, and term, with options to mark it as “Done” (completed) or remove it from your plan.  
- **Add/Remove Courses:** From the catalog, add courses to your plan (the “Add” button becomes “Added” once selected). In the Planner, remove courses with the delete icon and toggle completion status via the checkbox.  
- **Authentication:** Built-in authentication lets users log in with Google or GitHub accounts, powered by Supabase Auth.  
- **Theme Toggle:** Switch between light and dark modes using the toolbar button for a customizable look.

## Installation

1. **Prerequisites:** Ensure you have [Node.js](https://nodejs.org/) (with npm) and the [Supabase CLI](https://supabase.com/docs/guides/cli) installed.  
2. **Clone the repository:**  
   ```bash
   git clone https://github.com/ezrasong/UW-Course-Planner.git
   cd UW-Course-Planner
   ```  
3. **Configure environment:** Create a Supabase project (or use an existing one) and note the `SUPABASE_URL` and `SUPABASE_ANON_KEY`/`SERVICE_ROLE_KEY`. In the project folder, set environment variables for Supabase and the UW Open Data API key:  
   - `SUPABASE_URL` – your Supabase project URL.  
   - `SUPABASE_SERVICE_ROLE_KEY` – your Supabase service role key.  
   - `UW_API_KEY` – your [UW Open Data API key](https://openapi.data.uwaterloo.ca/).  
4. **Start Supabase (local dev):** Run `supabase start` to launch the local database and API. This will also serve the edge function that fetches course data.  
5. **Install dependencies:**  
   ```bash
   cd client
   npm install
   ```  
6. **Run the app:**  
   ```bash
   npm start
   ```  
   This starts the React development server (by default at http://localhost:3000) with the frontend proxying any API requests to your local Supabase instance.

After installation, you may need to populate the `courses` table by invoking the `fetch-courses` function. This is done automatically on Supabase start; it fetches current term courses from the UW Open Data API and upserts them into the database (using the defined program requirements).

## Automated catalog refresh

- The Supabase project is configured with a cron job (`supabase/config.toml`) that triggers the `fetch-courses` edge function every day at 05:30 UTC. The job calls the function with the service role key so the catalog stays synchronized without manual intervention.
- Make sure the `SUPABASE_SERVICE_ROLE_KEY` secret is available to the project (for local development set it in your environment before running `supabase start`).
- When you deploy the infrastructure, run `supabase cron deploy` so the scheduled job is registered with your Supabase project.

## Usage

1. **Open the app:** Navigate to `http://localhost:3000` in your browser.  
2. **Log in:** Use the **Sign in with Google** or **Sign in with GitHub** button. Supabase will redirect back to the app upon successful login.  
3. **Browse courses:** Click the **Course Catalog** tab. Use the search box to find courses by code or title, and apply any filters (subject, program-only, required-only) as needed.  
4. **View details:** Click the ℹ️ info button next to a course to open the details dialog. Read the description and prerequisites, select a term, and click **Add to Plan** to include it in your schedule.  
5. **Plan courses:** Switch to the **Planner** tab to see your selected courses. Mark them as completed using the checkbox, or remove them using the trash icon. Your plan is saved per user in the Supabase database, so you can revisit it anytime after logging in.

