'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
	Upload,
	FileText,
	Search,
	Briefcase,
	MapPin,
	Clock,
	Star,
	AlertCircle,
	ChevronLeft,
	ChevronRight,
	Filter,
	ArrowUpDown,
	Github,
	Linkedin,
} from 'lucide-react';

interface Job {
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

interface ExtractedKeywords {
	programmingLanguages: string[];
	frameworksAndLibraries: string[];
	databases: string[];
	cloudAndInfrastructure: string[];
	toolsAndPlatforms: string[];
	mobileAndWeb: string[];
	testingAndQA: string[];
	softSkills: string[];
	experience: string[];
	totalKeywords: number;
}

export default function Home() {
	const [uploadedFile, setUploadedFile] = useState<File | null>(null);
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [analysisProgress, setAnalysisProgress] = useState(0);
	const [extractedKeywords, setExtractedKeywords] = useState<ExtractedKeywords | null>(null);
	const [matchedJobs, setMatchedJobs] = useState<Job[]>([]);
	const [analysisError, setAnalysisError] = useState<string | null>(null);

	// State for real internship data
	const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
	const [isLoadingJobs, setIsLoadingJobs] = useState<boolean>(false);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [totalPages, setTotalPages] = useState<number>(1);
	const [totalJobs, setTotalJobs] = useState<number>(0);

	// State for matched jobs pagination
	const [allMatchedJobs, setAllMatchedJobs] = useState<Job[]>([]);
	const [currentMatchedPage, setCurrentMatchedPage] = useState<number>(1);
	const [matchedJobsPerPage] = useState<number>(50);

	// State for job filters
	const [sortBy, setSortBy] = useState<'date' | 'match'>('date');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

	// Function to fetch internships from the database with pagination
	const fetchInternships = async (
		page: number = 1
	): Promise<{
		jobs: Job[];
		pagination: {
			currentPage: number;
			totalPages: number;
			totalCount: number;
			limit: number;
			hasNextPage: boolean;
			hasPrevPage: boolean;
		};
	}> => {
		try {
			const response = await fetch(`/api/internships?page=${page}&limit=50&active=true`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to fetch internships');
			}

			return {
				jobs: data.internships || [],
				pagination: data.pagination || {},
			};
		} catch (error) {
			console.error('Error fetching internships:', error);
			throw error;
		}
	};

	// Function to fetch ALL internships for matching (no pagination)
	const fetchAllInternships = async (): Promise<Job[]> => {
		try {
			const response = await fetch(`/api/internships?active=true&limit=10000`); // Large limit to get all
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to fetch all internships');
			}

			return data.internships || [];
		} catch (error) {
			console.error('Error fetching all internships:', error);
			throw error;
		}
	};

	// Load internships on component mount and when page changes
	useEffect(() => {
		const loadInternships = async () => {
			setIsLoadingJobs(true);
			try {
				const { jobs, pagination } = await fetchInternships(currentPage);
				setAvailableJobs(jobs);
				setTotalPages(pagination.totalPages || 1);
				setTotalJobs(pagination.totalCount || 0);
			} catch (error) {
				console.error('Failed to load internships:', error);
				// Keep empty array if loading fails
				setAvailableJobs([]);
				setTotalPages(1);
				setTotalJobs(0);
			} finally {
				setIsLoadingJobs(false);
			}
		};

		loadInternships();
	}, [currentPage]);

	// Handle sorting changes for matched jobs
	useEffect(() => {
		if (allMatchedJobs.length > 0) {
			const sortedJobs = sortMatchedJobs(allMatchedJobs, sortBy, sortOrder);
			const startIndex = (currentMatchedPage - 1) * matchedJobsPerPage;
			const endIndex = startIndex + matchedJobsPerPage;
			const paginatedJobs = sortedJobs.slice(startIndex, endIndex);
			setMatchedJobs(paginatedJobs);
		}
	}, [sortBy, sortOrder, allMatchedJobs, currentMatchedPage, matchedJobsPerPage]);

