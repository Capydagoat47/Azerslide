# Release Checklist

## Before push

1. Open `index.html` or the hosted app and test the full automatic planner flow.
2. Confirm subject, grade, and optional topic generate a preview without manual section entry.
3. Toggle `Light / Night` mode and confirm it changes only the program UI.
4. Turn `Smart Board Mode` on and off and confirm the preview labels update.
5. Test one TRIMS/textbook link if available.
6. Test one PDF upload if available.
7. Create one sample `.pptx` from the browser and confirm the file downloads.
8. Open the downloaded PowerPoint and confirm the cover slide, route slide, and section slides are generated.
9. Confirm the visible program brand name is `KNSlides Pro`.
10. Confirm `By: Novruzov Kənan` appears in the interface only.
11. Confirm generated slides do not show the program brand or author name in slide content.

## Before publishing

1. Review `README.md`.
2. Confirm Render settings still use:
   `Build Command: npm install`
   `Start Command: npm start`
3. Make sure generated sample `.pptx` files are not being committed unless you want them in the repo.
4. If you changed dependencies, run `npm install` locally before pushing.
