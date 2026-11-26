# Project Research — Chirag Gour

Research date: 2026-11-26. Sources actually inspected are listed per item. Anything not confirmed by a source is
marked **unverified** and is **not** shown in the portfolio until confirmed.

## Sources

| Source | What it gave | Access |
|---|---|---|
| GitHub API — `users/CHIRAG-GOUR/repos` | 58 public repos: names, languages, sizes, homepages, push dates | public, unauthenticated |
| `package.json` of 24 repos (raw.githubusercontent) | real dependency lists → verified technologies | public |
| `README.md` of 18 repos | what each project does (where the README is not boilerplate) | public |
| Résumé PDF on the owner's machine (`Desktop/Docs/Resume - Chirag Gour.pdf`) | education, two internships with dates, early projects, early skills | local, read with owner's request to research him |
| Owner's brief (this project's prompt) | roles at SkilliZee, professional identity | owner statement |
| `CHIRAG-GOUR/CHIRAG-GOUR` profile repo | curated project metadata, live URLs | public |

Not inspected: private repositories (no authenticated GitHub access in this environment), LinkedIn, any company systems.

## Identity (owner statement)

Developer · Product Associate · Web Developer · Product Builder · Interactive Experience Creator.

## Education (verified — résumé)

- **B.Tech, Computer Science Engineering** — Mohanlal Sukhadia University, Udaipur, 2021–2025.
- Senior Secondary (2020) and Secondary (2018) certificates also listed; not shown in the portfolio (low signal).

## Career (verified unless marked)

| Role | Organisation | Dates | Source | Notes |
|---|---|---|---|---|
| Intern (telecommunications) | Bharat Sanchar Nigam Limited (BSNL) | Nov 2023 – Jan 2024 | résumé | Hands-on telecom industry exposure; worked alongside telecom engineers. |
| Intern (full-stack web) | Birla White, UltraTech Cement Ltd. (Aditya Birla Group) | Jul 2024 – Aug 2024 | résumé | Redesign & optimisation of the company website; database maintenance; on-field plant work; cross-functional delivery. |
| Product Intern | SkilliZee | **dates unverified** | owner statement | Timeline shown without dates until confirmed. |
| Product Associate | SkilliZee | **dates unverified** (public SkilliZee repos active Sep 2025 → Nov 2026) | owner statement + repo activity | Most public repos are SkilliZee learning products (POA activities, Olympiad, ZeePrep, SAT reports, Podcast tool). |

## Contact

- GitHub: `https://github.com/CHIRAG-GOUR` — verified, public.
- Email / phone / address appear on the résumé but are **not published** until the owner explicitly approves which ones are public.
- LinkedIn: **not found** — omitted.

## Verified technologies

Verified = appears in a `package.json` dependency list of the owner's own repos, or on the résumé.

| Area | Technologies (evidence) |
|---|---|
| Frontend | React (most repos), Next.js (Olympiad, Eat Better, Podcast tool, Math Activity, Ideathon sites), TypeScript (repo language for 30+ repos), JavaScript, HTML5/CSS (résumé), Tailwind (`tailwind-merge`/`clsx` in many repos), Radix UI (Mangalyan), Framer Motion, GSAP, Rive (LandingPage-PublicSpeaking), Vite (SatPdfMaker client) |
| 3D / WebGL | Three.js, React Three Fiber, Drei, @react-three/postprocessing (POA-Skippi, poaemotions), Theatre.js (physicsmotion2), three-mesh-bvh, OGL (Playbox-School) |
| State & data | Zustand (Eat Better, ZeePrep, Podcast tool, POA-Skippi, gravityphysics), TanStack Query (ZeePrep), Zod (Olympiad), dnd-kit (Olympiad), PapaParse + SheetJS/xlsx (Olympiad, Math Activity, SatPdfMaker) |
| Mobile | React Native + Expo (ZeePrep, Minty Finance), Expo Router, Expo AV/Video, SecureStore, Reanimated |
| Backend | Node.js + Express, Multer, Handlebars, Puppeteer (SatPdfMaker); Firebase Functions + Admin (Podcast tool) |
| Cloud / DB | Firebase Auth / Firestore / Storage / Hosting (ZeePrep, Olympiad, Podcast tool, POA-Skippi), SQL/DBMS (résumé: Student Record System, Casino Management System) |
| AI | Google Gemini API (Podcast tool, SatPdfMaker), Groq SDK (physicsmotion2), face-api.js in-browser vision (Mood-Mirror, poaemotions) |
| Media / docs | FFmpeg, WaveSurfer.js (Podcast tool), jsPDF, html2canvas, html2pdf (StorySprint, ResumeBuilder, Eat Better) |
| Tooling | Git/GitHub, Vercel (30+ deployments), Firebase Hosting, Python + GitHub Actions (profile README engine) |

