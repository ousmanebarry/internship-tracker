'use client';
import { API } from '@/lib/api';
import { useState } from 'react';

export default function UploadPage() {
	const [skills, setSkills] = useState<string[]>([]);
	const [resumeId, setResumeId] = useState<string | undefined>();
	const [email, setEmail] = useState('demo@example.com');

	const onSubmit = async (e: any) => {
		e.preventDefault();
		const file = e.target.file.files[0];
		const fd = new FormData();
		fd.append('file', file);
		fd.append('email', email);
		const res = await fetch(`${API}/ingest/resume`, { method: 'POST', body: fd });
		const json = await res.json();
		setSkills(json.skills || []);
		setResumeId(json.resume_id);
		localStorage.setItem('resume_id', json.resume_id);
	};

	return (
		<div>
			<h2>Upload Resume</h2>
			<form onSubmit={onSubmit}>
				<input placeholder='email' value={email} onChange={(e) => setEmail(e.target.value)} />
				<input name='file' type='file' accept='.pdf,.docx,.txt' required />
				<button type='submit'>Ingest</button>
			</form>
			{resumeId && (
				<div style={{ marginTop: 12 }}>
					<div>
						<b>Resume ID:</b> {resumeId}
					</div>
					<div>
						<b>Detected skills:</b> {skills.join(', ') || '—'}
					</div>
				</div>
			)}
		</div>
	);
}
