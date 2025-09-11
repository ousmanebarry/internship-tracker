import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from db import execute, query
from extract import extract_text_from_upload, extract_skills_from_text
from scraping import fetch_html, parse_job_html
from scoring import score_match

load_dotenv()
app = Flask(__name__)
CORS(app, origins=os.getenv("CORS_ORIGINS", "*").split(","))

# --- Helpers ---

def upsert_job(job: dict):
    execute("""
        INSERT INTO jobs(source,url,title,company,location,description,raw)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (url) DO UPDATE SET
          source=EXCLUDED.source,
          title=EXCLUDED.title,
          company=EXCLUDED.company,
          location=EXCLUDED.location,
          description=EXCLUDED.description,
          raw=EXCLUDED.raw
    """, (
        job.get("source"), job.get("url"), job.get("title"), job.get("company"),
        job.get("location"), job.get("description"), job
    ))
    # return id
    rows = query("SELECT id FROM jobs WHERE url=%s", (job.get("url"),))
    return rows[0][0]

# --- Routes ---

@app.post("/ingest/resume")
def ingest_resume():
    f = request.files.get("file")
    email = request.form.get("email", "demo@example.com")
    text = extract_text_from_upload(f)
    skills = extract_skills_from_text(text)

    # ensure user exists
    execute("INSERT INTO users(email) VALUES(%s) ON CONFLICT DO NOTHING", (email,))
    uid = query("SELECT id FROM users WHERE email=%s", (email,))[0][0]

    execute("INSERT INTO resumes(user_id, text, skills) VALUES(%s,%s,%s)", (uid, text, skills))
    rid = query("SELECT id FROM resumes WHERE user_id=%s ORDER BY parsed_at DESC LIMIT 1", (uid,))[0][0]

    return jsonify({"resume_id": str(rid), "skills": skills})

@app.post("/scrape/jobs")
def scrape_jobs():
    payload = request.get_json(force=True)
    urls = payload.get("urls", [])
    ids = []
    for u in urls:
        html = fetch_html(u)
        job = parse_job_html(u, html)
        jid = upsert_job(job)
        ids.append(str(jid))
    return jsonify({"job_ids": ids})

@app.post("/match/scores")
def match_scores():
    body = request.get_json(force=True)
    resume_id = body["resume_id"]
    job_ids = body.get("job_ids", [])

    rows = query("SELECT text, skills FROM resumes WHERE id=%s", (resume_id,))
    if not rows:
        return jsonify({"error": "resume not found"}), 404
    skills = rows[0][1] or []

    results = []
    for jid in job_ids:
        j = query("SELECT title,company,location,description,url,source FROM jobs WHERE id=%s", (jid,))
        if not j:
            continue
        job = {"title": j[0][0], "company": j[0][1], "location": j[0][2], "description": j[0][3], "url": j[0][4], "source": j[0][5]}
        score, reasons = score_match(skills, job)
        execute("INSERT INTO matches(resume_id,job_id,score,reasons) VALUES (%s,%s,%s,%s)", (resume_id, jid, score, reasons))
        results.append({"job_id": jid, "score": score, "reasons": reasons, "job": job})
    # sort high to low
    results.sort(key=lambda x: x["score"], reverse=True)
    return jsonify({"matches": results})

@app.get("/stats")
def stats():
    jobs = query("SELECT COUNT(*) FROM jobs")[0][0]
    resumes = query("SELECT COUNT(*) FROM resumes")[0][0]
    matches = query("SELECT COUNT(*) FROM matches")[0][0]
    users = query("SELECT COUNT(*) FROM users")[0][0]
    return jsonify({"users": users, "resumes": resumes, "jobs": jobs, "matches": matches})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5001)))
