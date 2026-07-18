An AI-powered personal stylist. Upload your photo and get curated outfit makeovers, haircut suggestions, and a sustainable fashion report.

```bash
npm install
npm run dev
```

Cloud keys can be configured on the server in `.env.local`:

```bash
GEMINI_API_KEY=...
OPENAI_API_KEY=...
```

If a key is not configured, the app asks for it after the user selects a model. Entered keys are kept in memory for the current browser tab and are not saved with style sessions.

## Authentication

Email magic-link, Google OAuth, and guest-mode setup are documented in [AUTH_SETUP.md](./AUTH_SETUP.md).
