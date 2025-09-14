#!/usr/bin/env python3
"""
View scraped internship data from the database
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from scraper import Internship
import json

def view_internships(db_path: str = "internships.db"):
    """View all internships in the database."""
    engine = create_engine(f'sqlite:///{db_path}')
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        internships = session.query(Internship).all()
        
        print(f"\nTotal internships in database: {len(internships)}\n")
        
        for i, internship in enumerate(internships, 1):
            print(f"{i}. {internship.company_name} - {internship.title}")
            print(f"   Location(s): {', '.join(internship.locations)}")
            print(f"   Season: {internship.season}")
            print(f"   Sponsorship: {internship.sponsorship}")
            print(f"   URL: {internship.url}")
            
            if internship.keywords:
                print(f"   Keywords ({len(internship.keywords)}): {', '.join(internship.keywords[:10])}")
                if len(internship.keywords) > 10:
                    print(f"   ... and {len(internship.keywords) - 10} more")
            else:
                print("   Keywords: None found")
            
            print(f"   Scraped at: {internship.scraped_at}")
            print()
        
    finally:
        session.close()

def export_to_json(db_path: str = "internships.db", output_file: str = "internships.json"):
    """Export internships to JSON file."""
    engine = create_engine(f'sqlite:///{db_path}')
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        internships = session.query(Internship).all()
        
        data = []
        for internship in internships:
            data.append({
                'id': internship.id,
                'company_name': internship.company_name,
                'title': internship.title,
                'locations': internship.locations,
                'season': internship.season,
                'sponsorship': internship.sponsorship,
                'url': internship.url,
                'keywords': internship.keywords,
                'active': internship.active,
                'is_visible': internship.is_visible,
                'date_posted': internship.date_posted,
                'date_updated': internship.date_updated,
                'xata': internship.xata,
                'scraped_at': internship.scraped_at.isoformat() if internship.scraped_at else None
            })
        
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"Exported {len(data)} internships to {output_file}")
        
    finally:
        session.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "export":
        export_to_json()
    else:
        view_internships()
