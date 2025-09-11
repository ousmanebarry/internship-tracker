export default function StatCard({ label, value }: { label: string; value: number }) {
	return (
		<div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8, minWidth: 160 }}>
			<div style={{ fontSize: 12, color: '#666' }}>{label}</div>
			<div style={{ fontSize: 24, fontWeight: 700 }}>{value.toLocaleString()}</div>
		</div>
	);
}
