import os
import time
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

HEADLESS = os.getenv("SELENIUM_HEADLESS", "true").lower() == "true"

_driver = None

def _get_driver():
    global _driver
    if _driver:
        return _driver
    opts = Options()
    if HEADLESS:
        opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    _driver = webdriver.Chrome(ChromeDriverManager().install(), options=opts)
    return _driver


def fetch_html(url: str) -> str:
    d = _get_driver()
    d.get(url)
    time.sleep(1.2)  # tiny wait for dynamic content; tune per site
    return d.page_source


def parse_job_html(url: str, html: str):
    soup = BeautifulSoup(html, "lxml")
    title = None
    company = None
    location = None
    desc = None

    # common patterns
    if soup.title:
        title = soup.title.text.strip().split("|")[0]

    # meta tags
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = og_title["content"].strip()

    # naive selectors (customize per source as needed)
    if not desc:
        main = soup.find("main") or soup.body
        if main:
            # limit to something reasonable
            text_blocks = [t.get_text(" ", strip=True) for t in main.find_all(["p","li"])[:200]]
            desc = "\n".join(text_blocks)

    # heuristic company/location extraction
    for tag in soup.find_all(["span","div"], string=True):
        s = tag.get_text(" ", strip=True)
        if not company and any(k in s.lower() for k in ["inc", "llc", "corp", "company"]):
            company = s
        if not location and any(k in s.lower() for k in ["remote", "hybrid", "toronto", "ottawa", "montreal", "canada", "usa"]):
            location = s
        if company and location:
            break

    return {
        "source": url.split("/")[2],
        "url": url,
        "title": title or "Unknown Title",
        "company": company or "Unknown Company",
        "location": location or "Unknown",
        "description": desc or "",
    }
