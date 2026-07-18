# Authentication setup

Nano Curator supports three entry modes:

- Email magic-link authentication through Supabase
- Google OAuth through Supabase
- Guest mode with browser-local data

## 1. Create the Supabase project

1. Create a project at https://supabase.com/dashboard.
2. Open the project's **Connect** dialog.
3. Copy the Project URL and publishable key.
4. Add them to `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

The publishable key is designed for browser use. Never put the service-role key in a `VITE_` variable.

## 2. Configure redirect URLs

In Supabase, open **Authentication > URL Configuration**.

- Site URL for local development: `http://localhost:3000`
- Add `http://localhost:3000` to the redirect allow list.
- Add the deployed production URL later.

Magic-link emails return to this URL after Supabase verifies the link.

## 3. Test email magic links

Email authentication is normally enabled by default.

1. Restart the app after adding the environment variables.
2. Open **Sign in**.
3. Enter your email and request a link.
4. Open the email in the same browser and follow the link.
5. The app should return with a persisted Supabase session.

For a public demo, customize the email template and sender before sharing the project widely.

## 4. Configure Google

1. In Google Cloud, create or select a project.
2. Configure the Google Auth Platform branding, audience, and scopes.
3. Create an OAuth client with type **Web application**.
4. Add `http://localhost:3000` as an authorized JavaScript origin.
5. In Supabase, open **Authentication > Providers > Google** and copy the callback URL shown there.
6. Add that Supabase callback URL as an authorized redirect URI in Google Cloud.
7. Copy the Google Client ID and Client Secret into the Supabase Google provider settings.
8. Enable the provider and save.

The Google client secret belongs in Supabase, not in this repository.

## 5. How the code is organized

- `services/supabase.ts` creates the client and owns auth operations.
- `components/auth/AuthPage.tsx` owns the login user interface.
- `App.tsx` observes auth-state changes and selects the active user ID.
- Guest sessions use the generated local profile ID.
- Authenticated sessions use the verified Supabase user ID.

Supabase persists and refreshes the auth session in the browser. The next database phase will create profile, wardrobe, and style-session tables protected by Row Level Security so each authenticated user can access only their own rows.

Official references:

- https://supabase.com/docs/guides/auth/quickstarts/react
- https://supabase.com/docs/reference/javascript/auth-signinwithotp
- https://supabase.com/docs/guides/auth/social-login/auth-google
