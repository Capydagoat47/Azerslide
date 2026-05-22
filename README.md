# KNSlides Pro

KNSlides Pro is an Azerbaijani lesson presentation builder for schools that automatically designs a lesson flow and downloads a real `.pptx` file.

Created by: `Novruzov Kənan`

## What changed

The old manual button workflow has been removed.

Teachers now use this flow:

1. Choose subject
2. Choose grade
3. Optionally add lesson topic
4. Optionally paste a TRIMS link, upload a PDF, or paste textbook text
5. Preview the generated lesson presentation
6. Download the PowerPoint file

## Core features

- Automatic lesson structure generation by subject and topic
- Grade-based theme switching
- `1–4-cü sinif` for brighter, more playful presentation design
- `5–11-ci sinif` for calmer academic presentation design
- `Smart Board Mode` for larger text and touch-friendly layout
- Real `.pptx` generation in the browser with `PptxGenJS`
- TRIMS/textbook resource extraction with server-side URL parsing
- PDF upload parsing in the browser
- UI-only `Light / Night` mode

## Project files

- `index.html` - KNSlides Pro interface and workflow layout
- `style.css` - main visual design for the app UI
- `theme-ui.css` - UI-only light/night mode styling
- `theme-ui.js` - program light/night mode toggle logic
- `lesson-engine.js` - shared lesson planning engine used by browser and server logic
- `script.js` - client-side app flow, preview rendering, source handling, and PPTX export
- `server.js` - static server plus remote textbook/TRIMS fetch endpoint
- `package.json` - Node runtime and dependency list for hosting
- `render.yaml` - Render deployment configuration
- `Azerslide.ps1` - legacy local Windows generator kept for older local workflows

## Render hosting

Deploy as a `Web Service`.

Use:

- Root Directory: project root
- Build Command: `npm install`
- Start Command: `npm start`

## Local run

If Node.js is installed:

```powershell
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

## Notes

- Program branding stays in the app UI.
- Generated slides do not show `KNSlides Pro` or `By: Novruzov Kənan` in the slide content.
- If source extraction fails, the planner falls back to `subject + grade + topic`.
