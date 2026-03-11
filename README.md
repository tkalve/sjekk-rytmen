# Phone Rhythm Formatter

Client-side static web page that checks one 8-digit phone number and formats it using the best rhythm:

- `2-2-2-2` (for example `45 22 52 47`)
- `3-2-3` (for example `452 25 247`)

The app evaluates both patterns and picks the one with the highest score.

When 8 digits are entered, the result appears immediately and shows which scoring rules contributed to the final score.

## Files

- `index.html` - page markup
- `styles.css` - page styles
- `app.js` - browser logic and scoring
- `code.ts` - reusable TypeScript version of the same core logic
- `.github/workflows/deploy-pages.yml` - GitHub Pages deployment workflow

## Run Locally

### Option 1: Python static server (recommended)

From the project root:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Then open:

- `http://127.0.0.1:8080`

Stop with `Ctrl + C`.

### Option 2: Open directly

Open `index.html` in your browser. This works because the app is plain HTML/CSS/JS.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository on branch `main`.
2. In GitHub repo settings, go to **Pages**.
3. Set source to **GitHub Actions**.
4. Push to `main` (or run the workflow manually from the Actions tab).
5. After the workflow succeeds, open the Pages URL shown by GitHub.

## Input Rules

- Only 8 digits are valid.
- Non-digit characters are ignored while parsing.
