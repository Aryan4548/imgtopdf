# Image PDF Maker

A small static website that turns multiple uploaded images into a PDF in the browser.

## Features

- Add multiple images with file picker or drag-and-drop.
- Reorder and remove images.
- Choose page size, orientation, image layout, margin, and gap.
- Add a text watermark with placement, opacity, and size controls.
- Generate the PDF locally in the browser.

## Run Locally

Open `index.html` directly in a browser, or serve the folder:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy

This is a static site. On Netlify, set:

- Build command: empty
- Publish directory: `.`
