# Azerslide

Azerslide is a lesson presentation planner for Azerbaijani schools.

It includes:

- A browser-based planner UI in Azerbaijani
- Subject-aware button suggestions based on the school subject
- A UI-only `Light / Night` mode toggle
- A Windows PowerShell generator that creates real `.pptx` files

## Project files

- `index.html` - planner interface
- `style.css` - base planner styling
- `theme-ui.css` - UI-only theme toggle styling
- `script.js` - planner logic and output structure
- `theme-ui.js` - UI-only light/night mode logic
- `Azerslide.ps1` - PowerPoint generator
- `Launch-Azerslide.cmd` - quick launcher for the PowerPoint generator

## Quick start

### Planner UI

Open `index.html` in a browser.

Use it to:

- enter the subject and grade
- choose how many menu buttons you want
- name the lesson sections
- preview the lesson structure

The `Light / Night` button changes only the program UI.
It does not change generated slides or slide content.

### Render hosting

If Render requires a start command, deploy the planner UI as a `Web Service`.

Use:

- Build Command: `npm install`
- Start Command: `npm start`

This works because the repo now includes:

- `package.json`
- `server.js`
- `render.yaml`

If your Render service points directly at this app folder, those commands are enough.

### PowerPoint generator

On Windows with Microsoft PowerPoint installed:

1. Run `Launch-Azerslide.cmd`
2. Fill the form
3. Generate a `.pptx` file

Or run the script directly:

```powershell
powershell -NoLogo -NoProfile -STA -ExecutionPolicy Bypass -File .\Azerslide.ps1 -Gui
```

## Release notes

Before pushing updates:

1. Remove any generated `.pptx` files you do not want to publish
2. Check the planner UI in browser
3. Check the PowerPoint generator on Windows with PowerPoint installed
4. Confirm the UI-only theme toggle still does not affect slide output
5. Review Azerbaijani text for spelling and encoding issues

## Notes

- The planner structure is for teachers to fill in later.
- The app does not auto-write lesson explanations, questions, exercises, or videos.
- Grades `1-4` are designed to feel more playful in the generated PowerPoint output.
- Higher grades keep a more polished and lightly playful presentation style.