	// Function to analyze PDF using the API
	const analyzePDFWithAPI = async (file: File): Promise<{ text: string; keywords: ExtractedKeywords }> => {
		const formData = new FormData();
		formData.append('file', file);

		const response = await fetch('/api/analyze-pdf', {
			method: 'POST',
			body: formData,
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Failed to analyze PDF');
		}

		return await response.json();
	};

	const onDrop = useCallback((acceptedFiles: File[]) => {
		const file = acceptedFiles[0];
		if (file && file.type === 'application/pdf') {
			setUploadedFile(file);
			setExtractedKeywords(null);
			setMatchedJobs([]);
			setAnalysisError(null);
		}
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			'application/pdf': ['.pdf'],
		},
		multiple: false,
	});

	const analyzeResume = async () => {
		if (!uploadedFile) return;

		setIsAnalyzing(true);
		setAnalysisProgress(0);
		setAnalysisError(null);

		// Simulate PDF analysis progress
		const progressInterval = setInterval(() => {
			setAnalysisProgress((prev) => {
				if (prev >= 100) {
					clearInterval(progressInterval);
					return 100;
				}
				return prev + 10;
			});
		}, 200);

		try {
			// Analyze PDF using API
			setAnalysisProgress(30);
			const { text: extractedText, keywords } = await analyzePDFWithAPI(uploadedFile);

			if (!extractedText || extractedText.trim().length === 0) {
				throw new Error('No text could be extracted from the PDF. The file might be corrupted or contain only images.');
			}

			setAnalysisProgress(60);

			// Check if any keywords were found
			if (keywords.totalKeywords === 0) {
				setAnalysisError(
					'No relevant skills or technologies could be identified in your resume. Please ensure your resume contains technical skills, programming languages, or relevant experience.'
				);
				setExtractedKeywords(null);
				setMatchedJobs([]);
				return;
			}

			setAnalysisProgress(80);
			setExtractedKeywords(keywords);

			// Debug: Log extracted text length
			console.log('Extracted text length:', extractedText.length);
			console.log('Keywords found:', keywords.totalKeywords);

			// Fetch ALL internships for matching (not just current page)
			setAnalysisProgress(85);
			const allJobs = await fetchAllInternships();
			console.log('Fetched all jobs for matching:', allJobs.length);

			// Calculate match scores for jobs using ALL internship data
			const jobsWithScores = allJobs.map((job) => {
				const jobKeywords = job.keywords.map((k) => k.toLowerCase());

				// Get all extracted keywords
				const allExtracted = [
					...keywords.programmingLanguages.map((s: string) => s.toLowerCase()),
					...keywords.frameworksAndLibraries.map((s: string) => s.toLowerCase()),
					...keywords.databases.map((s: string) => s.toLowerCase()),
					...keywords.cloudAndInfrastructure.map((s: string) => s.toLowerCase()),
					...keywords.toolsAndPlatforms.map((s: string) => s.toLowerCase()),
					...keywords.mobileAndWeb.map((s: string) => s.toLowerCase()),
					...keywords.testingAndQA.map((s: string) => s.toLowerCase()),
					...keywords.softSkills.map((s: string) => s.toLowerCase()),
				];

				const matches = jobKeywords.filter((jk) => allExtracted.some((ek) => ek.includes(jk) || jk.includes(ek)));

				const matchScore = Math.round((matches.length / jobKeywords.length) * 100);

				return { ...job, matchScore };
			});

			// Filter out jobs with 0% match
			const filteredJobs = jobsWithScores.filter((job) => job.matchScore > 0);

			// Store all matched jobs and reset pagination
			setAllMatchedJobs(filteredJobs);
			setCurrentMatchedPage(1);

			// Apply default sorting (by date, newest first)
			const sortedJobs = sortMatchedJobs(filteredJobs, 'date', 'desc');

			// Calculate pagination for matched jobs
			const startIndex = (1 - 1) * matchedJobsPerPage;
			const endIndex = startIndex + matchedJobsPerPage;
			const paginatedJobs = sortedJobs.slice(startIndex, endIndex);

			setMatchedJobs(paginatedJobs);
			setAnalysisProgress(100);
		} catch (error) {
			console.error('Error analyzing resume:', error);
			setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze the PDF. Please try again.');
			setExtractedKeywords(null);
			setMatchedJobs([]);
		} finally {
			setIsAnalyzing(false);
			clearInterval(progressInterval);
		}
	};

