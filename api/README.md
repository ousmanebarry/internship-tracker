# Internship Tracker API

## Setup

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# start Postgres locally or set DATABASE_URL, then run schema

psql "$DATABASE_URL" -f schema.sql

# run

export FLASK_RUN_PORT=5001
python app.py
