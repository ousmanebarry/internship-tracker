#!/usr/bin/env python3
"""
Run the fast concurrent scraper
"""

from fast_scraper import FastInternshipScraper
import logging
import sys
import config

def main():
    # Set up logging
    logging.basicConfig(
        level=getattr(logging, config.LOG_LEVEL),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('fast_scraper.log'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting FAST internship scraper...")
        logger.info(f"Configuration: {config.CONCURRENT_WORKERS} workers, {config.MIN_DELAY}-{config.MAX_DELAY}s delays")
        
        # Create and run fast scraper
        scraper = FastInternshipScraper(max_workers=config.CONCURRENT_WORKERS)
        scraper.scrape_all_fast()
        
        logger.info("Fast scraping completed successfully!")
        
    except KeyboardInterrupt:
        logger.info("Fast scraping interrupted by user")
    except Exception as e:
        logger.error(f"Fast scraping failed: {e}", exc_info=True)
    finally:
        if 'scraper' in locals():
            scraper.close()

if __name__ == "__main__":
    main()