	// Function to sort matched jobs
	const sortMatchedJobs = (jobs: Job[], sortBy: 'date' | 'match', order: 'asc' | 'desc') => {
		return [...jobs].sort((a, b) => {
			let comparison = 0;

			if (sortBy === 'date') {
				// Sort by date posted (newest first by default)
				const dateA = new Date(a.datePosted).getTime();
				const dateB = new Date(b.datePosted).getTime();
				comparison = dateA - dateB;
			} else if (sortBy === 'match') {
				// Sort by match score
				comparison = a.matchScore - b.matchScore;
			}

			return order === 'desc' ? -comparison : comparison;
		});
	};

	// Function to handle matched jobs pagination
	const handleMatchedJobsPageChange = (page: number) => {
		setCurrentMatchedPage(page);
		const sortedJobs = sortMatchedJobs(allMatchedJobs, sortBy, sortOrder);
		const startIndex = (page - 1) * matchedJobsPerPage;
		const endIndex = startIndex + matchedJobsPerPage;
		const paginatedJobs = sortedJobs.slice(startIndex, endIndex);
		setMatchedJobs(paginatedJobs);
	};

	// Function to handle sorting changes
	const handleSortChange = (newSortBy: 'date' | 'match') => {
		if (newSortBy === sortBy) {
			// Toggle order if same sort type
			setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
		} else {
			// Set new sort type and reset to desc order
			setSortBy(newSortBy);
			setSortOrder('desc');
		}
		setCurrentMatchedPage(1); // Reset to first page
	};

	// Function to get unique companies for display
	const getUniqueCompanies = (jobs: Job[], count: number = 3): string[] => {
		const uniqueCompanies = [...new Set(jobs.map((job) => job.company))];
		return uniqueCompanies.slice(0, count);
	};

	const resetAnalysis = () => {
		setUploadedFile(null);
		setExtractedKeywords(null);
		setMatchedJobs([]);
		setAllMatchedJobs([]);
		setCurrentMatchedPage(1);
		setSortBy('date');
		setSortOrder('desc');
		setAnalysisProgress(0);
		setAnalysisError(null);
	};

