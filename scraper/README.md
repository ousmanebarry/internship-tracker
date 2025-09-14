# Internship Scraper

This scraper fetches internship data from the API and extracts keywords from job descriptions using Selenium and spaCy.

## Features

- Fetches internship listings from https://jobs.cvrve.me/api/intern
- Visits each job posting URL to scrape the full job description
- Extracts relevant keywords using spaCy NLP
- Stores data in a SQLite database
- Implements rate limiting and anti-detection measures
- Batch processing with resume capability
- Comprehensive statistics and analytics
- Configurable settings
- Logs all activities for monitoring

## Quick Start

```bash
# One-time setup
python setup.py

# Run the scraper
python run_scraper.py
```

## Setup

1. Install Python 3.8 or higher

2. Install Chrome browser (required for Selenium)

3. Run the setup script:

```bash
cd scraper
python setup.py
```

Or manually:

```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

## Usage

### Basic Scraping

```bash
# Run the standard scraper
python run_scraper.py

# Run with resume capability (recommended for large datasets)
python batch_scraper.py

# Reset progress and start fresh
python batch_scraper.py reset
```

### ⚡ Fast Scraping (NEW!)

```bash
# Super fast concurrent scraper (5x faster!)
python run_fast.py

# Super fast batch scraper with resume (RECOMMENDED)
python super_fast_batch.py

# Reset fast scraper progress
python super_fast_batch.py reset
```

### View Data

```bash
# View all internships in the database
python view_data.py

# Export to JSON file
python view_data.py export

# View statistics
python stats.py

# View keyword analysis
python stats.py keywords
```

### Testing

```bash
# Test API connection and basic functionality
python test_api.py

# Check date filtering and see how many jobs will be processed
python check_dates.py
```

## Database Schema

The `internships` table contains:

- `id`: Unique identifier
- `company_name`: Company name
- `title`: Job title
- `locations`: JSON array of locations
- `season`: Internship season (Summer, Fall, etc.)
- `sponsorship`: Sponsorship status
- `url`: Job posting URL
- `keywords`: JSON array of extracted keywords
- `active`: Whether the posting is active
- `is_visible`: Visibility status
- `date_posted`: Unix timestamp of posting date
- `date_updated`: Unix timestamp of last update
- `xata`: Original metadata from API
- `scraped_at`: Timestamp of when the data was scraped

## Anti-Detection Measures

The scraper implements several measures to avoid being blocked:

- Random user agents
- Random delays between requests (3-8 seconds)
- Headless Chrome with automation detection disabled
- Proper headers and browser fingerprinting

## Logging

All activities are logged to:

- Console output
- `scraper.log` file

## Customization

You can modify the keyword extraction by editing the `tech_keywords` set in the `extract_keywords` method of `scraper.py`.

## Configuration

Edit `config.py` to customize:

- **API_URL**: Source API endpoint
- **DATABASE_PATH**: SQLite database location
- **MIN_DATE_TIMESTAMP**: Filter internships by date (currently set to May 1, 2025)
- **Delays**: `MIN_DELAY` and `MAX_DELAY` for rate limiting
- **Browser Settings**: Headless mode, window size
- **Keywords**: Add/remove keywords in `TECH_KEYWORDS`
- **Selectors**: Customize job description selectors

## Features in Detail

### Batch Processing with Resume

The batch scraper (`batch_scraper.py`) saves progress after each internship, allowing you to:

- Resume if interrupted
- Track processing status
- Avoid re-scraping already processed jobs

### Keyword Extraction

The scraper looks for:

- Programming languages
- Frameworks and libraries
- Cloud platforms
- Data/ML tools
- Soft skills
- And more (see `config.py` for full list)

### Anti-Detection

- Random user agents
- Configurable delays
- Headless Chrome with stealth settings
- Request headers rotation

### Statistics

The stats tool provides:

- Total internships count
- Top companies and locations
- Most common keywords
- Keyword combinations analysis
- Sponsorship breakdown

## Troubleshooting

1. **Chrome driver issues**: The scraper uses webdriver-manager to automatically download the correct Chrome driver. If you have issues, ensure Chrome is installed.

2. **Rate limiting**: If you're getting blocked, increase the delays in `config.py`:

   ```python
   MIN_DELAY = 5  # Increase these values
   MAX_DELAY = 10
   ```

3. **Missing keywords**: Some job sites may load content dynamically. Add site-specific selectors to `JOB_DESCRIPTION_SELECTORS` in `config.py`.

4. **Database issues**: Delete `internships.db` to start fresh if you encounter database errors.

5. **Memory issues**: For large datasets, use `batch_scraper.py` instead of `run_scraper.py`.

## Advanced Usage

### Custom Filtering

Modify the scraper to filter by specific criteria:

```python
# In scraper.py, filter internships before processing
internships = [i for i in internships if 'Summer' in i.get('season', '')]
```

### Export Options

```bash
# Export filtered data
python view_data.py export --output custom_internships.json

# Export only internships with keywords
python view_data.py export --with-keywords-only
```

### Integration with Other Systems

The SQLite database can be easily integrated with other tools:

- Connect from Python notebooks for analysis
- Import into Excel/Google Sheets
- Use with BI tools like Tableau
- Sync with web applications

## Performance

### Standard Scraper

- Processes ~10-20 internships per minute
- Uses ~200-300 MB RAM
- Single-threaded, safe for all sites

### ⚡ Fast Scraper

- Processes ~50-100 internships per minute (5x faster!)
- Uses ~500-800 MB RAM (multiple browser instances)
- 5 concurrent workers by default
- Aggressive optimizations (disabled images, CSS, JS)
- Reduced delays (0.5-2 seconds vs 3-8 seconds)
- Batch database saves for efficiency

Both create logs for monitoring and debugging. SQLite database grows ~1-2 KB per internship.
