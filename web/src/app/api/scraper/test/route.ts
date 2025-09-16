import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

// Simple test endpoint to verify the scraper API is working
export async function GET(request: NextRequest) {
	try {
		// Test database connection by calling the scraper
		const baseUrl = request.nextUrl.origin;
		const scraperUrl = `${baseUrl}/api/scraper/run`;

		console.log('Testing scraper endpoint...');

		const response = await fetch(scraperUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const result = await response.json();

		if (!response.ok) {
			throw new Error(`Scraper test failed: ${result.message || 'Unknown error'}`);
		}

		return NextResponse.json({
			success: true,
			message: 'Scraper test completed successfully',
			scraperResult: result,
		});
	} catch (error) {
		console.error('Scraper test error:', error);

		return NextResponse.json(
			{
				success: false,
				error: 'Scraper test failed',
				message: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}

// Status endpoint to check scraper health
export async function POST(request: NextRequest) {
	try {
		const body = await request.json().catch(() => ({}));
		const testType = body.testType || 'basic';

		const result: {
			timestamp: string;
			environment: {
				nodeEnv: string | undefined;
				hasDatabaseUrl: boolean;
				hasCronSecret: boolean;
			};
			database?: {
				connected: boolean;
				currentTime?: string;
				error?: string;
			};
		} = {
			timestamp: new Date().toISOString(),
			environment: {
				nodeEnv: process.env.NODE_ENV,
				hasDatabaseUrl: !!process.env.DATABASE_URL,
				hasCronSecret: !!process.env.CRON_SECRET,
			},
		};

		if (testType === 'database') {
			// Test database connection without running full scraper
			const client = new Client({
				connectionString: process.env.DATABASE_URL,
				ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
			});

			try {
				await client.connect();
				const dbResult = await client.query('SELECT NOW() as current_time');
				await client.end();

				result.database = {
					connected: true,
					currentTime: dbResult.rows[0]?.current_time,
				};
			} catch (dbError) {
				result.database = {
					connected: false,
					error: dbError instanceof Error ? dbError.message : 'Unknown database error',
				};
			}
		}

		return NextResponse.json({
			success: true,
			message: 'Health check completed',
			result,
		});
	} catch (error) {
		console.error('Health check error:', error);

		return NextResponse.json(
			{
				success: false,
				error: 'Health check failed',
				message: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}
