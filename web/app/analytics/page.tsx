'use client';
import { API } from '@/lib/api';
import { useEffect, useState } from 'react';
import StatCard from '@/components/StatCard';

export default function Analytics() {
	const [stats, setStats] = useState<any>({ users: 0, resumes: 0, jobs: 0, matches: 0 });
	useEffect(() => {
		fetch(`${API}/stats`)
			.then((r) => r.json())
			.then(setStats);
	}, []);
	return (
		<div>
			<h2>Analytics</h2>
			<div style={{ display: 'flex', gap: 12 }}>
				<StatCard label='Users' value={stats.users || 0} />
				<StatCard label='Resumes' value={stats.resumes || 0} />
				<StatCard label='Jobs' value={stats.jobs || 0} />
				<StatCard label='Matches' value={stats.matches || 0} />
			</div>
		</div>
	);
}
