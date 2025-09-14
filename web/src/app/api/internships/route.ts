import { NextRequest, NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import path from 'path';

// Interface for internship data from the database
interface InternshipDB {
	id: string;
	active: boolean;
	company_name: string;
	date_posted: number;
	date_updated: number;
	is_visible: boolean;
	locations: string; // JSON string
	season: string;
	sponsorship: string;
	title: string;
	url: string;
	keywords: string; // JSON string
	xata: string; // JSON string
	scraped_at: string;
}

// Interface for the processed internship data to send to frontend
interface ProcessedInternship {
	id: string;
	title: string;
	company: string;
	location: string;
	type: string;
	salary: string;
	description: string;
	requirements: string[];
	matchScore: number;
	keywords: string[];
	season: string;
	sponsorship: string;
	url: string;
	datePosted: string;
	active: boolean;
}

function openDatabase(): Promise<sqlite3.Database> {
	return new Promise((resolve, reject) => {
		// Path to the SQLite database in the scraper directory
		const dbPath = path.join(process.cwd(), '..', 'scraper', 'internships.db');
		console.log('Database path:', dbPath);

		const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
			if (err) {
				console.error('Error opening database:', err);
				reject(err);
			} else {
				resolve(db);
			}
		});
	});
}

function queryDatabase(db: sqlite3.Database, query: string, params: unknown[] = []): Promise<unknown[]> {
	return new Promise((resolve, reject) => {
		db.all(query, params, (err, rows) => {
			if (err) {
				console.error('Database query error:', err);
				reject(err);
			} else {
				resolve(rows);
			}
		});
	});
}

function closeDatabase(db: sqlite3.Database): Promise<void> {
	return new Promise((resolve, reject) => {
		db.close((err) => {
			if (err) {
				console.error('Error closing database:', err);
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

function processInternshipData(dbInternship: InternshipDB): ProcessedInternship {
	// Parse JSON fields
	let locations: string[] = [];
	let keywords: string[] = [];

	try {
		locations = JSON.parse(dbInternship.locations || '[]');
	} catch {
		console.warn('Failed to parse locations for internship:', dbInternship.id);
		locations = [];
	}

	try {
		keywords = JSON.parse(dbInternship.keywords || '[]');
	} catch {
		console.warn('Failed to parse keywords for internship:', dbInternship.id);
		keywords = [];
	}

	// Format location string
	const locationString = locations.length > 0 ? locations.join(', ') : 'Location not specified';

	// Create description from available data
	const description = `${dbInternship.season} internship at ${dbInternship.company_name}. ${
		dbInternship.sponsorship === 'Offers Sponsorship'
			? 'Offers visa sponsorship.'
			: dbInternship.sponsorship === 'Does Not Offer Sponsorship'
			? 'Does not offer visa sponsorship.'
			: ''
	}`;

	// Format date
	const datePosted = dbInternship.date_posted
		? new Date(dbInternship.date_posted * 1000).toLocaleDateString()
		: 'Date not available';

	return {
		id: dbInternship.id,
		title: dbInternship.title || 'Internship Position',
		company: dbInternship.company_name || 'Company',
		location: locationString,
		type: 'Internship',
		salary: 'Salary not specified', // This data isn't in the scraper database
		description: description,
		requirements: keywords.slice(0, 10), // Use first 10 keywords as requirements
		matchScore: 0, // Will be calculated on the frontend
		keywords: keywords,
		season: dbInternship.season || 'Not specified',
		sponsorship: dbInternship.sponsorship || 'Not specified',
		url: dbInternship.url || '',
		datePosted: datePosted,
		active: dbInternship.active || false,
	};
}

export async function GET(request: NextRequest) {
	let db: sqlite3.Database | null = null;

	try {
		// Get query parameters
		const searchParams = request.nextUrl.searchParams;
		const page = parseInt(searchParams.get('page') || '1');
		const limit = parseInt(searchParams.get('limit') || '50');
		const season = searchParams.get('season');
		const sponsorship = searchParams.get('sponsorship');
		const active = searchParams.get('active');

		// Calculate offset for pagination
		const offset = (page - 1) * limit;

		// Open database connection
		db = await openDatabase();

		// Build base query for counting total records
		let countQuery = 'SELECT COUNT(*) as total FROM internships WHERE 1=1';
		const countParams: unknown[] = [];

		if (season) {
			countQuery += ' AND season = ?';
			countParams.push(season);
		}

		if (sponsorship) {
			countQuery += ' AND sponsorship = ?';
			countParams.push(sponsorship);
		}

		if (active !== null) {
			countQuery += ' AND active = ?';
			countParams.push(active === 'true' ? 1 : 0);
		}

		// Only count visible internships
		countQuery += ' AND is_visible = 1';

		// Get total count
		const countResult = await queryDatabase(db, countQuery, countParams);
		const totalCount = (countResult[0] as { total: number })?.total || 0;

		// Build query with filters for data
		let query = 'SELECT * FROM internships WHERE 1=1';
		const params: unknown[] = [];

		if (season) {
			query += ' AND season = ?';
			params.push(season);
		}

		if (sponsorship) {
			query += ' AND sponsorship = ?';
			params.push(sponsorship);
		}

		if (active !== null) {
			query += ' AND active = ?';
			params.push(active === 'true' ? 1 : 0);
		}

		// Only get visible internships
		query += ' AND is_visible = 1';

		// Order by date posted (most recent first) and add pagination
		query += ' ORDER BY date_posted DESC LIMIT ? OFFSET ?';
		params.push(limit, offset);

		// Execute query
		const rows = (await queryDatabase(db, query, params)) as InternshipDB[];

		// Process the data
		const processedInternships: ProcessedInternship[] = rows.map(processInternshipData);

		// Calculate pagination info
		const totalPages = Math.ceil(totalCount / limit);
		const hasNextPage = page < totalPages;
		const hasPrevPage = page > 1;

		// Close database connection
		await closeDatabase(db);

		return NextResponse.json({
			success: true,
			internships: processedInternships,
			pagination: {
				currentPage: page,
				totalPages,
				totalCount,
				limit,
				hasNextPage,
				hasPrevPage,
			},
		});
	} catch (error) {
		console.error('Error fetching internships:', error);

		// Make sure to close the database connection even if there's an error
		if (db) {
			try {
				await closeDatabase(db);
			} catch (closeError) {
				console.error('Error closing database after error:', closeError);
			}
		}

		return NextResponse.json(
			{
				success: false,
				error: 'Failed to fetch internships from database',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

export async function OPTIONS() {
	return new NextResponse(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		},
	});
}
