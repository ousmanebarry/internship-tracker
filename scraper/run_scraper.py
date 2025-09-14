#!/usr/bin/env python3
"""
Run the internship scraper
"""

from scraper import InternshipScraper
import logging
import sys

def main():
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('scraper.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting internship scraper...")
        
        # Create and run scraper
        scraper = InternshipScraper(db_path="internships.db")
        scraper.scrape_all()
        
        logger.info("Scraping completed successfully!")
        
    except KeyboardInterrupt:
        logger.info("Scraping interrupted by user")
    except Exception as e:
        logger.error(f"Scraping failed: {e}", exc_info=True)
    finally:
        if 'scraper' in locals():
            scraper.close()

if __name__ == "__main__":
    main()
