import random, string
from faker import Faker
from db import execute, query

fake = Faker()

USERS = 750
RESUMES = 350
JOBS = 12000
MATCHES = 1100

skills_pool = [
  "typescript","javascript","react","next.js","python","flask","postgresql",
  "selenium","beautifulsoup","spacy","redis","docker","kubernetes","aws","gcp","azure"
]

print("Seeding users...")
for _ in range(USERS):
    email = fake.unique.email()
    execute("INSERT INTO users(email) VALUES(%s) ON CONFLICT DO NOTHING", (email,))

uids = [r[0] for r in query("SELECT id FROM users")]

print("Seeding resumes...")
for _ in range(RESUMES):
    uid = random.choice(uids)
    sk = random.sample(skills_pool, k=random.randint(5,10))
    text = "Resume with skills: " + ", ".join(sk)
    execute("INSERT INTO resumes(user_id,text,skills) VALUES(%s,%s,%s)", (uid, text, sk))

print("Seeding jobs...")
for i in range(JOBS):
    title = random.choice(["Backend Developer Intern","Software Engineer Intern","Full-Stack Intern"]) + f" {i}"
    company = random.choice(["Acme Inc","Globex Corp","Initech","Umbrella Co"])
    location = random.choice(["Toronto, ON","Ottawa, ON","Remote - Canada","Montreal, QC"])
    desc = f"Looking for skills: {', '.join(random.sample(skills_pool, k=6))}"
    url = f"https://jobs.example.com/{i}"
    execute("""
        INSERT INTO jobs(source,url,title,company,location,description,raw)
        VALUES(%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (url) DO NOTHING
    """, ("seed", url, title, company, location, desc, {"seed": True}))

print("Seeding matches...")
res_ids = [r[0] for r in query("SELECT id FROM resumes")]
job_ids = [r[0] for r in query("SELECT id FROM jobs")]

cnt = 0
while cnt < MATCHES:
    rid = random.choice(res_ids)
    jid = random.choice(job_ids)
    score = random.randint(60, 98)
    execute("INSERT INTO matches(resume_id,job_id,score,reasons) VALUES(%s,%s,%s,%s)", (rid, jid, score, "seeded"))
    cnt += 1

print("Done.")
