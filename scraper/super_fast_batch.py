#!/usr/bin/env python3
"""
Super fast batch scraper with resume capability and aggressive optimizations
"""

import json
import os
from datetime import datetime
from fast_scraper import FastInternshipScraper
import logging
import config
import sys

# Set up logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('super_fast_batch.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

PROGRESS_FILE = "fast_scraper_progress.json"

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

def super_fast_scrape_with_resume():
    """Run the super fast scraper with resume capability."""
    logger.info("Starting SUPER FAST batch scraper with resume capability...")
    
    # Load previous progress
    progress = load_progress()
    processed_ids = set(progress["processed_ids"])
    
    if processed_ids:
        logger.info(f"Resuming from previous run. Already processed: {len(processed_ids)} internships")
    
    scraper = FastInternshipScraper(max_workers=config.CONCURRENT_WORKERS)
    
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
        
        # Process in smaller batches for better progress tracking
        batch_size = 50  # Process 50 at a time for better progress tracking
        total_batches = len(remaining) // batch_size + (1 if len(remaining) % batch_size else 0)
        
        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min(start_idx + batch_size, len(remaining))
            batch = remaining[start_idx:end_idx]
            
            logger.info(f"Processing batch {batch_num + 1}/{total_batches} ({len(batch)} internships)")
            
            try:
                # Process this batch
                results = scraper.process_internship_batch(batch, batch_num)
                
                # Save results
                if results:
                    scraper.save_internships_batch(results)
                    
                    # Update progress
                    for result in results:
                        processed_ids.add(result['id'])
                    
                    progress["processed_ids"] = list(processed_ids)
                    save_progress(progress)
                    
                    logger.info(f"Batch {batch_num + 1} completed. Total processed: {len(processed_ids)}")
                
            except KeyboardInterrupt:
                logger.info("Scraping interrupted by user. Progress saved.")
                save_progress(progress)
                raise
            except Exception as e:
                logger.error(f"Error processing batch {batch_num + 1}: {e}")
                continue
        
        logger.info("Super fast batch scraping completed!")
        
    except KeyboardInterrupt:
        logger.info("Scraping interrupted by user")
    except Exception as e:
        logger.error(f"Super fast batch scraping failed: {e}", exc_info=True)
    finally:
        scraper.close()

def reset_progress():
    """Reset the progress file."""
    if os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)
        logger.info("Fast scraper progress file reset")
    else:
        logger.info("No fast scraper progress file found")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "reset":
        reset_progress()
    else:
        super_fast_scrape_with_resume()
