# Release Checklist

## Before push

1. Open `index.html` or the hosted app and test the full planner flow.
2. Toggle `Light / Night` mode and confirm it changes only the UI.
3. Create one sample `.pptx` from the browser and confirm the file downloads.
4. Open the downloaded PowerPoint and confirm menu buttons and `⬅ Geri` links work.
5. Check that the visible brand name is `KNSlides`.
6. Check that `By: Novruzov Kənan` appears in the interface.

## Before publishing

1. Review `README.md`.
2. Confirm Render settings still use:
   `Root Directory: Azerslide`
   `Build Command: npm install`
   `Start Command: npm start`
3. Make sure generated sample `.pptx` files are not being committed unless you want them in the repo.
