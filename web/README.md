# InternMatch

A sleek, AI-powered resume-to-job matching platform built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **PDF Resume Upload**: Drag and drop PDF resume upload with file validation
- **AI Analysis**: Simulated resume analysis that extracts skills and technologies (Demo Mode)
- **Job Matching**: Intelligent matching algorithm that scores jobs based on resume keywords
- **Dark Theme**: Modern, minimalist dark theme design
- **Responsive Design**: Mobile-friendly interface that works on all devices
- **Real-time Progress**: Visual progress indicators during analysis

> **Note**: This is currently a demo version. PDF text extraction is simulated for showcase purposes. In production, this would integrate with a real PDF parsing service or API.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **File Upload**: react-dropzone
- **PDF Processing**: pdf-parse (ready for implementation)
- **Icons**: Lucide React

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

1. **Upload Resume**: Users can drag and drop a PDF resume or click to browse files
2. **AI Analysis**: The system analyzes the resume and extracts relevant skills and technologies
3. **Job Matching**: The platform matches the extracted keywords against a database of internship opportunities
4. **Results Display**: Users see ranked job matches with compatibility scores and detailed job information

## Project Structure

```
src/
├── app/
│   ├── globals.css      # Global styles with dark theme
│   ├── layout.tsx       # Root layout with dark mode
│   └── page.tsx         # Main application page
├── components/
│   └── ui/              # shadcn/ui components
└── lib/
    └── utils.ts         # Utility functions
```

## Future Enhancements

- Real PDF text extraction using pdf-parse
- Advanced AI keyword extraction
- Integration with job boards and APIs
- User authentication and profile management
- Advanced filtering and search options
- Email notifications for new matches

## License

MIT License - feel free to use this project for your own purposes.
