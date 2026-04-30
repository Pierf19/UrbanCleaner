# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UrbanCleaner** is a React + TypeScript SPA for reporting urban cleanliness issues with AI-powered image analysis and WhatsApp integration. Citizens upload street photos, which are analyzed by Mistral AI to categorize cleanliness issues, and then notifications are sent to officers via WhatsApp. Reports and user data are stored in Convex.

## Build, Run, and Development Commands

```bash
# Install dependencies
npm install

# Development server (runs Vite + Convex dev backend)
npm run dev
# Visits http://localhost:5173

# Build for production (TypeScript compilation + Vite bundling)
npm run build

# Lint TypeScript and React code
npm run lint

# Preview production build locally
npm run preview
```

**Environment Setup:**
- `.env.local` contains `VITE_CONVEX_URL` (frontend) and `CONVEX_DEPLOYMENT` (backend connection)
- Convex dashboard secrets (set via `npx convex env` or Convex Dashboard):
  - `MISTRAL_API_KEY` – Mistral AI for image analysis
  - `FONNTE_TOKEN` – Fonnte WhatsApp gateway
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` – Image hosting

**No automated tests yet** – linting is the only code quality check.

## High-Level Architecture

### System Diagram

The application follows a three-tier architecture:

1. **Frontend (React/Vite SPA):** Single-page app where citizens upload street photos
2. **Backend (Convex Serverless):** Handles mutations (write), queries (read), and actions (side effects like AI calls)
3. **External Services:**
   - **Mistral AI** – Analyzes images to score cleanliness (0–100) and recommend actions
   - **Cloudinary** – Stores uploaded images with server-side signed URLs
   - **Fonnte** – WhatsApp gateway to notify officers

### Data Flow

1. User uploads image → frontend extracts location (EXIF or browser GPS) → base64 encodes
2. Frontend calls `analyzeImage` action → Mistral AI returns score, category, recommendation
3. If score < 40 (critical), automatically:
   - Upload image to Cloudinary
   - Save report to Convex DB
   - Send WhatsApp alert to all active officers
4. User can also manually send to a specific officer's phone number

### Project Structure

**Frontend (`src/`):**
- `main.tsx` – React entry point, wraps app in Convex provider
- `App.tsx` – Single root component with image upload, analysis UI, manual send form

**Backend (`convex/`):**
- `schema.ts` – Convex data model (tables: `users`, `reports`)
- `reports.ts` – CRUD mutations/queries for reports and officers (petugas)
- `ai.ts` – Action to call Mistral AI with image analysis prompt
- `whatsapp.ts` – Actions to send WhatsApp via Fonnte (broadcast to all active officers or single recipient)
- `cloudinary.ts` – Action to upload image with crypto-signed Cloudinary URLs
- `_generated/` – Auto-generated Convex types and API client (do not edit)

**Config:**
- `vite.config.ts` – Vite with React and Tailwind CSS v4 plugins
- `tsconfig.json` – References `tsconfig.app.json` (frontend) and `tsconfig.node.json` (build config)
- `tsconfig.app.json` – ES2023 target, strict mode, JSX as React 19, noUnusedLocals/Parameters enforced
- `eslint.config.js` – ESLint 9 flat config with TypeScript, React Hooks, and React Refresh rules
- `convex/tsconfig.json` – Convex-specific TypeScript config for serverless functions

### Key Patterns and Conventions

**Convex Integration:**
- Use `useMutation()` to call write operations from `reports.ts`
- Use `useAction()` to call side-effect operations from `ai.ts`, `whatsapp.ts`, `cloudinary.ts`
- Use `useQuery()` to call read operations from `reports.ts`
- API client auto-generated at `convex/_generated/api.ts` – import via `@ts-ignore` to bypass strict types
- All async calls wrapped in try-catch with user-facing alerts

**Phone Number Format:**
- All phone numbers must start with `62` (Indonesia country code)
- `addUser()` and `updateUser()` auto-prepend `62` if missing

**Image Processing:**
- Location extracted from EXIF metadata first, then falls back to browser Geolocation API
- Images converted to base64 client-side, sent to actions, then uploaded to Cloudinary
- Mistral AI receives base64 as data URL in JSON request body

**WhatsApp Messaging:**
- Two actions: `sendWhatsApp()` (broadcast to all active officers) and `sendWhatsAppSingle()` (single recipient)
- Auto-send triggered on score < 40; includes location link and image URL
- Message body formatted with emojis and scoring context

**AI Analysis:**
- Mistral API uses `pixtral-12b-2409` model with vision capabilities
- Prompt in Indonesian; requires JSON response format
- Fallback: if API quota exhausted, returns simulated score (20–80) with note
- Score categories: 70–100 (bersih/"clean"), 40–69 (sedang/"medium"), 0–39 (kotor/"dirty")

**Styling:**
- Tailwind CSS v4 via `@tailwindcss/vite` plugin
- No component library; UI built with Tailwind + Lucide React icons
- Responsive grid layout (1 col mobile, 2 cols desktop)
- Color scheme: green for clean/success, amber for medium, red for critical

### Dependencies and Versions

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.5 | UI framework |
| `convex` | ^1.36.1 | Serverless backend + real-time DB |
| `tailwindcss` | ^4.2.2 | Styling |
| `lucide-react` | ^1.8.0 | SVG icons |
| `exifr` | ^7.1.3 | Extract GPS from image EXIF |
| `typescript` | ~6.0.2 | Type checking |
| `vite` | ^8.0.9 | Build tool + dev server |

## Important Notes

- **No build output committed:** `dist/` and `node_modules/` in `.gitignore`
- **Convex functions are serverless:** All external API calls happen server-side; never expose keys in frontend code
- **Real-time potential:** Convex supports subscriptions via `useQuery()` – can be used for live report feeds
- **Indonesian localization:** UI text, prompts, and recommendations are in Indonesian; consider i18n for future expansion
- **Cloudinary signatures:** Generated server-side in `cloudinary.ts` using SHA-1 hash; required for unsigned uploads
- **HTTPS only:** All external APIs (Mistral, Fonnte, Cloudinary) require HTTPS

