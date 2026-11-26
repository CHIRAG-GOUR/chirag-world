// Portfolio content. Single source of truth for everything the city shows.
// Every fact here is backed by docs/PROJECT_RESEARCH.md — do not add unverified claims.

export const profile = {
  name: 'Chirag Gour',
  roles: ['Developer', 'Product Associate', 'Web Developer', 'Product Builder', 'Interactive Experience Creator'],
  headline: 'I build interactive learning products, dashboards and 3D web experiences.',
  github: 'https://github.com/CHIRAG-GOUR',
  // Email / LinkedIn intentionally absent until the owner approves publishing them.
  education: {
    degree: 'B.Tech, Computer Science Engineering',
    school: 'Mohanlal Sukhadia University, Udaipur',
    years: '2021 – 2025',
  },
} as const;

export type CareerStop = {
  id: string;
  title: string;
  org: string;
  dates: string | null; // null = not verified, shown without dates
  summary: string;
  points: string[];
};

export const career: CareerStop[] = [
  {
    id: 'btech',
    title: 'B.Tech, Computer Science Engineering',
    org: 'Mohanlal Sukhadia University, Udaipur',
    dates: '2021 – 2025',
    summary: 'Computer science foundations: web development, databases and software engineering.',
    points: ['DBMS projects: Student Record System, Casino Management System', 'Full-stack website built during internship'],
  },
  {
    id: 'bsnl',
    title: 'Intern',
    org: 'Bharat Sanchar Nigam Limited (BSNL)',
    dates: 'Nov 2023 – Jan 2024',
    summary: "Hands-on experience inside one of India's largest and oldest telecom providers.",
    points: ['Telecommunications operations exposure', 'Worked alongside telecom engineers, managers and technicians'],
  },
  {
    id: 'birla',
    title: 'Full-Stack Web Intern',
    org: 'Birla White · UltraTech Cement (Aditya Birla Group)',
    dates: 'Jul 2024 – Aug 2024',
    summary: "Contributed to the redesign and optimisation of the company's website.",
    points: [
      'Maintained and updated databases for data integrity and reliable site behaviour',
      'On-field work at the Birla White industrial plant',
      'Delivered with cross-functional teams and owned independent tasks',
    ],
  },
  {
    id: 'skillizee-intern',
    title: 'Product Intern',
    org: 'SkilliZee',
    dates: null,
    summary: 'Started building interactive learning experiences for school programmes.',
    points: ['Classroom activities (POA) for smartboards and labs', 'Interactive 3D learning scenes'],
  },
  {
    id: 'skillizee-associate',
    title: 'Product Associate',
    org: 'SkilliZee',
    dates: null,
    summary: 'Builds and ships learning products end to end: exams, mobile, reports, AI tools and 3D activities.',
    points: [
      'Olympiad examination dashboard (Next.js + Firebase)',
      'ZeePrep mobile app on the production Firebase backend',
      'Automated SAT student reports (Express, Gemini, Puppeteer)',
      'Podcast AI Studio (Gemini, FFmpeg, timeline editor)',
    ],
  },
];

export type Project = {
  id: string;
  name: string;
  kind: 'dashboard' | 'learning' | 'mobile' | 'ai' | 'automation' | '3d' | 'web';
  tagline: string;
  overview: string;
  problem?: string;
  solution?: string;
  role: string;
  features: string[];
  stack: string[];
  repo?: string;
  live?: string;
  notes?: string; // honest caveats (AI-assisted, README boilerplate, …)
};

const gh = (r: string) => `https://github.com/CHIRAG-GOUR/${r}`;

