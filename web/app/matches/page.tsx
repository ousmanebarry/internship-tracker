'use client';
import { API } from '@/lib/api';
import { useEffect, useState } from 'react';
import JobTable from '@/components/JobTable';

export default function MatchesPage() {
	const [rows, setRows] = useState<any[]>([]);
	const [error, setError] = useState<string | undefined>();

	const run = async () => {
		const resume_id = localStorage.getItem('resume_id');
		const job_ids = JSON.parse(localStorage.getItem('job_ids') || '[]');
		if (!resume_id || job_ids.length === 0) {
			setError('Upload a resume and scrape jobs first.');
			return;
		}
		const res = await fetch(`${API}/match/scores`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ resume_id, job_ids }),
		});
		const json = await res.json();
		setRows(json.matches || []);
	};

	useEffect(() => {
		run();
	}, []);

	return (
		<div>
			<h2>Matches</h2>
			{error && <div style={{ color: 'crimson' }}>{error}</div>}
			{!error && <JobTable rows={rows} />}
		</div>
	);
}
