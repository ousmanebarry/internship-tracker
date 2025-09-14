#!/usr/bin/env python3
"""
Check internship dates and filtering
"""

import requests
from datetime import datetime
import config

def check_dates():
    """Check the dates of internships and see filtering results."""
    print("Fetching internships from API...")
    
    try:
        response = requests.get(config.API_URL)
        response.raise_for_status()
        internships = response.json()
        
        print(f"Total internships: {len(internships)}")
        
        # Analyze dates
        date_counts = {}
        may_2025_count = 0
        
        for internship in internships:
            date_posted = internship.get('date_posted', 0)
            date_updated = internship.get('date_updated', 0)
            latest_date = max(date_posted, date_updated)
            
            if latest_date > 0:
                dt = datetime.fromtimestamp(latest_date)
                month_year = f"{dt.strftime('%B')} {dt.year}"
                date_counts[month_year] = date_counts.get(month_year, 0) + 1
                
                if latest_date >= config.MIN_DATE_TIMESTAMP:
                    may_2025_count += 1
        
        print(f"\nInternships by month/year:")
        for month_year in sorted(date_counts.keys(), key=lambda x: datetime.strptime(x, '%B %Y')):
            print(f"  {month_year}: {date_counts[month_year]}")
        
        print(f"\nFiltering results:")
        print(f"  May 2025 timestamp threshold: {config.MIN_DATE_TIMESTAMP}")
        print(f"  May 2025 date: {datetime.fromtimestamp(config.MIN_DATE_TIMESTAMP)}")
        print(f"  Internships >= May 2025: {may_2025_count}")
        print(f"  Percentage kept: {may_2025_count/len(internships)*100:.1f}%")
        
        # Show some examples
        print(f"\nFirst 5 internships that will be processed:")
        count = 0
        for internship in internships:
            date_posted = internship.get('date_posted', 0)
            date_updated = internship.get('date_updated', 0)
            latest_date = max(date_posted, date_updated)
            
            if latest_date >= config.MIN_DATE_TIMESTAMP and count < 5:
                dt = datetime.fromtimestamp(latest_date)
                print(f"  {internship['company_name']} - {internship['title']}")
                print(f"    Date: {dt.strftime('%Y-%m-%d %H:%M:%S')}")
                count += 1
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_dates()
