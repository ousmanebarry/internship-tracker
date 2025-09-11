import io
import re
import docx
from pdfminer.high_level import extract_text as pdf_extract

SKILL_KEYWORDS = {
  # Lightweight, expand as needed
  "typescript","javascript","react","next.js","python","flask",
  "postgresql","sql","selenium","beautifulsoup","spacy","docker",
  "kubernetes","aws","gcp","azure","redis","linux","git","ci/cd"
}


def extract_text_from_upload(file_storage) -> str:
    if not file_storage:
        return ""
    filename = (file_storage.filename or "").lower()
    data = file_storage.read()
    if filename.endswith(".pdf"):
        return pdf_extract(io.BytesIO(data))
    if filename.endswith(".docx"):
        doc = docx.Document(io.BytesIO(data))
        return "\n".join([p.text for p in doc.paragraphs])
    # fallback as plain text
    return data.decode("utf-8", errors="ignore")


def extract_skills_from_text(text: str):
    # simple keyword match + noun chunk heuristic placeholder
    found = set()
    lower = text.lower()
    for k in SKILL_KEYWORDS:
        if k in lower:
            found.add(k)
    # normalize to title-ish for display
    return sorted(found)
