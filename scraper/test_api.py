#!/usr/bin/env python3
"""
Test script to verify API access and basic functionality
"""

import requests
import json
from scraper import InternshipScraper

def test_api():
    """Test if the API is accessible and returns data."""
    print("Testing API access...")
    
    try:
        response = requests.get("https://jobs.cvrve.me/api/intern")
        response.raise_for_status()
        
        data = response.json()
        print(f"✓ API is accessible")
        print(f"✓ Found {len(data)} internships")
        
        if data:
            print(f"\nFirst internship:")
            print(json.dumps(data[0], indent=2))
        
        return True
        
    except Exception as e:
        print(f"✗ API test failed: {e}")
        return False

def test_keyword_extraction():
    """Test keyword extraction functionality."""
    print("\n\nTesting keyword extraction...")
    
    scraper = InternshipScraper()
    
    test_text = """
    We are looking for a Software Engineering Intern with experience in Python, 
    machine learning, and cloud technologies like AWS. The ideal candidate should 
    have strong problem-solving skills and experience with React, Node.js, and 
    data analysis using pandas and numpy. Knowledge of Docker and Kubernetes is a plus.
    """
    
    keywords = scraper.extract_keywords(test_text)
    
    print(f"✓ Extracted {len(keywords)} keywords:")
    print(f"  Keywords: {', '.join(keywords)}")
    
    scraper.close()
    
    return len(keywords) > 0

def test_single_scrape():
    """Test scraping a single URL."""
    print("\n\nTesting single URL scrape...")
    
    scraper = InternshipScraper()
    
    # Use a simple test URL (you can replace with an actual job URL)
    test_url = "https://example.com"
    
    try:
        description = scraper.scrape_job_description(test_url)
        if description:
            print(f"✓ Successfully scraped content ({len(description)} characters)")
            print(f"  First 200 chars: {description[:200]}...")
        else:
            print("✗ No content scraped (this might be normal for example.com)")
    except Exception as e:
        print(f"✗ Scraping test failed: {e}")
    
    scraper.close()

if __name__ == "__main__":
    print("Running scraper tests...\n")
    
    # Test API
    api_ok = test_api()
    
    # Test keyword extraction
    keywords_ok = test_keyword_extraction()
    
    # Test URL scraping
    test_single_scrape()
    
    print("\n\nTest summary:")
    print(f"API access: {'✓ PASS' if api_ok else '✗ FAIL'}")
    print(f"Keyword extraction: {'✓ PASS' if keywords_ok else '✗ FAIL'}")
