# CareerPilot AI — student career coach prototype

A responsive, multi-page HTML/CSS/JavaScript prototype for a student-facing AI Career Coach.

## Features
- Career dashboard and navigation
- Portfolio analysis form wired to the team's evaluation endpoint
- Defensive display of returned backend JSON, plus extraction of common result fields
- Three career-path concepts: Moonshot, Direct Fit, High-Growth Pivot
- Career coach demo UI, skeptical recruiter practice, learning roadmap, and weekly checklist
- Responsive layout and local progress persistence in the browser

## Project structure
```text
career_coach_website/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   └── api.js
├── pages/
│   ├── analysis.html
│   ├── career-paths.html
│   ├── coach.html
│   ├── recruiter.html
│   ├── training.html
│   └── progress.html
└── README.md
```

## Run locally
1. Open the folder in VS Code.
2. Install/use the **Live Server** extension.
3. Right-click `index.html` → **Open with Live Server**.
4. Start the backend in a separate terminal on the same computer.
5. Confirm `http://127.0.0.1:8000/api/evaluate` is the correct endpoint and that backend CORS permits the Live Server origin (commonly `http://127.0.0.1:5500`).

Do not open the HTML files directly with `file://`; use a local server.

## API contract currently implemented
`POST http://127.0.0.1:8000/api/evaluate`

Headers:
```http
Content-Type: application/json
```

Body:
```json
{
  "repo_summary": "Repository URL or text summary",
  "job_description": "Pasted job description"
}
```

The résumé field is intentionally not sent because the supplied API contract does not include it. The frontend displays the full response JSON and tries to extract common keys such as `summary`, `demonstrated_skills`, `skill_gaps`, `recommendations`, and `evidence`. The exact response schema should be mapped once the backend team shares it.

## Important scope notes
- The API URL is a local development URL; it works only where the backend is running.
- Pasting a GitHub URL only works if the backend knows how to fetch/inspect that repository. Otherwise paste a repository summary.
- Automatic GitHub webhook/polling and automatic reassessment are **not implemented in this frontend**, because no watcher/webhook endpoint was supplied. This needs backend support; do not present it as a working feature unless it is connected.
- Career coach replies and recruiter prompts are prototype/demo content; they are not AI-generated until corresponding backend endpoints are integrated.
- Career-path cards are illustrative until connected to actual job matching.
- The weekly checklist is stored in the browser using local storage.

## Before your demo
- Test the API while the backend is running.
- Check the exact response schema and adjust `js/api.js` if needed.
- Use a real job description and repository summary.
- Show the request, the returned assessment, and the next step you take based on the results.
- Be transparent about which modules are live versus prototype UI.
