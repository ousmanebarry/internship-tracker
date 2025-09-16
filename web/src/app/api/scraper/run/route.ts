import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { Client } from 'pg';

// Interface for internship data from the API
interface InternshipData {
	id: string;
	active: boolean;
	company_name: string;
	date_posted: number;
	date_updated: number;
	is_visible: boolean;
	locations: string[];
	season: string;
	sponsorship: string;
	title: string;
	url: string;
	xata: {
		createdAt: string;
		updatedAt: string;
		version: number;
	};
}

// Database connection helper
async function getDbClient(): Promise<Client> {
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: { rejectUnauthorized: false },
	});
	await client.connect();
	return client;
}

// Initialize database tables if they don't exist
async function initializeDatabase(client: Client) {
	try {
		// Create internships table
		await client.query(`
			CREATE TABLE IF NOT EXISTS internships (
				id VARCHAR(255) PRIMARY KEY,
				active BOOLEAN,
				company_name VARCHAR(255),
				date_posted INTEGER,
				date_updated INTEGER,
				is_visible BOOLEAN,
				locations JSONB,
				season VARCHAR(100),
				sponsorship VARCHAR(255),
				title VARCHAR(500),
				url TEXT,
				keywords JSONB,
				xata JSONB,
				scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`);

		// Create scraper metadata table for tracking last run
		await client.query(`
			CREATE TABLE IF NOT EXISTS scraper_metadata (
				id SERIAL PRIMARY KEY,
				last_run_date INTEGER,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`);

		// Create index for faster queries
		await client.query(`
			CREATE INDEX IF NOT EXISTS idx_internships_date_posted 
			ON internships(date_posted DESC);
		`);

		await client.query(`
			CREATE INDEX IF NOT EXISTS idx_internships_active 
			ON internships(active);
		`);
	} catch (error) {
		console.error('Error initializing database:', error);
		throw error;
	}
}

// Get the newest job date from database (instead of last run date)
async function getNewestJobDate(client: Client): Promise<number> {
	try {
		const result = await client.query(`
			SELECT MAX(GREATEST(date_posted, date_updated)) as newest_date 
			FROM internships 
			WHERE date_posted IS NOT NULL OR date_updated IS NOT NULL
		`);

		if (result.rows.length > 0 && result.rows[0].newest_date) {
			const newestDate = result.rows[0].newest_date;
			console.log(`Found newest job in database: ${new Date(newestDate * 1000).toISOString()}`);
			return newestDate;
		}

		// If no jobs exist, return timestamp for 30 days ago to get recent jobs
		const fallbackDate = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
		console.log('No existing jobs found, using fallback date for initial population');
		return fallbackDate;
	} catch (error) {
		console.error('Error getting newest job date:', error);
		// Return timestamp for 30 days ago as fallback
		return Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
	}
}

// Update the last run date
async function updateLastRunDate(client: Client, timestamp: number) {
	try {
		await client.query('INSERT INTO scraper_metadata (last_run_date) VALUES ($1)', [timestamp]);
	} catch (error) {
		console.error('Error updating last run date:', error);
		throw error;
	}
}

