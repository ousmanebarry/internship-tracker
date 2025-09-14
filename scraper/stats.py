#!/usr/bin/env python3
"""
Display statistics about scraped internships
"""

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from scraper import Internship
import config
from collections import Counter
import json

def display_stats(db_path: str = None):
    """Display statistics about the scraped internships."""
    if db_path is None:
        db_path = config.DATABASE_PATH
        
    engine = create_engine(f'sqlite:///{db_path}')
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Total internships
        total = session.query(func.count(Internship.id)).scalar()
        print(f"\n{'='*50}")
        print(f"INTERNSHIP DATABASE STATISTICS")
        print(f"{'='*50}")
        print(f"\nTotal internships: {total}")
        
        if total == 0:
            print("No internships in database yet.")
            return
        
        # Internships with keywords
        with_keywords = session.query(func.count(Internship.id)).filter(
            Internship.keywords != None,
            Internship.keywords != '[]'
        ).scalar()
        print(f"Internships with keywords: {with_keywords} ({with_keywords/total*100:.1f}%)")
        
        # Companies
        companies = session.query(Internship.company_name, func.count(Internship.id))\
            .group_by(Internship.company_name)\
            .order_by(func.count(Internship.id).desc())\
            .limit(10).all()
        
        print(f"\nTop 10 Companies by Number of Positions:")
        for i, (company, count) in enumerate(companies, 1):
            print(f"  {i}. {company}: {count} position(s)")
        
        # Locations
        all_locations = []
        internships = session.query(Internship.locations).all()
        for (locations,) in internships:
            if locations:
                all_locations.extend(locations)
        
        location_counts = Counter(all_locations)
        print(f"\nTop 10 Locations:")
        for i, (location, count) in enumerate(location_counts.most_common(10), 1):
            print(f"  {i}. {location}: {count} position(s)")
        
        # Seasons
        seasons = session.query(Internship.season, func.count(Internship.id))\
            .group_by(Internship.season)\
            .order_by(func.count(Internship.id).desc()).all()
        
        print(f"\nSeasons:")
        for season, count in seasons:
            print(f"  {season}: {count} position(s)")
        
        # Sponsorship
        sponsorships = session.query(Internship.sponsorship, func.count(Internship.id))\
            .group_by(Internship.sponsorship)\
            .order_by(func.count(Internship.id).desc()).all()
        
        print(f"\nSponsorship Status:")
        for sponsorship, count in sponsorships:
            print(f"  {sponsorship}: {count} position(s)")
        
        # Most common keywords
        all_keywords = []
        keyword_internships = session.query(Internship.keywords).filter(
            Internship.keywords != None,
            Internship.keywords != '[]'
        ).all()
        
        for (keywords,) in keyword_internships:
            if keywords:
                if isinstance(keywords, str):
                    keywords = json.loads(keywords)
                all_keywords.extend(keywords)
        
        if all_keywords:
            keyword_counts = Counter(all_keywords)
            print(f"\nTop 20 Keywords:")
            for i, (keyword, count) in enumerate(keyword_counts.most_common(20), 1):
                print(f"  {i}. {keyword}: {count} occurrences")
        
        # Recent scrapes
        recent = session.query(Internship)\
            .order_by(Internship.scraped_at.desc())\
            .limit(5).all()
        
        print(f"\nMost Recently Scraped:")
        for internship in recent:
            print(f"  - {internship.company_name} - {internship.title}")
            print(f"    Scraped at: {internship.scraped_at}")
        
    finally:
        session.close()

def keyword_analysis(db_path: str = None):
    """Analyze keyword combinations and patterns."""
    if db_path is None:
        db_path = config.DATABASE_PATH
        
    engine = create_engine(f'sqlite:///{db_path}')
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print(f"\n{'='*50}")
        print(f"KEYWORD COMBINATION ANALYSIS")
        print(f"{'='*50}")
        
        # Common keyword pairs
        keyword_pairs = Counter()
        
        internships = session.query(Internship.keywords).filter(
            Internship.keywords != None,
            Internship.keywords != '[]'
        ).all()
        
        for (keywords,) in internships:
            if keywords:
                if isinstance(keywords, str):
                    keywords = json.loads(keywords)
                # Create pairs
                for i in range(len(keywords)):
                    for j in range(i+1, len(keywords)):
                        pair = tuple(sorted([keywords[i], keywords[j]]))
                        keyword_pairs[pair] += 1
        
        print(f"\nTop 15 Keyword Pairs:")
        for i, (pair, count) in enumerate(keyword_pairs.most_common(15), 1):
            print(f"  {i}. {pair[0]} + {pair[1]}: {count} occurrences")
        
        # Skills by category
        categories = {
            "Programming Languages": ["python", "java", "javascript", "c++", "go", "rust", "ruby", "php"],
            "Frontend": ["react", "angular", "vue", "html", "css", "javascript", "typescript"],
            "Backend": ["node.js", "django", "flask", "spring", "express", "rails"],
            "Data/ML": ["machine learning", "data science", "tensorflow", "pytorch", "pandas", "numpy"],
            "Cloud": ["aws", "azure", "gcp", "docker", "kubernetes"],
            "Databases": ["sql", "postgresql", "mysql", "mongodb", "redis"]
        }
        
        print(f"\nSkills by Category:")
        all_keywords = []
        for (keywords,) in internships:
            if keywords:
                if isinstance(keywords, str):
                    keywords = json.loads(keywords)
                all_keywords.extend(keywords)
        
        keyword_counts = Counter(all_keywords)
        
        for category, skills in categories.items():
            category_total = sum(keyword_counts[skill] for skill in skills if skill in keyword_counts)
            if category_total > 0:
                print(f"\n{category}:")
                for skill in skills:
                    if skill in keyword_counts:
                        count = keyword_counts[skill]
                        print(f"  - {skill}: {count}")
        
    finally:
        session.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "keywords":
        keyword_analysis()
    else:
        display_stats()
