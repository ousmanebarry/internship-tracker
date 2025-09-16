#!/usr/bin/env node

/**
 * Migration script to transfer data from SQLite (scraper) to PostgreSQL (Vercel)
 * Run this once when setting up your Vercel deployment if you have existing SQLite data
 */

const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const path = require('path');
require('dotenv').config();

async function migrateData() {
	console.log('🚀 Starting migration from SQLite to PostgreSQL...');

	// Check if DATABASE_URL is set
	if (!process.env.DATABASE_URL) {
		console.error('❌ DATABASE_URL environment variable is not set');
		console.log('Please create a .env file with your PostgreSQL connection string:');
		console.log('DATABASE_URL=postgresql://username:password@host:port/database');
		process.exit(1);
	}

	let sqliteDb;
	let pgClient;

	try {
		// Connect to SQLite database
		const sqlitePath = path.join(__dirname, '..', 'scraper', 'internships.db');
		console.log(`📂 Connecting to SQLite database: ${sqlitePath}`);

		sqliteDb = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY, (err) => {
			if (err) {
				console.error('❌ Error connecting to SQLite:', err);
				throw err;
			}
		});

		// Connect to PostgreSQL
		console.log('🐘 Connecting to PostgreSQL...');
		pgClient = new Client({
			connectionString: process.env.DATABASE_URL,
			ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
		});
		await pgClient.connect();
		console.log('✅ Connected to PostgreSQL');

		// Create tables in PostgreSQL
		console.log('🏗️  Creating tables in PostgreSQL...');
		await pgClient.query(`
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

		await pgClient.query(`
			CREATE TABLE IF NOT EXISTS scraper_metadata (
				id SERIAL PRIMARY KEY,
				last_run_date INTEGER,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`);

		// Create indexes
		await pgClient.query(`
			CREATE INDEX IF NOT EXISTS idx_internships_date_posted 
			ON internships(date_posted DESC);
		`);

		await pgClient.query(`
			CREATE INDEX IF NOT EXISTS idx_internships_active 
			ON internships(active);
		`);

		console.log('✅ Tables created successfully');

		// Get data from SQLite
		console.log('📊 Fetching data from SQLite...');
		const sqliteData = await new Promise((resolve, reject) => {
			sqliteDb.all('SELECT * FROM internships', (err, rows) => {
				if (err) {
					reject(err);
				} else {
					resolve(rows);
				}
			});
		});

		console.log(`📈 Found ${sqliteData.length} internships in SQLite`);

		if (sqliteData.length === 0) {
			console.log('⚠️  No data to migrate');
			return;
		}

		// Insert data into PostgreSQL
		console.log('📥 Migrating data to PostgreSQL...');
		let migratedCount = 0;
		let skippedCount = 0;

		for (const row of sqliteData) {
			try {
				// Check if record already exists
				const existingResult = await pgClient.query('SELECT id FROM internships WHERE id = $1', [row.id]);

				if (existingResult.rows.length > 0) {
					skippedCount++;
					continue;
				}

				// Insert new record
				await pgClient.query(
					`
					INSERT INTO internships (
						id, active, company_name, date_posted, date_updated, 
						is_visible, locations, season, sponsorship, title, 
						url, keywords, xata, scraped_at
					) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
				`,
					[
						row.id,
						row.active,
						row.company_name,
						row.date_posted,
						row.date_updated,
						row.is_visible,
						row.locations, // Already JSON string
						row.season,
						row.sponsorship,
						row.title,
						row.url,
						row.keywords || '[]', // Already JSON string
						row.xata || '{}', // Already JSON string
						row.scraped_at ? new Date(row.scraped_at) : new Date(),
					]
				);

				migratedCount++;

				if (migratedCount % 100 === 0) {
					console.log(`📊 Migrated ${migratedCount} records...`);
				}
			} catch (error) {
				console.error(`❌ Error migrating record ${row.id}:`, error.message);
				continue;
			}
		}

		// Initialize scraper metadata with current timestamp
		const currentTimestamp = Math.floor(Date.now() / 1000);
		await pgClient.query('INSERT INTO scraper_metadata (last_run_date) VALUES ($1)', [currentTimestamp]);

		console.log('🎉 Migration completed successfully!');
		console.log(`📊 Statistics:`);
		console.log(`   - Total records in SQLite: ${sqliteData.length}`);
		console.log(`   - Successfully migrated: ${migratedCount}`);
		console.log(`   - Skipped (already exists): ${skippedCount}`);
		console.log(`   - Scraper metadata initialized with timestamp: ${currentTimestamp}`);
	} catch (error) {
		console.error('❌ Migration failed:', error);
		process.exit(1);
	} finally {
		// Close connections
		if (sqliteDb) {
			sqliteDb.close();
		}
		if (pgClient) {
			await pgClient.end();
		}
	}
}

// Run migration if this file is executed directly
if (require.main === module) {
	migrateData()
		.then(() => {
			console.log('🎯 Migration script completed');
			process.exit(0);
		})
		.catch((error) => {
			console.error('💥 Migration script failed:', error);
			process.exit(1);
		});
}

module.exports = { migrateData };
