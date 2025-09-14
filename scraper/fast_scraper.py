#!/usr/bin/env python3
"""
Fast concurrent scraper for internships
"""

import json
import time
import random
import requests
import spacy
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager
from sqlalchemy import create_engine, Column, String, Boolean, Integer, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from fake_useragent import UserAgent
import logging
import re
from typing import List, Dict, Any, Optional
import config
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from queue import Queue

# Set up logging
logging.basicConfig(level=getattr(logging, config.LOG_LEVEL), 
                   format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database setup
Base = declarative_base()

class Internship(Base):
    __tablename__ = 'internships'
    
    id = Column(String, primary_key=True)
    active = Column(Boolean)
    company_name = Column(String)
    date_posted = Column(Integer)
    date_updated = Column(Integer)
    is_visible = Column(Boolean)
    locations = Column(JSON)
    season = Column(String)
    sponsorship = Column(String)
    title = Column(String)
    url = Column(String)
    keywords = Column(JSON)
    xata = Column(JSON)
    scraped_at = Column(DateTime, default=datetime.utcnow)

class FastInternshipScraper:
    def __init__(self, db_path: str = None, max_workers: int = None):
        """Initialize the fast scraper with concurrent processing."""
        # Database setup
        if db_path is None:
            db_path = config.DATABASE_PATH
        self.engine = create_engine(f'sqlite:///{db_path}', 
                                   pool_pre_ping=True, 
                                   connect_args={'check_same_thread': False})
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session_factory = Session
        
        # Load spaCy model
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except:
            logger.info("Downloading spaCy model...")
            import subprocess
            subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"])
            self.nlp = spacy.load("en_core_web_sm")
        
        # User agent for requests
        self.ua = UserAgent()
        
        # Concurrent settings
        self.max_workers = max_workers or config.CONCURRENT_WORKERS
        self.driver_pool = Queue()
        self.lock = threading.Lock()
        
        # Results queue for batch database saves
        self.results_queue = Queue()
        
    def setup_selenium(self) -> webdriver.Chrome:
        """Set up optimized Selenium WebDriver for speed."""
        options = Options()
        if config.HEADLESS:
            options.add_argument('--headless')
        
        # Speed optimizations
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('--disable-gpu')
        options.add_argument('--disable-web-security')
        options.add_argument('--disable-features=VizDisplayCompositor')
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-plugins')
        options.add_argument('--disable-images')  # Don't load images for speed
        options.add_argument('--disable-javascript')  # Disable JS if not needed
        options.add_argument('--disable-css')  # Disable CSS loading
        options.add_argument(f'--window-size={config.WINDOW_SIZE}')
        options.add_argument(f'user-agent={self.ua.random}')
        
        # Additional performance settings
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        options.add_experimental_option("prefs", {
            "profile.managed_default_content_settings.images": 2,  # Block images
            "profile.default_content_setting_values.notifications": 2,  # Block notifications
        })
        
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        
        # Set aggressive timeouts
        driver.set_page_load_timeout(config.PAGE_LOAD_TIMEOUT)
        driver.implicitly_wait(1)
        
        # Execute script to remove webdriver property
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        return driver
    
    def get_driver(self) -> webdriver.Chrome:
        """Get a driver from the pool or create a new one."""
        try:
            return self.driver_pool.get_nowait()
        except:
            return self.setup_selenium()
    
    def return_driver(self, driver: webdriver.Chrome):
        """Return a driver to the pool."""
        try:
            self.driver_pool.put_nowait(driver)
        except:
            driver.quit()
    
    def fetch_internships(self, api_url: str = None) -> List[Dict[str, Any]]:
        """Fetch internship data from the API."""
        if api_url is None:
            api_url = config.API_URL
        try:
            headers = {'User-Agent': self.ua.random}
            response = requests.get(api_url, headers=headers, timeout=10)
            response.raise_for_status()
            internships = response.json()
            logger.info(f"Fetched {len(internships)} internships from API")
            return internships
        except Exception as e:
            logger.error(f"Error fetching internships: {e}")
            return []
    
    def scrape_job_description(self, url: str, driver: webdriver.Chrome) -> Optional[str]:
        """Scrape job description from a given URL using provided driver."""
        try:
            # Minimal delay for aggressive scraping
            if config.FAST_MODE:
                time.sleep(random.uniform(0.1, 0.3))
            else:
                time.sleep(random.uniform(config.MIN_DELAY, config.MAX_DELAY))
            
            driver.get(url)
            
            # Quick wait for basic content
            time.sleep(0.5)
            
            job_description = ""
            
            # Try CSS selectors from config (with timeout)
            for selector in config.JOB_DESCRIPTION_SELECTORS[:5]:  # Only try first 5 for speed
                try:
                    elements = driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text.strip()
                        if len(text) > len(job_description) and len(text) > 50:
                            job_description = text
                            break
                except:
                    continue
                
                if job_description and len(job_description) > 200:
                    break
            
            # Fallback to body text if nothing found
            if not job_description:
                try:
                    body = driver.find_element(By.TAG_NAME, "body")
                    job_description = body.text[:2000]  # Limit to first 2000 chars
                except:
                    pass
            
            # Clean up the description
            if job_description:
                job_description = re.sub(r'\s+', ' ', job_description)
                job_description = job_description.strip()
            
            return job_description if job_description else None
            
        except TimeoutException:
            logger.debug(f"Timeout while loading {url}")
            return None
        except WebDriverException as e:
            logger.debug(f"WebDriver error for {url}: {e}")
            return None
        except Exception as e:
            logger.debug(f"Error scraping {url}: {e}")
            return None
    
    def extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text using spaCy (optimized)."""
        if not text or len(text) < 10:
            return []
        
        # Limit text length for speed
        text = text[:3000]  # Only process first 3000 characters
        
        # Process text with spaCy
        doc = self.nlp(text.lower())
        
        # Keywords from config
        tech_keywords = config.TECH_KEYWORDS
        
        found_keywords = set()
        
        # Quick keyword matching
        text_lower = text.lower()
        for keyword in tech_keywords:
            if keyword in text_lower:
                found_keywords.add(keyword)
        
        return list(found_keywords)
    
    def process_internship_batch(self, internships: List[Dict[str, Any]], worker_id: int) -> List[Dict[str, Any]]:
        """Process a batch of internships with a single driver."""
        driver = self.get_driver()
        results = []
        
        try:
            for i, internship in enumerate(internships):
                try:
                    logger.info(f"Worker {worker_id}: Processing {i+1}/{len(internships)} - {internship['company_name']}")
                    
                    # Scrape job description
                    job_description = self.scrape_job_description(internship['url'], driver)
                    
                    if job_description:
                        # Extract keywords
                        keywords = self.extract_keywords(job_description)
                        internship['keywords'] = keywords
                        logger.debug(f"Found {len(keywords)} keywords")
                    else:
                        internship['keywords'] = []
                        logger.debug(f"Could not scrape description for {internship['url']}")
                    
                    results.append(internship)
                    
                except Exception as e:
                    logger.error(f"Worker {worker_id}: Error processing {internship.get('id', 'unknown')}: {e}")
                    internship['keywords'] = []
                    results.append(internship)
                    continue
        
        finally:
            self.return_driver(driver)
        
        return results
    
    def save_internships_batch(self, internships: List[Dict[str, Any]]):
        """Save multiple internships to database in a batch."""
        session = self.session_factory()
        try:
            for internship_data in internships:
                try:
                    existing = session.query(Internship).filter_by(id=internship_data['id']).first()
                    
                    if existing:
                        # Update existing record
                        for key, value in internship_data.items():
                            setattr(existing, key, value)
                        existing.scraped_at = datetime.utcnow()
                    else:
                        # Create new record
                        internship = Internship(**internship_data)
                        session.add(internship)
                
                except Exception as e:
                    logger.error(f"Error preparing internship for save: {e}")
                    continue
            
            session.commit()
            logger.info(f"Saved batch of {len(internships)} internships")
            
        except Exception as e:
            logger.error(f"Error saving batch: {e}")
            session.rollback()
        finally:
            session.close()
    
    def scrape_all_fast(self):
        """Main method to scrape all internships using concurrent processing."""
        logger.info("Starting FAST internship scraper...")
        
        # Fetch internships from API
        internships = self.fetch_internships()
        
        if not internships:
            logger.error("No internships fetched from API")
            return
        
        # Filter internships by date (only May 2025 and newer)
        filtered_internships = []
        for internship in internships:
            date_posted = internship.get('date_posted', 0)
            date_updated = internship.get('date_updated', 0)
            latest_date = max(date_posted, date_updated)
            
            if latest_date >= config.MIN_DATE_TIMESTAMP:
                filtered_internships.append(internship)
        
        logger.info(f"Total internships from API: {len(internships)}")
        logger.info(f"Internships from May 2025 or newer: {len(filtered_internships)}")
        
        if not filtered_internships:
            logger.warning("No internships found that meet the date criteria")
            return
        
        # Split internships into batches for concurrent processing
        batch_size = max(1, len(filtered_internships) // self.max_workers)
        batches = [filtered_internships[i:i + batch_size] 
                  for i in range(0, len(filtered_internships), batch_size)]
        
        logger.info(f"Processing {len(filtered_internships)} internships in {len(batches)} batches using {self.max_workers} workers")
        
        # Process batches concurrently
        all_results = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_batch = {
                executor.submit(self.process_internship_batch, batch, i): i 
                for i, batch in enumerate(batches)
            }
            
            for future in as_completed(future_to_batch):
                worker_id = future_to_batch[future]
                try:
                    results = future.result()
                    all_results.extend(results)
                    logger.info(f"Worker {worker_id} completed batch ({len(results)} internships)")
                    
                    # Save results in batches as they complete
                    if results:
                        self.save_internships_batch(results)
                        
                except Exception as e:
                    logger.error(f"Worker {worker_id} generated an exception: {e}")
        
        logger.info(f"Fast scraping completed! Processed {len(all_results)} internships")
    
    def close(self):
        """Clean up resources."""
        # Close all drivers in pool
        while not self.driver_pool.empty():
            try:
                driver = self.driver_pool.get_nowait()
                driver.quit()
            except:
                break

if __name__ == "__main__":
    scraper = FastInternshipScraper()
    try:
        scraper.scrape_all_fast()
    finally:
        scraper.close()

