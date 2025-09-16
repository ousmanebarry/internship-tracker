import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { Client } from 'pg';

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

// Database connection helper
async function getDbClient(): Promise<Client> {
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: { rejectUnauthorized: false },
	});
	await client.connect();
	return client;
}

function processInternshipData(dbInternship: InternshipDB): ProcessedInternship {
	// Parse JSON fields robustly (handle string, array, or object from JSONB)
	let locations: string[] = [];
	let keywords: string[] = [];

	try {
		interface MaybeJsonFields {
			locations?: unknown;
			keywords?: unknown;
		}
		const rawLocations: unknown = (dbInternship as unknown as MaybeJsonFields).locations;
		if (typeof rawLocations === 'string') {
			locations = JSON.parse(rawLocations || '[]');
		} else if (Array.isArray(rawLocations)) {
			locations = rawLocations as string[];
		} else if (rawLocations && typeof rawLocations === 'object') {
			locations = Object.values(rawLocations as Record<string, string>);
		}
	} catch {
		console.warn('Failed to parse locations for internship:', dbInternship.id);
		locations = [];
	}

	try {
		interface MaybeJsonFields {
			locations?: unknown;
			keywords?: unknown;
		}
		const rawKeywords: unknown = (dbInternship as unknown as MaybeJsonFields).keywords;
		if (typeof rawKeywords === 'string') {
			keywords = JSON.parse(rawKeywords || '[]');
		} else if (Array.isArray(rawKeywords)) {
			keywords = rawKeywords as string[];
		} else if (rawKeywords && typeof rawKeywords === 'object') {
			keywords = Object.values(rawKeywords as Record<string, string>);
		}
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
			: dbInternship.sponsorship === 'U.S. Citizenship is Required'
			? 'U.S. citizenship is required.'
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
	let client: Client | null = null;

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

		// Connect to database
		client = await getDbClient();

		// Build base query for counting total records
		let countQuery = 'SELECT COUNT(*) as total FROM internships WHERE 1=1';
		const countParams: unknown[] = [];
		let paramIndex = 1;

		if (season) {
			countQuery += ` AND season = $${paramIndex}`;
			countParams.push(season);
			paramIndex++;
		}

		if (sponsorship) {
			countQuery += ` AND sponsorship = $${paramIndex}`;
			countParams.push(sponsorship);
			paramIndex++;
		}

		if (active !== null) {
			countQuery += ` AND active = $${paramIndex}`;
			countParams.push(active === 'true');
			paramIndex++;
		}

		// Only count visible internships
		countQuery += ` AND is_visible = $${paramIndex}`;
		countParams.push(true);

		// Get total count
		const countResult = await client.query(countQuery, countParams);
		const totalCount = parseInt(countResult.rows[0]?.total || '0');

		// Build query with filters for data
		let query = 'SELECT * FROM internships WHERE 1=1';
		const params: unknown[] = [];
		paramIndex = 1;

		if (season) {
			query += ` AND season = $${paramIndex}`;
			params.push(season);
			paramIndex++;
		}

		if (sponsorship) {
			query += ` AND sponsorship = $${paramIndex}`;
			params.push(sponsorship);
			paramIndex++;
		}

		if (active !== null) {
			query += ` AND active = $${paramIndex}`;
			params.push(active === 'true');
			paramIndex++;
		}

		// Only get visible internships
		query += ` AND is_visible = $${paramIndex}`;
		params.push(true);
		paramIndex++;

		// Order by date posted (most recent first) and add pagination
		query += ` ORDER BY date_posted DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
		params.push(limit, offset);

		// Execute query
		const result = await client.query(query, params);
		const rows = result.rows as InternshipDB[];

		// Process the data
		const processedInternships: ProcessedInternship[] = rows.map(processInternshipData);

		// Calculate pagination info
		const totalPages = Math.ceil(totalCount / limit);
		const hasNextPage = page < totalPages;
		const hasPrevPage = page > 1;

		// Close database connection
		await client.end();

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
		if (client) {
			try {
				await client.end();
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
