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
from bs4 import BeautifulSoup
from sqlalchemy import create_engine, Column, String, Boolean, Integer, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from fake_useragent import UserAgent
import logging
import re
from typing import List, Dict, Any, Optional
import config

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

class InternshipScraper:
    def __init__(self, db_path: str = None):
        """Initialize the scraper with database and NLP model."""
        # Database setup
        if db_path is None:
            db_path = config.DATABASE_PATH
        self.engine = create_engine(f'sqlite:///{db_path}')
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
        
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
        
        # Selenium setup
        self.driver = None
        
    def setup_selenium(self) -> webdriver.Chrome:
        """Set up Selenium WebDriver with anti-detection measures."""
        options = Options()
        if config.HEADLESS:
            options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        options.add_argument(f'user-agent={self.ua.random}')
        
        # Additional anti-detection measures
        options.add_argument('--disable-gpu')
        options.add_argument(f'--window-size={config.WINDOW_SIZE}')
        
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        
        # Execute script to remove webdriver property
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        return driver
    
    def fetch_internships(self, api_url: str = None) -> List[Dict[str, Any]]:
        """Fetch internship data from the API."""
        if api_url is None:
            api_url = config.API_URL
        try:
            headers = {'User-Agent': self.ua.random}
            response = requests.get(api_url, headers=headers)
            response.raise_for_status()
            internships = response.json()
            logger.info(f"Fetched {len(internships)} internships from API")
            return internships
        except Exception as e:
            logger.error(f"Error fetching internships: {e}")
            return []
    
    def scrape_job_description(self, url: str) -> Optional[str]:
        """Scrape job description from a given URL using Selenium."""
        try:
            if not self.driver:
                self.driver = self.setup_selenium()
            
            # Add random delay to avoid rate limiting
            time.sleep(random.uniform(config.MIN_DELAY, config.MAX_DELAY))
            
            self.driver.get(url)
            
            # Wait for page to load
            wait = WebDriverWait(self.driver, config.PAGE_LOAD_TIMEOUT)
            
            # Try different selectors for job description
            job_description = ""
            
            # Try CSS selectors from config
            for selector in config.JOB_DESCRIPTION_SELECTORS:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text.strip()
                        if len(text) > len(job_description) and len(text) > 100:
                            job_description = text
                except:
                    continue
                
                if job_description and len(job_description) > 500:
                    break
            
            # If no specific selector worked, get all text from body
            if not job_description:
                try:
                    body = self.driver.find_element(By.TAG_NAME, "body")
                    job_description = body.text
                except:
                    pass
            
            # Clean up the description
            if job_description:
                # Remove excessive whitespace
                job_description = re.sub(r'\s+', ' ', job_description)
                job_description = job_description.strip()
            
            return job_description if job_description else None
            
        except TimeoutException:
            logger.warning(f"Timeout while loading {url}")
            return None
        except WebDriverException as e:
            logger.error(f"WebDriver error for {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")
            return None
    
    def extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text using spaCy."""
        if not text:
            return []
        
        # Process text with spaCy
        doc = self.nlp(text.lower())
        
        # Keywords to look for from config
        tech_keywords = config.TECH_KEYWORDS
        
        found_keywords = set()
        
        # Check for exact matches and partial matches
        text_lower = text.lower()
        for keyword in tech_keywords:
            if keyword in text_lower:
                found_keywords.add(keyword)
        
        # Extract noun phrases that might be technical terms
        for chunk in doc.noun_chunks:
            chunk_text = chunk.text.strip()
            if len(chunk_text) > 2 and chunk_text in tech_keywords:
                found_keywords.add(chunk_text)
        
        # Extract named entities that might be technologies
        for ent in doc.ents:
            if ent.label_ in ["ORG", "PRODUCT", "GPE"] and len(ent.text) > 2:
                ent_lower = ent.text.lower()
                if any(tech in ent_lower for tech in ["software", "framework", "platform", "system"]):
                    found_keywords.add(ent_lower)
        
        return list(found_keywords)
    
    def save_internship(self, internship_data: Dict[str, Any]):
        """Save or update internship in the database."""
        try:
            existing = self.session.query(Internship).filter_by(id=internship_data['id']).first()
            
            if existing:
                # Update existing record
                for key, value in internship_data.items():
                    setattr(existing, key, value)
                existing.scraped_at = datetime.utcnow()
            else:
                # Create new record
                internship = Internship(**internship_data)
                self.session.add(internship)
            
            self.session.commit()
            logger.info(f"Saved internship: {internship_data['company_name']} - {internship_data['title']}")
            
        except Exception as e:
            logger.error(f"Error saving internship: {e}")
            self.session.rollback()
    
    def scrape_all(self):
        """Main method to scrape all internships."""
        logger.info("Starting internship scraper...")
        
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
            # Use the more recent of date_posted or date_updated
            latest_date = max(date_posted, date_updated)
            
            if latest_date >= config.MIN_DATE_TIMESTAMP:
                filtered_internships.append(internship)
        
        logger.info(f"Total internships from API: {len(internships)}")
        logger.info(f"Internships from May 2025 or newer: {len(filtered_internships)}")
        
        if not filtered_internships:
            logger.warning("No internships found that meet the date criteria (May 2025 or newer)")
            return
        
        # Process each filtered internship
        for i, internship in enumerate(filtered_internships):
            try:
                logger.info(f"Processing {i+1}/{len(filtered_internships)}: {internship['company_name']} - {internship['title']}")
                
                # Scrape job description
                job_description = self.scrape_job_description(internship['url'])
                
                if job_description:
                    # Extract keywords
                    keywords = self.extract_keywords(job_description)
                    internship['keywords'] = keywords
                    logger.info(f"Found {len(keywords)} keywords")
                else:
                    internship['keywords'] = []
                    logger.warning(f"Could not scrape description for {internship['url']}")
                
                # Save to database
                self.save_internship(internship)
                
                # Random delay between requests
                if i < len(filtered_internships) - 1:
                    delay = random.uniform(config.MIN_DELAY, config.MAX_DELAY)
                    logger.info(f"Waiting {delay:.2f} seconds before next request...")
                    time.sleep(delay)
                
            except Exception as e:
                logger.error(f"Error processing internship {internship.get('id', 'unknown')}: {e}")
                continue
        
        # Clean up
        if self.driver:
            self.driver.quit()
        
        logger.info("Scraping completed!")
    
    def close(self):
        """Clean up resources."""
        if self.driver:
            self.driver.quit()
        self.session.close()

if __name__ == "__main__":
    scraper = InternshipScraper()
    try:
        scraper.scrape_all()
    finally:
        scraper.close()