// Fetch internships from the API
async function fetchInternships(): Promise<InternshipData[]> {
	try {
		const response = await fetch('https://jobs.cvrve.me/api/intern', {
			headers: {
				'User-Agent': 'InternshipTracker/1.0',
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log(`Fetched ${data.length} internships from API`);
		return data;
	} catch (error) {
		console.error('Error fetching internships:', error);
		throw error;
	}
}

// Filter internships to get only new ones (on or after the newest job date in database)
function filterNewInternships(internships: InternshipData[], newestJobDate: number): InternshipData[] {
	const filtered = internships.filter((internship) => {
		const datePosted = internship.date_posted || 0;
		const dateUpdated = internship.date_updated || 0;
		const latestDate = Math.max(datePosted, dateUpdated);

		// Include jobs that are on or after the newest job date (>= instead of >)
		return latestDate >= newestJobDate;
	});

	console.log(
		`Filtered ${filtered.length} internships from ${internships.length} total (cutoff: ${new Date(
			newestJobDate * 1000
		).toISOString()})`
	);

	// Log some examples for debugging
	if (filtered.length > 0) {
		const sampleJob = filtered[0];
		const sampleDate = Math.max(sampleJob.date_posted || 0, sampleJob.date_updated || 0);
		console.log(
			`Sample filtered job: ${sampleJob.company_name} - ${sampleJob.title} (${new Date(
				sampleDate * 1000
			).toISOString()})`
		);
	}

	return filtered;
}

// Save internships to database
async function saveInternships(client: Client, internships: InternshipData[]) {
	if (internships.length === 0) {
		console.log('No internships to save');
		return;
	}

	let updatedCount = 0;
	let insertedCount = 0;

	try {
		for (const internship of internships) {
			// Check if internship already exists
			const existingResult = await client.query('SELECT id FROM internships WHERE id = $1', [internship.id]);

			if (existingResult.rows.length > 0) {
				// Update existing internship
				await client.query(
					`
					UPDATE internships SET
						active = $2,
						company_name = $3,
						date_posted = $4,
						date_updated = $5,
						is_visible = $6,
						locations = $7,
						season = $8,
						sponsorship = $9,
						title = $10,
						url = $11,
						xata = $12,
						scraped_at = CURRENT_TIMESTAMP
					WHERE id = $1
				`,
					[
						internship.id,
						internship.active,
						internship.company_name,
						internship.date_posted,
						internship.date_updated,
						internship.is_visible,
						JSON.stringify(internship.locations),
						internship.season,
						internship.sponsorship,
						internship.title,
						internship.url,
						JSON.stringify(internship.xata),
					]
				);
				updatedCount++;
			} else {
				// Insert new internship
				await client.query(
					`
					INSERT INTO internships (
						id, active, company_name, date_posted, date_updated, 
						is_visible, locations, season, sponsorship, title, 
						url, keywords, xata, scraped_at
					) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
				`,
					[
						internship.id,
						internship.active,
						internship.company_name,
						internship.date_posted,
						internship.date_updated,
						internship.is_visible,
						JSON.stringify(internship.locations),
						internship.season,
						internship.sponsorship,
						internship.title,
						internship.url,
						JSON.stringify([]), // Empty keywords array for now
						JSON.stringify(internship.xata),
					]
				);
				insertedCount++;
			}
		}

		console.log(
			`Successfully processed ${internships.length} internships: ${insertedCount} inserted, ${updatedCount} updated`
		);
	} catch (error) {
		console.error('Error saving internships:', error);
		throw error;
	}
}

// Clean up old internships (older than 3 months)
async function cleanupOldInternships(client: Client) {
	try {
		const threeMonthsAgo = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;

		const result = await client.query(
			`
			DELETE FROM internships 
			WHERE date_posted < $1 AND date_updated < $1
		`,
			[threeMonthsAgo]
		);

		const deletedCount = result.rowCount || 0;
		console.log(`Cleaned up ${deletedCount} old internships (older than 3 months)`);

		return deletedCount;
	} catch (error) {
		console.error('Error cleaning up old internships:', error);
		throw error;
	}
}

// Main scraper function
async function runScraper() {
	let client: Client | null = null;

	try {
		console.log('Starting internship scraper...');

		// Connect to database
		client = await getDbClient();
		await initializeDatabase(client);

		// Get newest job date from database
		const newestJobDate = await getNewestJobDate(client);
		console.log(`Filtering for jobs on or after: ${new Date(newestJobDate * 1000).toISOString()}`);

		// Fetch all internships from API
		const allInternships = await fetchInternships();

		// Filter for new internships only (on or after the newest job date)
		const newInternships = filterNewInternships(allInternships, newestJobDate);
		console.log(`Found ${newInternships.length} new internships (on or after newest job date)`);

		if (newInternships.length > 0) {
			// Save new internships
			await saveInternships(client, newInternships);
		}

		// Clean up old internships
		const cleanedCount = await cleanupOldInternships(client);

		// Update last run date
		const currentTimestamp = Math.floor(Date.now() / 1000);
		await updateLastRunDate(client, currentTimestamp);

		await client.end();

		return {
			success: true,
			processedInternships: newInternships.length,
			cleanedUp: cleanedCount,
			newestJobDate: new Date(newestJobDate * 1000).toISOString(),
			lastRunDate: new Date(currentTimestamp * 1000).toISOString(),
		};
	} catch (error) {
		console.error('Scraper error:', error);

		if (client) {
			try {
				await client.end();
			} catch (closeError) {
				console.error('Error closing database connection:', closeError);
			}
		}

		throw error;
	}
}

// API route handlers
export async function GET(request: NextRequest) {
	try {
		// Check if the request is from Vercel cron or includes the correct secret
		const authHeader = request.headers.get('authorization');
		const cronSecret = process.env.CRON_SECRET;

		// For security, only allow cron jobs or requests with the correct secret
		if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		console.log('Cron job triggered - running scraper...');
		const result = await runScraper();

		return NextResponse.json({
			message: 'Scraper completed successfully - filtered jobs based on newest job date in database',
			...result,
		});
	} catch (error) {
		console.error('API error:', error);

		return NextResponse.json(
			{
				error: 'Scraper failed',
				message: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

// Allow manual trigger via POST for testing
export async function POST() {
	try {
		console.log('Manual scraper trigger...');
		const result = await runScraper();

		return NextResponse.json({
			message: 'Manual scraper run completed successfully - filtered jobs based on newest job date in database',
			...result,
		});
	} catch (error) {
		console.error('Manual scraper error:', error);

		return NextResponse.json(
			{
				error: 'Manual scraper failed',
				message: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}
