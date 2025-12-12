# UniDoxia Platform

UniDoxia connects students with global education opportunities through a modern React + Supabase stack. This repository contains the web application, Supabase edge functions, and database migrations that power the experience.

## Developing locally

1. Ensure Node.js and npm are installed (e.g., via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).
2. Clone the repository and install dependencies:
   ```sh
   git clone <YOUR_GIT_URL>
   cd <YOUR_PROJECT_NAME>
   npm install
   ```
3. Start the development server with auto-reloading and an instant preview:
   ```sh
   npm run dev
   ```

## Technology stack

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (database, authentication, and functions)

## Deployment

Deploy via your preferred hosting provider (e.g., Vercel, Netlify, or a custom Vite-compatible host). Configure environment variables for Supabase and any third-party services as needed.

## Final integration checklist

Before releasing changes, verify:

- All pages use a consistent layout and typography.
- Admin navigation is protected by role checks.
- Supabase tables are properly connected (profiles, agents, universities, applications, audit_logs, notifications).
- Dark mode, language switching, and data export work globally.
- Zoe AI insights render dynamically using cached analytics.
- Outbound emails use UniDoxia branding and messaging.
