# Vercel Deployment Guide for Internship Tracker

This guide will walk you through deploying the internship tracker to Vercel with automated daily scraping.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **PostgreSQL Database**: You'll need a PostgreSQL database (recommended: [Supabase](https://supabase.com), [Neon](https://neon.tech), or [PlanetScale](https://planetscale.com))
3. **GitHub Repository**: Your code should be in a GitHub repository

## Database Setup

### Option 1: Supabase (Recommended - Free Tier Available)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to Settings > Database
3. Copy the "Connection string" (it starts with `postgresql://`)
4. Make sure to replace `[YOUR-PASSWORD]` with your actual database password

### Option 2: Neon (Alternative)

1. Go to [neon.tech](https://neon.tech) and create a new project
2. Copy the connection string from the dashboard
3. The format will be: `postgresql://username:password@host/database`

## Vercel Deployment

### Step 1: Connect Repository

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Set the root directory to `web/` (since the Next.js app is in the web folder)

### Step 2: Configure Environment Variables

In your Vercel project settings, add these environment variables:

```bash
# Database URL (from your PostgreSQL provider)
DATABASE_URL=postgresql://your_username:your_password@your_host:5432/your_database

# Secure your cron endpoint (generate a random string)
CRON_SECRET=your_secure_random_string_here

# Environment
NODE_ENV=production
```

To generate a secure CRON_SECRET, you can use:

```bash
# On macOS/Linux
openssl rand -hex 32

# Or use an online generator
# https://www.random.org/strings/
```

### Step 3: Deploy

1. Click "Deploy" in Vercel
2. Wait for the deployment to complete
3. Your app will be available at `your-app-name.vercel.app`

## Vercel Cron Configuration

The cron job is already configured in `vercel.json`:

```json
{
	"crons": [
		{
			"path": "/api/scraper/run",
			"schedule": "0 0 * * *"
		}
	]
}
```

This runs the scraper **every day at midnight UTC**.

### Cron Schedule Formats

If you want to change the schedule, here are some examples:

- `"0 0 * * *"` - Every day at midnight UTC
- `"0 12 * * *"` - Every day at noon UTC
- `"0 0 */2 * *"` - Every 2 days at midnight UTC
- `"0 6,18 * * *"` - Every day at 6 AM and 6 PM UTC

## How the Smart Scraper Works

The scraper uses an **intelligent filtering approach** that ensures you never miss jobs and avoid unnecessary processing:

### 📊 **Database-Driven Filtering**

1. **Finds the newest job** already in your database (by `date_posted` or `date_updated`)
2. **Fetches all jobs** from [jobs.cvrve.me/api/intern](https://jobs.cvrve.me/api/intern)
3. **Filters for jobs** posted on or after that newest date (`>=`)
4. **Processes only relevant jobs** (new or updated ones)

### ✅ **Benefits of This Approach**

- **Never misses jobs**: Even if the scraper fails for a few days, it will catch up
- **Handles updates**: Captures changes to existing job postings
- **Efficient**: Only processes jobs that need attention
- **Resilient**: Works even if run schedules are inconsistent

### 📝 **Example**

```
Database newest job: September 15, 2025
API has jobs from: September 10-20, 2025
Scraper processes: September 15-20, 2025 (6 jobs instead of 200+)
```

## Testing the Deployment

### 1. Test the Web Interface

Visit your Vercel app URL and make sure you can see internships loading.

### 2. Test the Scraper Manually

You can trigger the scraper manually by sending a POST request:

```bash
curl -X POST https://your-app-name.vercel.app/api/scraper/run
```

### 3. Check Logs

In your Vercel dashboard:

1. Go to your project
2. Click on "Functions" tab
3. Click on the `/api/scraper/run` function
4. View logs to see if the scraper is working correctly

The logs will show:

- The newest job date found in your database
- How many jobs were filtered from the API
- How many were inserted vs updated

## Database Management

### Initial Setup

The scraper will automatically create the necessary tables on first run:

- `internships` - Stores all internship data
- `scraper_metadata` - Tracks last run dates

### Manual Database Access

If you need to access your database directly:

1. **Supabase**: Use the SQL Editor in your Supabase dashboard
2. **Neon**: Use the Neon console or connect with a PostgreSQL client
3. **Command Line**: Use `psql` with your connection string

Example queries:

```sql
-- Check total internships
SELECT COUNT(*) FROM internships;

-- Check last scraper run
SELECT * FROM scraper_metadata ORDER BY id DESC LIMIT 1;

-- Check recent internships
SELECT company_name, title, date_posted, scraped_at
FROM internships
ORDER BY scraped_at DESC
LIMIT 10;
```

## Monitoring and Troubleshooting

### Vercel Function Logs

1. Go to your Vercel dashboard
2. Select your project
3. Go to "Functions" tab
4. Click on any function to see its logs and metrics

### Common Issues

1. **Database Connection Errors**:

   - Verify your `DATABASE_URL` is correct
   - Check if your database allows connections from Vercel IPs

2. **Cron Not Running**:

   - Ensure you're on a Vercel Pro plan (cron requires Pro)
   - Check the cron logs in Vercel dashboard
   - Verify the `CRON_SECRET` environment variable is set

3. **Timeout Errors**:
   - The scraper has a 15-minute timeout (900 seconds)
   - If it times out, consider optimizing the scraping logic

### Performance Monitoring

Monitor these metrics in Vercel:

- Function execution time
- Memory usage
- Error rates
- Database connection performance

## Cost Considerations

### Vercel Pricing

- **Hobby Plan**: Free, but no cron jobs
- **Pro Plan**: $20/month, includes cron jobs
- **Enterprise**: Custom pricing

### Database Pricing

- **Supabase**: Free tier with 500MB storage
- **Neon**: Free tier with 1GB storage
- **PlanetScale**: Free tier with 5GB storage

## Security Best Practices

1. **Environment Variables**: Never commit real credentials to your repository
2. **CRON_SECRET**: Use a strong, randomly generated secret
3. **Database**: Use strong passwords and enable SSL connections
4. **Access Control**: Limit database access to necessary IPs only

## Support

If you encounter issues:

1. Check the Vercel function logs
2. Verify all environment variables are set correctly
3. Test your database connection independently
4. Review the GitHub repository for updates

## Updating the Application

To update your deployment:

1. Push changes to your GitHub repository
2. Vercel will automatically redeploy
3. Monitor the deployment logs to ensure success

The scraper will automatically:

- ✅ Run every 24 hours
- ✅ Only fetch jobs on or after the newest job date in your database
- ✅ Delete internships older than 3 months
- ✅ Handle job updates and avoid duplicates intelligently
- ✅ Handle errors gracefully and continue running
