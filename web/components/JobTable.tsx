'use client';

export default function JobTable({ rows }: { rows: any[] }) {
	return (
		<table border={1} cellPadding={6} style={{ width: '100%', marginTop: 12 }}>
			<thead>
				<tr>
					<th>Score</th>
					<th>Title</th>
					<th>Company</th>
					<th>Location</th>
					<th>Reasons</th>
					<th>Apply</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((r, i) => (
					<tr key={i}>
						<td>{Math.round(r.score)}</td>
						<td>{r.job.title}</td>
						<td>{r.job.company}</td>
						<td>{r.job.location}</td>
						<td>{r.reasons}</td>
						<td>
							<a href={r.job.url} target='_blank'>
								Open
							</a>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