**Not verified → not shown:** MongoDB, PHP and .NET (résumé says "learning"), Babylon.js.

## Projects — verified, original

| # | Project | Repo / live | Verified from | What it is |
|---|---|---|---|---|
| 1 | **Olympiad Examination Dashboard** | `Olympiad-Activities` · the-olympiad-dashboard.web.app | deps + live URL | Next.js + Firebase exam platform; drag-and-drop (dnd-kit), CSV/Excel import (PapaParse, xlsx), validation (Zod), 3D prompts (R3F). README absent → feature list limited to what deps prove. |
| 2 | **Podcast AI Studio** | `Podcast-Tool-New` · podcast-tool-new.vercel.app | README + deps | Finds viral moments in long videos with Gemini, word-level captions, timeline editor; client-side audio extraction (−85% upload), parallel AI pipeline, multi-format export. |
| 3 | **ZeePrep Mobile** | `ZeePrep-MobileApp` | README + deps | Expo / React Native app on the production ZeePrep Firebase backend: assessments, diagnostic reports, leaderboards, study resources. |
| 4 | **SAT Student Report Generator** | `SatPdfMaker` | README + deps | Express backend: Excel upload → Gemini summaries → 4-page A4 PDFs via Handlebars + Puppeteer; React (Vite) client. Automation. |
| 5 | **Eat Better — Internship Platform** | `Eat-Better-Internship` · eat-better-internship.web.app | deps + live URL | Next.js + R3F + GSAP + Zustand + jsPDF. README is boilerplate → features beyond the stack are unverified. |
| 6 | **Skippi Island (POA)** | `POA-Skippi` · poa-skippi.web.app | README + deps | 3D Shark-Tank case study for grades 4–9; 13 sections, 33 missions, progress counts only real completions; teacher deep links; mentor view. |
| 7 | **Story Sprint (POA)** | `POA-StorySprint` · poa-story-sprint.vercel.app | README + deps | Classroom storytelling activity for smartboards: baton-passing mechanic, 3D parallax story world (R3F), class storybook PDF export. |
| 8 | **Salty × SkilliZee Virtual Internship** | `SaltyRevamp` | HTML content | Five-module virtual internship inside a D2C jewellery brand, with glossaries, experiential tasks and capstones. |
| 9 | **Physics Motion / Gravity / Work-Energy-Power** | `physicsmotion2`, `gravityphysics`, `Work-Energy-Power` | deps + live URLs | Interactive physics learning; Theatre.js animation, Groq AI (physicsmotion2), R3F scenes. |
| 10 | **Mood Mirror** | `Mood-Mirror-2026` · mood-mirror-2026.vercel.app | deps | In-browser facial expression detection (face-api.js) for a public-speaking activity. |
| 11 | **Minty Finance** | `Minty-Finance` | README | Android investment-practice app for students (virtual money, real market data), Expo. |
| 12 | **Celestial Launch (Mangalyaan)** | `Mangalyan-India` · mangalyan-india.vercel.app | README | Aerospace launch scene; README shows it was generated with the **Lovable** AI builder — presented as AI-assisted. |
| 13 | Ideathon / club presentation sites | `IdeathonPPTGuideline2026`, `ClubPPT2026`, … | deps + live URLs | Next.js + R3F presentation microsites for SkilliZee programmes. |
| 14 | Early work | résumé | résumé | Full-stack internship website; Student Record System (12/22–01/23); Casino Management System DBMS project (08/23–09/23). |

## Excluded or unverified

| Item | Reason |
|---|---|
| **SolarSystem3js ("Solaris")** | README credits **Huw Roberts** (Bruno Simon Discord challenge, Feb 2024). Not the owner's original work → excluded. Also featured on the GitHub profile README — flagged to owner. |
| Automated IT Procurement Dashboard | Named by owner; no public repo or local files found → **pending** (needs repo access or description). |
| Voice Bridge | Named by owner; not found → **pending**. |
| SymbioGrid | Named by owner; not found → **pending**. |
| Metrics, users, revenue, awards | None found in any source → none shown. |
| `3JsCityNeon`, `3DArchitectureTool`, `Audio_SkilliZee2` | Empty repositories (0 KB). |

## Assumptions to confirm with the owner

1. Dates for Product Intern and Product Associate at SkilliZee.
2. Which contact channels may be public (email? LinkedIn URL?).
3. Access to the three pending projects.
4. Whether Olympiad / Eat Better feature descriptions beyond their dependency lists are accurate.
