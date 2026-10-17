/*
  CareerPilot API adapter.
  Backend contract provided by the team:
    POST http://127.0.0.1:8000/api/evaluate
    Content-Type: application/json
    { "repo_summary": "...", "job_description": "..." }

  IMPORTANT:
  - This is a local-development URL. It only works on the computer running the backend.
  - The backend response schema has not been provided, so this adapter displays the
    returned JSON safely and also extracts common fields when it can.
  - Update API_BASE if your backend runs at a different address.
*/
const API_BASE = "http://127.0.0.1:8000";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function findFirst(obj, keys) {
  if (!isObject(obj)) return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") return obj[key];
  }
  return undefined;
}

function flattenList(value) {
  if (Array.isArray(value)) return value.map(item => isObject(item) ? safeText(item) : String(item));
  if (typeof value === "string") return value.split(/\n|•/).map(s => s.trim()).filter(Boolean);
  return value === undefined || value === null ? [] : [safeText(value)];
}

function addResultCard(container, title, value) {
  if (value === undefined || value === null || value === "") return;
  const card = document.createElement("section");
  card.className = "result-card";
  const heading = document.createElement("h3");
  heading.textContent = title;
  card.appendChild(heading);
  if (Array.isArray(value)) {
    const list = document.createElement("ul");
    value.forEach(item => {
      const li = document.createElement("li");
      li.textContent = isObject(item) ? safeText(item) : String(item);
      list.appendChild(li);
    });
    card.appendChild(list);
  } else {
    const p = document.createElement("p");
    p.textContent = isObject(value) ? safeText(value) : String(value);
    card.appendChild(p);
  }
  container.appendChild(card);
}

function renderEvaluation(data) {
  const root = document.getElementById("evaluationResults");
  const notice = document.getElementById("resultNotice");
  if (!root || !notice) return;
  root.replaceChildren();
  notice.className = "notice success";
  notice.textContent = "Evaluation received from your backend. Review the findings below; the exact labels depend on the backend's response schema.";
  root.classList.remove("hidden");

  const object = isObject(data) ? data : { result: data };
  const score = findFirst(object, ["match_score", "overall_match", "readiness_score", "score", "match_percentage"]);
  const summary = findFirst(object, ["summary", "overall_summary", "assessment", "overview", "overall_assessment"]);
  const skills = findFirst(object, ["demonstrated_skills", "matched_skills", "skills_found", "existing_skills", "strengths"]);
  const gaps = findFirst(object, ["skill_gaps", "gaps", "missing_skills", "areas_to_improve", "weaknesses"]);
  const recommendations = findFirst(object, ["recommendations", "action_plan", "next_steps", "suggestions", "learning_plan"]);
  const evidence = findFirst(object, ["evidence", "repository_evidence", "project_evidence", "citations", "file_references"]);
  const role = findFirst(object, ["target_role", "job_title", "role"]);

  if (role !== undefined) addResultCard(root, "Target role", role);
  if (score !== undefined) addResultCard(root, "Score returned by backend", score);
  if (summary !== undefined) addResultCard(root, "Assessment summary", summary);
  if (skills !== undefined) addResultCard(root, "Skills identified", flattenList(skills));
  if (gaps !== undefined) addResultCard(root, "Skills or evidence gaps", flattenList(gaps));
  if (recommendations !== undefined) addResultCard(root, "Recommended next steps", flattenList(recommendations));
  if (evidence !== undefined) addResultCard(root, "Repository evidence", flattenList(evidence));

  const raw = document.createElement("section");
  raw.className = "result-card";
  raw.style.gridColumn = "1 / -1";
  const rawHeading = document.createElement("h3");
  rawHeading.textContent = "Full backend response";
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(data, null, 2);
  raw.append(rawHeading, pre);
  root.appendChild(raw);
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("analysisForm");
  if (!form) return;
  const button = document.getElementById("analyzeButton");
  const status = document.getElementById("analysisStatus");
  const repoInput = document.getElementById("repoSummary");
  const jobInput = document.getElementById("jobDescription");
  const resumeInput = document.getElementById("resumeNotes");

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const repoSummary = repoInput.value.trim();
    const jobDescription = jobInput.value.trim();
    if (!repoSummary || !jobDescription) {
      status.className = "notice warning";
      status.textContent = "Please provide both repository details and a target job description.";
      return;
    }
    button.disabled = true;
    button.classList.add("loading-dots");
    button.textContent = "Analyzing";
    status.className = "notice";
    status.textContent = "Connecting to your local evaluation backend";
    document.getElementById("evaluationResults")?.classList.add("hidden");
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/evaluate-repo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_url: repoSummary, job_description: jobDescription })
      });
      const rawBody = await response.text();
      let data;
      try { data = rawBody ? JSON.parse(rawBody) : {}; }
      catch (_) { data = { response_text: rawBody }; }
      if (!response.ok) {
        const detail = findFirst(data, ["detail", "message", "error"]);
        throw new Error(`Backend returned HTTP ${response.status}${detail ? ": " + safeText(detail) : ""}`);
      }
      renderEvaluation(data);
      status.className = "notice success";
      status.textContent = "Analysis complete. The result below is returned by your backend.";
      document.getElementById("evaluationResults")?.scrollIntoView({ behavior: "smooth", block: "start" });
      // Resume notes are deliberately not sent: the supplied backend contract has no resume field.
      if (resumeInput && resumeInput.value.trim()) {
        const note = document.getElementById("resumeNoteStatus");
        if (note) note.textContent = "Resume notes are saved only in this form and were not sent because the current API contract does not include a resume field.";
      }
    } catch (error) {
      status.className = "notice error";
      const msg = error instanceof TypeError
        ? "Could not connect to the backend. Confirm it is running at http://127.0.0.1:8000, check the browser console, and ensure CORS allows your local frontend origin."
        : error.message;
      status.textContent = msg;
    } finally {
      button.disabled = false;
      button.classList.remove("loading-dots");
      button.textContent = "Analyze portfolio ↗";
    }
  });
});

async function evaluateRepository(githubUrl, jobDescription) {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/evaluate-repo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                github_url: githubUrl,
                job_description: jobDescription
            })
        });

        if (!response.ok) {
            throw new Error('Failed to evaluate repository');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        alert('Could not connect to the backend server.');
    }
}