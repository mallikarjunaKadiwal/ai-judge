🚀 AI Judge: SDE Intern Assignment
This is a full-stack Next.js application built for the Vaquill SDE Intern assignment. It functions as a "mock trial" platform where two parties can submit evidence, receive an initial verdict from an AI judge, and then engage in a limited number of follow-up arguments, which the AI re-evaluates in real-time.

1. Project Demo (Visual Walkthrough)
Here is a visual walkthrough of the application's core functionality.
**[Watch the Demo on Loom](https://www.loom.com/share/e59f3f8a5a014e89ad1cb61165b2cb10)**

1. Initial Trial & Verdict
Users on "Side A" and "Side B" can paste their text evidence into the respective text areas.

After clicking "Start Trial," the application contacts the AI, which returns an initial verdict in the center panel. The argument section now becomes visible.

2. Argument & Re-evaluation
Either side can now submit a follow-up argument. Here, Side A submits an argument.

After Side A submits, the AI "thinks again" and provides a re-evaluation. This new response appears in the chat history for both sides, ensuring transparency.

3. Argument Limit
The application correctly enforces the 5-argument limit. After 5 total arguments are submitted, the input boxes are locked, and a message appears.

2. How to Run This Project
Clone this repository.

Install dependencies:

Bash

npm install
Create a .env file in the root directory.

Add your Neon database URL (from Vercel) and your OpenRouter API key:

Code snippet

# Vercel Neon Database
POSTGRES_PRISMA_URL="..."
POSTGRES_URL_NON_POOLING="..."

# OpenRouter API Key
OPENROUTER_API_KEY="sk-or-..."
Push the database schema to Vercel Postgres:

Bash

npx prisma db push
Run the development server:

Bash

npm run dev
3. Tech Stack
Framework: Next.js (with TypeScript)

Backend: Next.js API Routes (Node.js Runtime)

Frontend: React (Client Components) with Tailwind CSS

Database: Vercel Postgres (Serverless Neon)

ORM: Prisma

LLM API: OpenRouter (using the openai SDK and mistralai/mistral-7b-instruct:free)

Deployment: Vercel

4. Key Development Decisions
On Supporting Text-Only vs. File Uploads
The initial goal was to support .pdf and .docx uploads. However, during development, I encountered deep-level bundler conflicts between file-parsing libraries (like pdf-parse and mammoth) and the Next.js Webpack environment. This resulted in critical, non-trivial runtime errors (TypeError: Object.defineProperty called on non-object) that are well-documented in the Next.js community.

Rather than submit a non-functional project, I made the strategic engineering decision to pivot to a text-only system. This allowed me to deliver a robust, end-to-end, and fully functional application that still meets all core assignment objectives: a full-stack architecture, database integration, complex state management, and real-time LLM logic.

5. Answers to Assignment Questions
1. UI/UX & Product Strategy
UI: The UI is a clean 3-panel layout, with the "AI Judge" as the central focus. The "Argument" phase is intentionally hidden until an initial verdict is rendered, creating a clear, step-by-step user flow.

Product Strategy: I disabled the initial text boxes after a trial starts to prevent invalid data or state confusion. The most important strategic decision was to implement a shared chat history so both sides can see the AI's re-evaluations, ensuring transparency and fairness in the "mock trial."

2. Originality & Product Improvements
This tool is a strong proof-of-concept. It could be productized with:

RAG (Retrieval-Augmented Generation): The AI could be fed a vector database of actual legal precedents, allowing it to cite specific case law in its verdicts.

Evidence Tagging: Allowing users to highlight specific sentences in their evidence (e.g., "Exhibit A") and having the AI's verdict reference these tags directly.

Jurisdiction Toggling: A dropdown to select a country, which would change the AI's system prompt to follow (e.g.) Indian, UK, or US legal principles.

3. Code Quality & Modularity
Full-Stack: The project is a full-stack Next.js application, with a clear separation between the frontend UI (src/app/page.tsx) and the backend API routes (/api/case and /api/argue).

Modular UI: The argument/chat interface was built as a reusable React component (ArgumentChat). This component is self-contained and communicates with the main page via props and a callback function (onNewArgument). This is a highly modular and scalable design.

Database: All database logic is handled safely via the Prisma ORM, which prevents SQL injection and simplifies queries. All API secrets are stored securely in environment variables.

4. Scalability (for 1000s of users)
This architecture is infinitely scalable with zero manual configuration.

Serverless Compute: Vercel's serverless functions (which run the API routes) automatically scale up or down to handle any number of users, from one to one million.

Serverless Database: Vercel Postgres (Neon) is a serverless database that automatically scales storage and connections. This architecture will never hit a traditional database or server bottleneck.

5. Caching Strategy
Frontend: Vercel automatically caches the static parts of the application at the Edge for fast loads.

Backend (Production): For a production-level app, I would implement stale-while-revalidate (SWR) caching on the frontend to cache verdicts for a short time, reducing API calls. On the backend, we could use Vercel KV (serverless Redis) to cache costly LLM responses for identical arguments, improving speed and reducing cost.

6. Deployment & Tools
Deployment: The project is deployed on Vercel.

Database: Vercel Postgres (powered by Neon).

CI/CD: Vercel is connected directly to this GitHub repository. Every git push to the main branch automatically triggers a new, live deployment.

Secrets: All API keys (OPENROUTER_API_KEY, POSTGRES...) are stored securely as Environment Variables in Vercel.

7. Impact on Judicial Systems
Reducing Backlogs: In a system like India's, with a large case backlog, this tool could act as a "first-pass" mediation or arbitration service.

Accessibility: It could help two parties in a small claims dispute (like a buyer-seller issue) reach a fair, AI-moderated settlement before ever needing to hire lawyers or go to court, saving everyone significant time and money.
