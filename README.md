# Run and deploy your AI Studio app

This contains everything you need to run this project locally and preview it on a development server.

## Run Locally

**Prerequisites:** Node.js 18+ and npm

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and set your Gemini API key:
   `GEMINI_API_KEY="YOUR_GEMINI_API_KEY"`
3. Start the development server:
   `npm run dev`
4. Open the app in your browser at:
   `http://localhost:3000`

> If PowerShell prevents running npm scripts due to execution policy, run the commands from Windows CMD instead.

## VS Code setup

You can also run the project from VS Code using the built-in task and launch configurations.

- Run Task > `npm: install`
- Run Task > `npm: dev server`
- Debug > `Launch dev server`

## Notes

- In development mode, the app uses Vite middleware through `server.ts`.
- In production, the app is served from the built `dist` directory.
