# KNSlides

KNSlides is an Azerbaijani lesson presentation planner that can generate a real `.pptx` PowerPoint file directly from the hosted UI.

Created by: `Novruzov Kənan`

## What it does

- Lets the teacher choose a subject and grade
- Suggests lesson menu buttons by subject
- Builds a slide structure preview in Azerbaijani
- Downloads a real PowerPoint presentation from the browser
- Uses a more playful slide style for grades `1-4`
- Uses a cleaner, lightly playful style for higher grades
- Includes a UI-only `Light / Night` mode

## Project files

- `index.html` - KNSlides interface
- `style.css` - base UI styling
- `theme-ui.css` - UI-only theme styling
- `script.js` - planner logic and browser-side PowerPoint export
- `theme-ui.js` - light/night mode logic
- `server.js` - static web server for Render
- `package.json` - Node start script for Render
- `render.yaml` - Render service configuration
- `Azerslide.ps1` - legacy local Windows PowerPoint automation script

## Render hosting

Deploy as a `Web Service`.

Use:

- Root Directory: `Azerslide`
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

- The hosted version now creates the PowerPoint in the browser.
- The `Azerslide.ps1` file is still available for Windows-only local use, but it is no longer required for the hosted flow.
- The theme toggle changes only the program UI, not the generated slide design mode.