	return (
		<div className='min-h-screen bg-background flex flex-col'>
			{/* Header */}
			<header className='border-b border-border'>
				<div className='container mx-auto px-4 py-6'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center space-x-2'>
							<Briefcase className='h-8 w-8 text-primary' />
							<h1 className='text-2xl font-bold text-foreground'>InternMatch</h1>
						</div>
						<p className='text-muted-foreground hidden sm:block'>Find Internships That Match Your Skills</p>
					</div>
				</div>
			</header>

			<main className='container mx-auto px-4 py-8 flex-1'>
				<div className='max-w-4xl mx-auto space-y-8'>
					{/* Hero Section */}
					<div className='text-center space-y-4'>
						<h2 className='text-4xl font-bold text-foreground'>Find Your Perfect Internship</h2>
						<p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
							Upload your resume and let us analyze it to find the best matching internship opportunities from our
							constantly updating database of {totalJobs} real internships.
						</p>
						{isLoadingJobs ? (
							<div className='bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 max-w-2xl mx-auto'>
								<p className='text-sm text-yellow-200'>Loading internship opportunities from database...</p>
							</div>
						) : availableJobs.length === 0 ? (
							<div className='bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-2xl mx-auto'>
								<p className='text-sm text-red-200'>
									<strong>No internships loaded:</strong> Unable to connect to the internship database. Please ensure
									the scraper database is available.
								</p>
							</div>
						) : (
							<div className='bg-green-500/10 border border-green-500/20 rounded-lg p-4 max-w-2xl mx-auto'>
								<p className='text-sm text-green-200'>
									<strong>Real Internship Data:</strong> We have {totalJobs} live internship opportunities in our
									database. Including positions from companies like {getUniqueCompanies(availableJobs, 3).join(', ')}.
								</p>
							</div>
						)}
					</div>

					{/* Upload Section */}
					<Card className='border-2 border-dashed border-border hover:border-primary/50 transition-colors'>
						<CardContent className='p-8'>
							{!uploadedFile ? (
								<div
									{...getRootProps()}
									className={`cursor-pointer text-center space-y-4 ${isDragActive ? 'opacity-70' : ''}`}
								>
									<input {...getInputProps()} />
									<div className='mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center'>
										<Upload className='h-8 w-8 text-muted-foreground' />
									</div>
									<div>
										<p className='text-lg font-medium text-foreground'>
											{isDragActive ? 'Drop your resume here...' : 'Drag & drop your resume here'}
										</p>
										<p className='text-muted-foreground'>or click to browse files</p>
										<p className='text-sm text-muted-foreground mt-2'>Supports PDF files only</p>
									</div>
								</div>
							) : (
								<div className='space-y-4'>
									<div className='flex items-center justify-between'>
										<div className='flex items-center space-x-3'>
											<FileText className='h-8 w-8 text-primary' />
											<div>
												<p className='font-medium text-foreground'>{uploadedFile.name}</p>
												<p className='text-sm text-muted-foreground'>
													{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
												</p>
											</div>
										</div>
										<Button variant='outline' onClick={resetAnalysis}>
											Remove
										</Button>
									</div>

									{!isAnalyzing && !extractedKeywords && (
										<Button onClick={analyzeResume} className='w-full'>
											<Search className='h-4 w-4 mr-2' />
											Analyze Resume
										</Button>
									)}

									{isAnalyzing && (
										<div className='space-y-2'>
											<div className='flex items-center justify-between text-sm'>
												<span className='text-muted-foreground'>Analyzing resume...</span>
												<span className='text-muted-foreground'>{analysisProgress}%</span>
											</div>
											<Progress value={analysisProgress} className='w-full' />
										</div>
									)}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Error Section */}
					{analysisError && (
						<Card className='border-destructive/50 bg-destructive/5'>
							<CardContent className='p-6'>
								<div className='flex items-start space-x-3'>
									<AlertCircle className='h-5 w-5 text-destructive mt-0.5' />
									<div>
										<h3 className='font-medium text-destructive mb-1'>Analysis Failed</h3>
										<p className='text-sm text-destructive/80'>{analysisError}</p>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Keywords Section */}
					{extractedKeywords && (
						<Card>
							<CardHeader>
								<CardTitle className='flex items-center space-x-2'>
									<Search className='h-5 w-5' />
									<span>Extracted Keywords ({extractedKeywords.totalKeywords})</span>
								</CardTitle>
								<CardDescription>
									Skills and technologies found in your resume using advanced NLP analysis
								</CardDescription>
							</CardHeader>
							<CardContent className='space-y-4'>
								{extractedKeywords.programmingLanguages.length > 0 && (
									<div>
										<h4 className='font-medium text-foreground mb-2'>Programming Languages</h4>
										<div className='flex flex-wrap gap-2'>
											{extractedKeywords.programmingLanguages.map((lang, index) => (
												<span key={index} className='px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-sm'>
													{lang}
												</span>
											))}
										</div>
									</div>
								)}
								{extractedKeywords.frameworksAndLibraries.length > 0 && (
									<div>
										<h4 className='font-medium text-foreground mb-2'>Frameworks & Libraries</h4>
										<div className='flex flex-wrap gap-2'>
											{extractedKeywords.frameworksAndLibraries.map((framework, index) => (
												<span key={index} className='px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm'>
													{framework}
												</span>
											))}
										</div>
									</div>
								)}
								{extractedKeywords.databases.length > 0 && (
									<div>
										<h4 className='font-medium text-foreground mb-2'>Databases</h4>
										<div className='flex flex-wrap gap-2'>
											{extractedKeywords.databases.map((db, index) => (
												<span key={index} className='px-3 py-1 bg-orange-500/10 text-orange-400 rounded-full text-sm'>
													{db}
												</span>
											))}
										</div>
									</div>
								)}
								{extractedKeywords.cloudAndInfrastructure.length > 0 && (
									<div>
										<h4 className='font-medium text-foreground mb-2'>Cloud & Infrastructure</h4>
										<div className='flex flex-wrap gap-2'>
											{extractedKeywords.cloudAndInfrastructure.map((platform, index) => (
												<span key={index} className='px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-sm'>
													{platform}
												</span>
											))}
										</div>
									</div>
								)}
								{extractedKeywords.toolsAndPlatforms.length > 0 && (
									<div>
										<h4 className='font-medium text-foreground mb-2'>Tools & Platforms</h4>
										<div className='flex flex-wrap gap-2'>
											{extractedKeywords.toolsAndPlatforms.map((tool, index) => (
												<span key={index} className='px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-sm'>
													{tool}
												</span>
											))}
										</div>
									</div>
								)}
								{extractedKeywords.mobileAndWeb.length > 0 && (
									<div>
										<h4 className='font-medium text-foreground mb-2'>Mobile & Web Technologies</h4>
										<div className='flex flex-wrap gap-2'>
											{extractedKeywords.mobileAndWeb.map((tech, index) => (
												<span key={index} className='px-3 py-1 bg-teal-500/10 text-teal-400 rounded-full text-sm'>
													{tech}
												</span>
											))}
										</div>
									</div>
								)}
								{extractedKeywords.testingAndQA.length > 0 && (
									<div>
										<h4 className='font-medium text-foreground mb-2'>Testing & QA</h4>
										<div className='flex flex-wrap gap-2'>
											{extractedKeywords.testingAndQA.map((test, index) => (
												<span key={index} className='px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-sm'>
													{test}
												</span>
											))}
										</div>
									</div>
								)}
								{extractedKeywords.softSkills.length > 0 && (
									<div>
										<h4 className='font-medium text-foreground mb-2'>Soft Skills</h4>
										<div className='flex flex-wrap gap-2'>
											{extractedKeywords.softSkills.map((skill, index) => (
												<span key={index} className='px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-sm'>
													{skill}
												</span>
											))}
										</div>
									</div>
								)}
								{extractedKeywords.experience.length > 0 && (
									<div>
										<h4 className='font-medium text-foreground mb-2'>Experience & Projects</h4>
										<div className='flex flex-wrap gap-2'>
											{extractedKeywords.experience.map((exp, index) => (
												<span key={index} className='px-3 py-1 bg-violet-500/10 text-violet-400 rounded-full text-sm'>
													{exp}
												</span>
											))}
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{/* Matched Jobs Section */}
					{extractedKeywords && !analysisError && (
						<div className='space-y-4'>
							{matchedJobs.length > 0 ? (
								<>
									<div className='space-y-4'>
										<div className='flex items-center justify-between'>
											<h3 className='text-2xl font-bold text-foreground'>
												Matching Internships ({allMatchedJobs.length})
											</h3>
											<div className='text-sm text-muted-foreground'>
												Showing {(currentMatchedPage - 1) * matchedJobsPerPage + 1} to{' '}
												{Math.min(currentMatchedPage * matchedJobsPerPage, allMatchedJobs.length)} of{' '}
												{allMatchedJobs.length} matches
											</div>
										</div>

										{/* Filter Controls */}
										<div className='flex items-center space-x-4'>
											<div className='flex items-center space-x-2'>
												<Filter className='h-4 w-4 text-muted-foreground' />
												<span className='text-sm font-medium text-foreground'>Sort by:</span>
											</div>
											<div className='flex items-center space-x-2'>
												<Button
													variant={sortBy === 'date' ? 'default' : 'outline'}
													size='sm'
													onClick={() => handleSortChange('date')}
													className='flex items-center space-x-1'
												>
													<Clock className='h-3 w-3' />
													<span>Date</span>
													{sortBy === 'date' && (
														<ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
													)}
												</Button>
												<Button
													variant={sortBy === 'match' ? 'default' : 'outline'}
													size='sm'
													onClick={() => handleSortChange('match')}
													className='flex items-center space-x-1'
												>
													<Star className='h-3 w-3' />
													<span>Match %</span>
													{sortBy === 'match' && (
														<ArrowUpDown className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
													)}
												</Button>
											</div>
											<div className='text-xs text-muted-foreground'>
												{sortBy === 'date'
													? sortOrder === 'desc'
														? 'Newest first'
														: 'Oldest first'
													: sortOrder === 'desc'
													? 'Highest match first'
													: 'Lowest match first'}
											</div>
										</div>
									</div>
									<div className='grid gap-4 md:grid-cols-2'>
										{matchedJobs.map((job) => (
											<Card key={job.id} className='hover:shadow-lg transition-shadow'>
												<CardHeader>
													<div className='flex items-start justify-between'>
														<div className='space-y-1'>
															<CardTitle className='text-lg'>{job.title}</CardTitle>
															<CardDescription className='text-base'>{job.company}</CardDescription>
														</div>
														<div className='flex items-center space-x-1'>
															<Star className='h-4 w-4 text-yellow-500 fill-current' />
															<span className='text-sm font-medium text-foreground'>{job.matchScore}%</span>
														</div>
													</div>
												</CardHeader>
												<CardContent className='space-y-3'>
													<div className='flex items-center space-x-4 text-sm text-muted-foreground'>
														<div className='flex items-center space-x-1'>
															<MapPin className='h-4 w-4' />
															<span>{job.location}</span>
														</div>
														<div className='flex items-center space-x-1'>
															<Clock className='h-4 w-4' />
															<span>{job.season}</span>
														</div>
													</div>
													<p className='text-sm text-foreground'>{job.description}</p>

													{/* Sponsorship Information */}
													<div className='flex items-center space-x-2'>
														<span className='text-xs font-medium text-muted-foreground'>Visa Sponsorship:</span>
														<span
															className={`text-xs px-2 py-1 rounded-full ${
																job.sponsorship === 'Offers Sponsorship'
																	? 'bg-green-500/10 text-green-400'
																	: job.sponsorship === 'Does Not Offer Sponsorship'
																	? 'bg-red-500/10 text-red-400'
																	: 'bg-gray-500/10 text-gray-400'
															}`}
														>
															{job.sponsorship}
														</span>
													</div>

													<div className='pt-2 space-y-2'>
														{job.url && (
															<Button className='w-full' onClick={() => window.open(job.url, '_blank')}>
																Apply Now
															</Button>
														)}
														<p className='text-xs text-muted-foreground text-center'>Posted: {job.datePosted}</p>
													</div>
												</CardContent>
											</Card>
										))}
									</div>

									{/* Matched Jobs Pagination */}
									{allMatchedJobs.length > matchedJobsPerPage && (
										<div className='flex items-center justify-center space-x-2'>
											<Button
												variant='outline'
												size='sm'
												onClick={() => handleMatchedJobsPageChange(currentMatchedPage - 1)}
												disabled={currentMatchedPage === 1}
											>
												<ChevronLeft className='h-4 w-4' />
												Previous
											</Button>
											<div className='flex items-center space-x-1'>
												{Array.from(
													{ length: Math.min(5, Math.ceil(allMatchedJobs.length / matchedJobsPerPage)) },
													(_, i) => {
														const pageNum = i + 1;
														return (
															<Button
																key={pageNum}
																variant={currentMatchedPage === pageNum ? 'default' : 'outline'}
																size='sm'
																onClick={() => handleMatchedJobsPageChange(pageNum)}
																className='w-8 h-8 p-0'
															>
																{pageNum}
															</Button>
														);
													}
												)}
												{Math.ceil(allMatchedJobs.length / matchedJobsPerPage) > 5 && (
													<>
														<span className='text-muted-foreground'>...</span>
														<Button
															variant={
																currentMatchedPage === Math.ceil(allMatchedJobs.length / matchedJobsPerPage)
																	? 'default'
																	: 'outline'
															}
															size='sm'
															onClick={() =>
																handleMatchedJobsPageChange(Math.ceil(allMatchedJobs.length / matchedJobsPerPage))
															}
															className='w-8 h-8 p-0'
														>
															{Math.ceil(allMatchedJobs.length / matchedJobsPerPage)}
														</Button>
													</>
												)}
											</div>
											<Button
												variant='outline'
												size='sm'
												onClick={() => handleMatchedJobsPageChange(currentMatchedPage + 1)}
												disabled={currentMatchedPage === Math.ceil(allMatchedJobs.length / matchedJobsPerPage)}
											>
												Next
												<ChevronRight className='h-4 w-4' />
											</Button>
										</div>
									)}
								</>
							) : (
								<Card className='border-muted'>
									<CardContent className='p-6 text-center'>
										<AlertCircle className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
										<h3 className='text-lg font-medium text-foreground mb-2'>No Matching Jobs Found</h3>
										<p className='text-muted-foreground'>
											We couldn&apos;t find any internships that match your current skills. Consider updating your
											resume with more relevant technical skills or experience.
										</p>
									</CardContent>
								</Card>
							)}
						</div>
					)}

					{/* Pagination Controls */}
					{!extractedKeywords && totalJobs > 0 && (
						<div className='space-y-4'>
							<div className='flex items-center justify-between'>
								<div className='text-sm text-muted-foreground'>
									Showing {(currentPage - 1) * 50 + 1} to {Math.min(currentPage * 50, totalJobs)} of {totalJobs}{' '}
									internships
								</div>
								<div className='flex items-center space-x-2'>
									<Button
										variant='outline'
										size='sm'
										onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
										disabled={currentPage === 1 || isLoadingJobs}
									>
										<ChevronLeft className='h-4 w-4' />
										Previous
									</Button>
									<div className='flex items-center space-x-1'>
										{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
											const pageNum = i + 1;
											return (
												<Button
													key={pageNum}
													variant={currentPage === pageNum ? 'default' : 'outline'}
													size='sm'
													onClick={() => setCurrentPage(pageNum)}
													disabled={isLoadingJobs}
													className='w-8 h-8 p-0'
												>
													{pageNum}
												</Button>
											);
										})}
										{totalPages > 5 && (
											<>
												<span className='text-muted-foreground'>...</span>
												<Button
													variant={currentPage === totalPages ? 'default' : 'outline'}
													size='sm'
													onClick={() => setCurrentPage(totalPages)}
													disabled={isLoadingJobs}
													className='w-8 h-8 p-0'
												>
													{totalPages}
												</Button>
											</>
										)}
									</div>
									<Button
										variant='outline'
										size='sm'
										onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
										disabled={currentPage === totalPages || isLoadingJobs}
									>
										Next
										<ChevronRight className='h-4 w-4' />
									</Button>
								</div>
							</div>
						</div>
					)}
				</div>
			</main>

			{/* Footer */}
			<footer className='border-t border-border bg-muted/30'>
				<div className='container mx-auto px-4 py-8'>
					<div className='flex flex-col items-center space-y-4'>
						<div className='flex items-center space-x-2'>
							<Briefcase className='h-6 w-6 text-primary' />
							<span className='text-lg font-semibold text-foreground'>InternMatch</span>
						</div>
						<p className='text-sm text-muted-foreground text-center'>
							Built by <span className='font-medium text-foreground'>Ousmane Barry</span>
						</p>
						<div className='flex items-center space-x-4'>
							<a
								href='https://github.com/ousmanebarry/'
								target='_blank'
								rel='noopener noreferrer'
								className='flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors'
							>
								<Github className='h-5 w-5' />
								<span className='text-sm'>GitHub</span>
							</a>
							<a
								href='https://linkedin.com/in/barry-ousmane/'
								target='_blank'
								rel='noopener noreferrer'
								className='flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors'
							>
								<Linkedin className='h-5 w-5' />
								<span className='text-sm'>LinkedIn</span>
							</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