export const projects: Project[] = [
  {
    id: 'olympiad',
    name: 'Olympiad Examination Dashboard',
    kind: 'dashboard',
    tagline: 'A digital examination platform for school olympiads.',
    overview: 'Next.js and Firebase platform for running olympiad examinations with interactive question types.',
    role: 'Built at SkilliZee',
    features: ['Drag-and-drop question mechanics (dnd-kit)', 'CSV and Excel import (PapaParse, SheetJS)', 'Schema validation (Zod)', '3D question prompts (React Three Fiber)', 'Cloud persistence and hosting (Firebase)'],
    stack: ['Next.js', 'TypeScript', 'Firebase', 'React Three Fiber', 'dnd-kit', 'Zod', 'Tailwind'],
    repo: gh('Olympiad-Activities'),
    live: 'https://the-olympiad-dashboard.web.app/',
    notes: 'Features listed are those proven by the codebase dependencies.',
  },
  {
    id: 'podcast',
    name: 'Podcast AI Studio',
    kind: 'ai',
    tagline: 'Turns long-form podcasts into captioned short clips with AI.',
    overview: 'Analyses long videos, extracts viral moments, generates word-level captions and provides a full timeline editor for short-form content.',
    problem: 'Cutting shorts from hour-long recordings is slow, manual work.',
    solution: 'One Gemini upload drives clip discovery and transcription in parallel; a timeline editor finishes the job.',
    role: 'Built at SkilliZee',
    features: ['Client-side audio extraction (upload payload reduced by up to 85%)', 'Parallel AI pipeline from a single upload', 'Word-level captions with style presets', 'Context-aware social tab (hooks, captions)', 'Export to MP4, MOV, WEBM, GIF, MP3, WAV, AAC'],
    stack: ['Next.js', 'TypeScript', 'Gemini API', 'FFmpeg', 'WaveSurfer.js', 'Firebase Functions', 'Zustand'],
    repo: gh('Podcast-Tool-New'),
    live: 'https://podcast-tool-new.vercel.app',
  },
  {
    id: 'zeeprep',
    name: 'ZeePrep Mobile',
    kind: 'mobile',
    tagline: 'Phone-first assessment app for students and teachers.',
    overview: 'React Native app connected to the production ZeePrep Firebase backend for assessments, diagnostic reports, leaderboards and study resources.',
    role: 'Built at SkilliZee',
    features: ['Assessments with audio and video', 'Diagnostic performance reports', 'Leaderboards and study resources', 'File-based navigation (Expo Router)', 'Secure session storage'],
    stack: ['React Native', 'Expo', 'TypeScript', 'Firebase', 'TanStack Query', 'Zustand'],
    repo: gh('ZeePrep-MobileApp'),
  },
  {
    id: 'sat-reports',
    name: 'SAT Student Report Generator',
    kind: 'automation',
    tagline: 'Excel in, polished AI-written PDF reports out.',
    overview: 'Upload student results as Excel; the server writes AI summaries and renders a 4-page A4 PDF report per student.',
    problem: 'Writing individual student reports by hand does not scale.',
    solution: 'An Express pipeline: Excel parsing → Gemini summaries → Handlebars template → Puppeteer PDF.',
    role: 'Built at SkilliZee',
    features: ['Multipart Excel upload', 'AI summaries via Gemini', 'Handlebars report template', 'Headless-Chrome PDF rendering', 'React (Vite) client'],
    stack: ['Node.js', 'Express', 'Gemini API', 'Puppeteer', 'Handlebars', 'React', 'Vite'],
    repo: gh('SatPdfMaker'),
  },
  {
    id: 'skippi',
    name: 'Skippi Island',
    kind: 'learning',
    tagline: 'A 3D Shark-Tank case study for grades 4–9.',
    overview: 'Students hop a kangaroo around a 3D island to 13 places, one per lesson section, and learn by doing.',
    role: 'Built at SkilliZee',
    features: ['13 sections, 33 missions', 'Progress counts only real completions', 'Teacher deep links per grade and section', 'Mentor view with answer keys'],
    stack: ['React', 'TypeScript', 'React Three Fiber', 'Zustand', 'Recharts', 'Firebase Hosting'],
    repo: gh('POA-Skippi'),
    live: 'https://poa-skippi.web.app',
  },
  {
    id: 'story-sprint',
    name: 'Story Sprint',
    kind: 'learning',
    tagline: 'Pass the baton, build the story.',
    overview: 'Classroom storytelling activity for smartboards: teams build a collective tale through baton passing, dilemmas and twists, ending in a class storybook.',
    role: 'Built at SkilliZee',
    features: ['Baton-passing handover mechanic', '3D parallax story world', 'Twist wheel and plot dilemmas', 'Digital class storybook PDF export'],
    stack: ['React', 'TypeScript', 'React Three Fiber', 'jsPDF', 'html2canvas', 'Framer Motion'],
    repo: gh('POA-StorySprint'),
    live: 'https://poa-story-sprint.vercel.app',
  },
  {
    id: 'eat-better',
    name: 'Eat Better Internship',
    kind: '3d',
    tagline: 'A spatial, motion-rich internship platform.',
    overview: 'Next.js internship experience with 3D viewports, GSAP motion and programmatic PDF output.',
    role: 'Built at SkilliZee',
    features: ['3D viewports (React Three Fiber)', 'GSAP motion', 'PDF generation (jsPDF)', 'State with Zustand'],
    stack: ['Next.js', 'TypeScript', 'Three.js', 'React Three Fiber', 'GSAP', 'Zustand', 'jsPDF'],
    repo: gh('Eat-Better-Internship'),
    live: 'https://eat-better-internship.web.app/1.1',
    notes: 'README is a template; features are those proven by the dependencies.',
  },
  {
    id: 'salty',
    name: 'Salty × SkilliZee Virtual Internship',
    kind: 'learning',
    tagline: 'A five-module internship inside a D2C jewellery brand.',
    overview: 'Brand story, product innovation, Gen-Z marketing, pricing and supply chain, with experiential tasks and capstones.',
    role: 'Built at SkilliZee',
    features: ['Five modules with glossaries', 'Experiential activities', 'Two capstone projects', 'Light and dark themes'],
    stack: ['HTML', 'CSS', 'JavaScript', 'Tailwind'],
    repo: gh('SaltyRevamp'),
  },
  {
    id: 'physics',
    name: 'Physics Motion Lab',
    kind: '3d',
    tagline: 'Interactive physics learning in 3D.',
    overview: 'A set of interactive physics experiences: motion, gravity, and work-energy-power.',
    role: 'Builder',
    features: ['Timeline-choreographed motion (Theatre.js)', 'AI problem help (Groq)', '3D scenes (React Three Fiber)'],
    stack: ['React', 'Three.js', 'React Three Fiber', 'Theatre.js', 'Groq SDK', 'GSAP'],
    repo: gh('physicsmotion2'),
    live: 'https://physicsmotion2.vercel.app',
  },
  {
    id: 'mood-mirror',
    name: 'Mood Mirror',
    kind: 'ai',
    tagline: 'In-browser expression detection for public speaking practice.',
    overview: 'Runs facial expression recognition entirely in the browser to give speakers feedback.',
    role: 'Builder',
    features: ['On-device face and expression detection (face-api.js)', 'No server round trips'],
    stack: ['React', 'face-api.js', 'Framer Motion'],
    repo: gh('Mood-Mirror-2026'),
    live: 'https://mood-mirror-2026.vercel.app',
  },
];

