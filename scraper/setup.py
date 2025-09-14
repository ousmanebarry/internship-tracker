#!/usr/bin/env python3
"""
Setup script to prepare the scraper environment
"""

import subprocess
import sys
import os

def setup():
    """Set up the scraper environment."""
    print("Setting up internship scraper...")
    
    # Install requirements
    print("\n1. Installing Python dependencies...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    
    # Download spaCy model
    print("\n2. Downloading spaCy language model...")
    subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
    
    # Create necessary directories
    print("\n3. Creating necessary directories...")
    os.makedirs("logs", exist_ok=True)
    
    print("\n✅ Setup complete!")
    print("\nYou can now run the scraper with:")
    print("  python run_scraper.py")
    print("\nOr use the batch scraper with resume capability:")
    print("  python batch_scraper.py")
    print("\nTo view statistics:")
    print("  python stats.py")

if __name__ == "__main__":
    setup()
