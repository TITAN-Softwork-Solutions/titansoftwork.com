# TITAN Lander (Multi-Page Vite)

This repo is a multi-page static site built with Vite.

## Routes

- `/` is `index.html`
- `/blog/` is `blog/index.html`

Route HTML entrypoints live at the route path so the output structure matches the deployed URLs.

## Source Layout

- `src/entries/`
  - Per-route JS entrypoints (wire CSS + page app)
- `src/pages/`
  - Route implementations (DOM + behavior)
- `src/styles/`
  - Global and feature stylesheets

## Public Layout

- `public/media/`
  - Images and static media referenced from CSS/HTML
- `public/content/`
  - JSON and content files fetched at runtime

### Blog Content

- Posts live at `public/content/blog/posts/<slug>/index.md`
- Post images should be stored next to the markdown and referenced relatively, e.g. `./diagram.png`
- The blog index reads `public/content/blog/manifest.json`

## Dev / Build

```sh
npm run dev
npm run build
npm run preview
```

