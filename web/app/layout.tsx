export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang='en'>
			<body style={{ fontFamily: 'ui-sans-serif', margin: 20 }}>
				<h1>Internship Tracker</h1>
				<nav style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
					<a href='/upload'>Upload</a>
					<a href='/jobs'>Jobs</a>
					<a href='/matches'>Matches</a>
					<a href='/analytics'>Analytics</a>
				</nav>
				{children}
			</body>
		</html>
	);
}
