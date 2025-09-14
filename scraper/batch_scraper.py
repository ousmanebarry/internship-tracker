#!/usr/bin/env python3
"""
Batch scraper with resume capability
"""

import json
import os
from datetime import datetime
from scraper import InternshipScraper
import logging
import config

# Set up logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('batch_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

PROGRESS_FILE = "scraper_progress.json"

def load_progress():
    """Load progress from file."""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    return {"processed_ids": [], "last_run": None}

def save_progress(progress):
    """Save progress to file."""
    progress["last_run"] = datetime.utcnow().isoformat()
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f, indent=2)

def batch_scrape_with_resume():
    """Run the scraper with resume capability."""
    logger.info("Starting batch scraper with resume capability...")
    
    # Load previous progress
    progress = load_progress()
    processed_ids = set(progress["processed_ids"])
    
    if processed_ids:
        logger.info(f"Resuming from previous run. Already processed: {len(processed_ids)} internships")
    
    scraper = InternshipScraper()
    
    try:
        # Fetch all internships
        internships = scraper.fetch_internships()
        
        if not internships:
            logger.error("No internships fetched from API")
            return
        
        # Filter internships by date (only May 2025 and newer)
        date_filtered = []
        for internship in internships:
            date_posted = internship.get('date_posted', 0)
            date_updated = internship.get('date_updated', 0)
            # Use the more recent of date_posted or date_updated
            latest_date = max(date_posted, date_updated)
            
            if latest_date >= config.MIN_DATE_TIMESTAMP:
                date_filtered.append(internship)
        
        # Filter out already processed internships
        remaining = [i for i in date_filtered if i['id'] not in processed_ids]
        
        logger.info(f"Total internships: {len(internships)}")
        logger.info(f"Date filtered (May 2025+): {len(date_filtered)}")
        logger.info(f"Already processed: {len(processed_ids)}")
        logger.info(f"Remaining to process: {len(remaining)}")
        
        if not remaining:
            logger.info("All internships have been processed!")
            return
        
        # Process remaining internships
        for i, internship in enumerate(remaining):
            try:
                logger.info(f"Processing {i+1}/{len(remaining)}: {internship['company_name']} - {internship['title']}")
                
                # Scrape job description
                job_description = scraper.scrape_job_description(internship['url'])
                
                if job_description:
                    # Extract keywords
                    keywords = scraper.extract_keywords(job_description)
                    internship['keywords'] = keywords
                    logger.info(f"Found {len(keywords)} keywords")
                else:
                    internship['keywords'] = []
                    logger.warning(f"Could not scrape description for {internship['url']}")
                
                # Save to database
                scraper.save_internship(internship)
                
                # Mark as processed
                processed_ids.add(internship['id'])
                progress["processed_ids"] = list(processed_ids)
                save_progress(progress)
                
                # Random delay between requests
                if i < len(remaining) - 1:
                    import random
                    import time
                    delay = random.uniform(config.MIN_DELAY, config.MAX_DELAY)
                    logger.info(f"Waiting {delay:.2f} seconds before next request...")
                    time.sleep(delay)
                
            except KeyboardInterrupt:
                logger.info("Scraping interrupted by user. Progress saved.")
                save_progress(progress)
                raise
            except Exception as e:
                logger.error(f"Error processing internship {internship.get('id', 'unknown')}: {e}")
                continue
        
        logger.info("Batch scraping completed!")
        
    except KeyboardInterrupt:
        logger.info("Scraping interrupted by user")
    except Exception as e:
        logger.error(f"Batch scraping failed: {e}", exc_info=True)
    finally:
        scraper.close()

def reset_progress():
    """Reset the progress file."""
    if os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)
        logger.info("Progress file reset")
    else:
        logger.info("No progress file found")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "reset":
        reset_progress()
    else:
        batch_scrape_with_resume()
