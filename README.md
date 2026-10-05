# Daymark

A small task board built for Netlify: a static frontend, a serverless CRUD API, and a PostgreSQL database through Netlify DB.

## Run locally

1. Install dependencies: `npm install`
2. Log in and link this folder to a Netlify site: `npx netlify login` and `npx netlify link`
3. Create or connect a database for the site: `npx netlify database init`
4. Start the local Netlify environment: `npm run dev`

The app will be available at `http://localhost:8888`. Netlify Dev supplies the function runtime and database environment variables.

## Deploy

Push this repository to GitHub, then create a site in Netlify by importing that repository. The included `netlify.toml` publishes `public/` and deploys `netlify/functions/`; no frontend build command is needed. In the Netlify CLI, link the site and run `npx netlify database init` to set up its database. Redeploy after database setup so the function receives its connection settings.

The `tasks` table is created automatically the first time the API is called. The API is available at `/api/tasks` and supports `GET`, `POST`, `PATCH`, and `DELETE`.

Netlify Database provides the `NETLIFY_DB_URL` connection string to functions automatically; you do not need to copy it into your code. If `npx netlify database init` says migrations are already set up, run `npx netlify database status` to check the database setup. The app's database clients use `NETLIFY_DB_URL`. Never commit the connection string to source control.