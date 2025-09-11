'use client';
import { API } from '@/lib/api';
import { useState } from 'react';

export default function JobsPage() {
	const [urls, setUrls] = useState('');
	const [jobIds, setJobIds] = useState<string[]>([]);

	const scrape = async () => {
		const list = urls
			.split('\n')
			.map((s) => s.trim())
			.filter(Boolean);
		const res = await fetch(`${API}/scrape/jobs`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ urls: list }),
		});
		const json = await res.json();
		setJobIds(json.job_ids || []);
		localStorage.setItem('job_ids', JSON.stringify(json.job_ids || []));
	};

	return (
		<div>
			<h2>Scrape Jobs</h2>
			<textarea
				value={urls}
				onChange={(e) => setUrls(e.target.value)}
				rows={10}
				style={{ width: '100%' }}
				placeholder='Paste job URLs, one per line'
			/>
			<button onClick={scrape}>Scrape</button>
			{jobIds.length > 0 && <div style={{ marginTop: 12 }}>Scraped {jobIds.length} jobs.</div>}
		</div>
	);
}
