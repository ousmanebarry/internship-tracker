"""
Configuration settings for the internship scraper
"""

# API settings
API_URL = "https://jobs.cvrve.me/api/intern"

# Database settings
DATABASE_PATH = "internships.db"

# Scraping delays (in seconds)
MIN_DELAY = 0.5  # Minimum delay between requests (reduced for speed)
MAX_DELAY = 2    # Maximum delay between requests (reduced for speed)
PAGE_LOAD_TIMEOUT = 5  # Timeout for page loading (reduced for speed)

# Fast scraping settings
FAST_MODE = True  # Enable aggressive optimizations
CONCURRENT_WORKERS = 5  # Number of concurrent browser instances

# Browser settings
HEADLESS = True  # Run browser in headless mode
WINDOW_SIZE = "1920,1080"

# Keywords for extraction
TECH_KEYWORDS = {
    # Programming Languages
    "python", "java", "javascript", "typescript", "c++", "c#", "ruby", "go", "golang",
    "rust", "swift", "kotlin", "scala", "r", "matlab", "julia", "php", "perl", "html", "css",
    
    # Web Technologies
    "react", "angular", "vue", "vue.js", "node.js", "nodejs", "express", "django", "flask",
    "spring", "spring boot", "rails", "ruby on rails", "laravel", "asp.net", "jquery", 
    "bootstrap", "tailwind", "tailwindcss", "next.js", "nextjs", "nuxt.js", "gatsby",
    
    # Data & ML
    "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "sklearn",
    "pandas", "numpy", "data science", "data analysis", "data engineering", "data analytics",
    "big data", "spark", "apache spark", "hadoop", "kafka", "apache kafka", "etl", 
    "sql", "nosql", "mongodb", "postgresql", "mysql", "redis", "elasticsearch", "cassandra",
    "tableau", "power bi", "looker", "airflow", "mlflow", "kubeflow",
    
    # Cloud & DevOps
    "aws", "amazon web services", "azure", "microsoft azure", "gcp", "google cloud", 
    "docker", "kubernetes", "k8s", "jenkins", "gitlab", "github actions", "circleci",
    "ci/cd", "devops", "terraform", "ansible", "puppet", "chef", "linux", "unix", 
    "bash", "shell", "powershell", "cloudformation", "helm",
    
    # Mobile
    "ios", "android", "react native", "flutter", "xamarin", "swift", "objective-c",
    "kotlin", "java", "mobile development", "swiftui", "jetpack compose",
    
    # Other Technologies
    "api", "rest", "restful", "graphql", "grpc", "microservices", "blockchain", 
    "ai", "artificial intelligence", "nlp", "natural language processing", 
    "computer vision", "opencv", "git", "github", "gitlab", "bitbucket", "svn",
    "agile", "scrum", "kanban", "jira", "confluence", "testing", "qa", 
    "quality assurance", "automation", "selenium", "cypress", "jest", "pytest",
    "junit", "security", "cybersecurity", "oauth", "jwt", "ssl", "https",
    
    # Databases & Tools
    "oracle", "sqlite", "dynamodb", "firebase", "supabase", "prisma", "sequelize",
    "mongoose", "redis", "memcached", "rabbitmq", "celery", "nginx", "apache",
    
    # Soft Skills & General
    "communication", "teamwork", "problem solving", "problem-solving", "analytical", 
    "leadership", "project management", "presentation", "collaboration", 
    "critical thinking", "time management", "attention to detail", "creative",
    "innovative", "self-motivated", "proactive", "organized", "adaptable"
}

# Job description selectors (CSS/XPath patterns)
JOB_DESCRIPTION_SELECTORS = [
    # Class names
    ".job-description", ".job-details", ".description", ".job-summary",
    ".position-description", ".role-description", ".job-content", 
    ".job-info", ".posting-description", ".job-desc", ".jobDescription",
    ".job-description-content", ".job-posting-description",
    
    # IDs
    "#job-description", "#job-details", "#description", "#job-summary",
    "#jobDescription", "#job-desc", "#job-content",
    
    # Data attributes
    "[data-testid='job-description']", "[data-test='job-description']",
    "[data-qa='job-description']", "[data-automation='job-description']",
    
    # Common div patterns
    "div[class*='description']", "div[class*='job-desc']",
    "div[class*='posting']", "section[class*='description']",
    
    # Aria labels
    "[aria-label*='job description']", "[aria-label*='description']",
    
    # Common tags
    "article", "main[role='main']", ".content", "#content", ".main-content"
]

# Date filtering (Unix timestamp for May 1, 2025)
MIN_DATE_TIMESTAMP = 1746057600  # May 1, 2025 00:00:00 UTC

# Logging settings
LOG_FILE = "scraper.log"
LOG_LEVEL = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
