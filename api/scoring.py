import re

def jaccard(a:set, b:set):
    if not a and not b: return 0.0
    return len(a & b) / max(1, len(a | b))

TITLE_BONUS = {
  "software": 4,
  "backend": 5,
  "intern": 6,
  "developer": 3,
  "engineer": 3,
}

LOCATION_KEYWORDS = {"toronto": 5, "ottawa": 5, "canada": 3, "remote": 2}


def score_match(resume_skills:list[str], job:dict):
    rset = set(s.lower() for s in resume_skills)
    text = (job.get("title","") + "\n" + job.get("description",""))
    jlower = text.lower()

    # exact skill hits
    exact_hits = sum(1 for s in rset if s in jlower)

    # fuzzy: split tokens
    tokens = set(re.findall(r"[a-z0-9+.#]+", jlower))
    fuzzy_hits = len(rset & tokens)

    # title/location bonuses
    tbonus = sum(v for k,v in TITLE_BONUS.items() if k in (job.get("title") or "").lower())
    lbonus = sum(v for k,v in LOCATION_KEYWORDS.items() if k in (job.get("location") or "").lower())

    base = exact_hits*5 + fuzzy_hits*2 + tbonus + lbonus
    score = max(0, min(100, base))

    reasons = []
    if exact_hits: reasons.append(f"{exact_hits} exact skill matches")
    if fuzzy_hits: reasons.append(f"{fuzzy_hits} fuzzy matches")
    if tbonus: reasons.append("title match")
    if lbonus: reasons.append("location match")

    return score, "; ".join(reasons) or "heuristic match"