export type SkillGroup = { id: string; name: string; items: string[] };

export const skills: SkillGroup[] = [
  { id: 'frontend', name: 'Frontend', items: ['React', 'Next.js', 'TypeScript', 'JavaScript', 'HTML5', 'CSS', 'Tailwind', 'Radix UI', 'Framer Motion', 'GSAP', 'Vite'] },
  { id: '3d', name: '3D & WebGL', items: ['Three.js', 'React Three Fiber', 'Drei', 'Post-processing', 'Theatre.js', 'three-mesh-bvh', 'OGL'] },
  { id: 'backend', name: 'Backend & APIs', items: ['Node.js', 'Express', 'REST APIs', 'Multer', 'Handlebars', 'Puppeteer', 'Firebase Functions'] },
  { id: 'data', name: 'Data & Cloud', items: ['Firebase Auth', 'Firestore', 'Firebase Storage', 'SQL / DBMS', 'SheetJS', 'PapaParse', 'Zod'] },
  { id: 'mobile', name: 'Mobile', items: ['React Native', 'Expo', 'Expo Router', 'TanStack Query', 'Reanimated'] },
  { id: 'ai', name: 'AI', items: ['Gemini API', 'Groq SDK', 'face-api.js (in-browser vision)'] },
  { id: 'tools', name: 'Tools & Workflow', items: ['Git', 'GitHub', 'GitHub Actions', 'Vercel', 'Firebase Hosting', 'Python', 'Zustand'] },
];
