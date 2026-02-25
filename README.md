# React + TypeScript + Vite

## Desktop (Electron)

- Run web + Electron in development: `npm run dev:electron`
- Run backend only (for web dev/testing): `npm run dev:backend`
- Run Electron from a fresh production web build: `npm run start:electron`
- Build web and package desktop app: `npm run build:electron`

Desktop artifacts are output to the `release/` directory.

## AI Backend (Node + Electron)

- Electron now starts a local Node backend automatically on `http://127.0.0.1:11435`.
- Chat endpoint: `POST /api/ai/chat`
- Health endpoint: `GET /api/health`
- Renderer uses this backend through `window.pkmDesktop.aiBaseUrl` (or `VITE_AI_BASE_URL`).

### Providers

- `ollama` (implemented): calls Ollama `/api/chat`
- `gemini` (implemented): calls Google AI Studio Gemini API
- `vertex` (stubbed for next stage): provider interface is ready for Vertex AI wiring

### Environment

- `PKM_AI_SERVER_PORT` (default `11435`)
- `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`)
- `OLLAMA_MODEL` (default `qwen3:8b`)
- `GOOGLE_AI_STUDIO_API_KEY` (required for `gemini` provider)
- `GEMINI_MODEL` (default `gemini-2.5-flash`)

The first pass is a simple chat interface in `Assistant`. Next pass can add RAG over Notes/Tasks/etc and tool calls for CRUD actions.

## Firebase Auth + Firestore

- App now uses Firebase Auth login (Google) before loading workspace.
- Data modules switch to Firestore after sign-in and scope data by user path:
  - `users/{uid}/projects`
  - `users/{uid}/notes`
  - `users/{uid}/tasks`
  - `users/{uid}/meetings`
  - `users/{uid}/companies`
  - `users/{uid}/people`
- Firestore module retains two-way relation syncing behavior used by local modules.

### Firebase Setup Checklist

- Copy `.env.example` to `.env` and fill in your Firebase Web App values.
- Enable Google provider in Firebase Auth.
- Add localhost app domain (for development) and your production domain.
- Add Firestore security rules that restrict reads/writes to `request.auth.uid == uid`.

### Firebase Environment Variables

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
