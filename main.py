import os
import re
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

app = FastAPI(
    title="AI Career Coach Backend",
    description="Team DeLuLu VibeCoders - Kurukshetra W-PS-2 Engine",
    version="2.0.0"
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class EvidenceItem(BaseModel):
    skill_name: str = Field(description="Name of the skill or technology evaluated.")
    category: str = Field(description="Must be 'Built' for hard code execution or 'Familiarity' for conceptual/ecosystem tools.")
    status: str = Field(description="Status like 'Verified', 'Missing', or 'Talking Point'.")
    explanation: str = Field(description="Detailed explanation citing repo files or missing artifacts.")
    is_red_flag: bool = Field(description="False if conceptual tool is missing; True only if core hard code execution is missing.")

class EvaluationReport(BaseModel):
    candidate_match_score: int = Field(description="Fit score out of 100 based on verified evidence.")
    built_evidence: List[EvidenceItem] = Field(description="Hard code execution items checked against files.")
    familiarity_talking_points: List[EvidenceItem] = Field(description="Conceptual ecosystem items treated as interview prep, not red flags.")
    recruiter_critique: str = Field(description="Factual adversarial recruiter feedback.")
    coach_next_steps: List[str] = Field(description="Actionable milestone recommendations for the student.")

def fetch_github_repo_data(github_url: str) -> str:
    match = re.search(r"github\.com/([^/]+)/([^/]+)", github_url)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL format. Use https://github.com/owner/repo")
    
    owner, repo = match.groups()
    repo = repo.removesuffix(".git")

    headers = {"Accept": "application/vnd.github+json"}
    
    tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/main?recursive=1"
    tree_res = requests.get(tree_url, headers=headers)
    
    if tree_res.status_code != 200:
        tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/master?recursive=1"
        tree_res = requests.get(tree_url, headers=headers)
        
    file_list = []
    if tree_res.status_code == 200:
        tree_data = tree_res.json()
        file_list = [item["path"] for item in tree_data.get("tree", []) if item["type"] == "blob"]

    readme_url = f"https://api.github.com/repos/{owner}/{repo}/readme"
    readme_res = requests.get(readme_url, headers=headers)
    
    readme_content = "No README found."
    if readme_res.status_code == 200:
        readme_data = readme_res.json()
        import base64
        try:
            readme_content = base64.b64decode(readme_data["content"]).decode("utf-8")
        except Exception:
            readme_content = "Could not decode README."

    summary = f"""
    REPOSITORY: {owner}/{repo}
    
    FILE STRUCTURE:
    {'\n'.join(file_list[:100] if file_list else ['No files retrieved'])}

    README.MD CONTENT:
    {readme_content[:3000]}
    """
    return summary

@app.get("/")
def read_root():
    return {
        "status": "Online",
        "team": "DeLuLu VibeCoders",
        "project": "AI Career Coach (W-PS-2 - GitHub Integration)"
    }

@app.post("/api/evaluate-repo", response_model=EvaluationReport)
def evaluate_github_repo(github_url: str, job_description: str):
    repo_summary = fetch_github_repo_data(github_url)

    prompt = f"""
    You are an expert AI Career Coach and Adversarial Recruiter.
    Evaluate the following GitHub repository summary against the target job description.

    JOB DESCRIPTION:
    {job_description}

    GITHUB REPO SUMMARY:
    {repo_summary}

    CRITICAL RULES FOR EVALUATION:
    1. Separate hard code execution claims ("Built") from conceptual ecosystem knowledge ("Familiarity").
    2. Check the actual file list and README content provided above to verify if frameworks/tools are genuinely present.
    3. If a framework or execution tool claimed in the job description is completely absent in the repo file list, mark it as an active missing gap with is_red_flag = True.
    4. If a conceptual tool (like Git, Cloud concepts, Docker, CI/CD) is missing from the files, DO NOT flag it as a red flag/fraud. Treat it as a neutral interview talking point with is_red_flag = False.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=EvaluationReport,
                temperature=0.2,
            ),
        )
        report = EvaluationReport.model_validate_json(response.text)
        return report

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")
