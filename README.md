# UrbanCleaner

A React + TypeScript application for reporting and managing urban cleanliness issues with WhatsApp integration.

## Overview

UrbanCleaner enables citizens to report cleanliness issues in their cities through a simple interface, with automated processing via AI and notifications through WhatsApp.

## Architecture

```mermaid
C4Context
    title System Context Diagram for UrbanCleaner
    
    Person(user, "Citizen", "Reports cleanliness issues")
    System_Boundary(b1, "UrbanCleaner System") {
        System(ui, "Web Interface", "React/Vite SPA for submitting reports")
        System(api, "Backend", "Convex serverless functions")
        SystemDb(db, "Database", "Stores reports and user data")
        System_Ext(ai, "AI Service", "Processes images and generates recommendations", technology="External AI")
        System_Ext(whatsapp, "WhatsApp API", "Sends notifications", technology="WhatsApp Business API")
    }
    
    Rel(user, ui, "Submits reports with photos", "HTTPS")
    Rel(ui, api, "Sends report data", "HTTPS")
    Rel(api, db, "Stores/retrieves data", "Database")
    Rel(api, ai, "Requests image processing", "HTTPS")
    Rel(ai, api, "Returns analysis results", "HTTPS")
    Rel(api, whatsapp, "Sends notifications", "HTTPS")
    Rel(whatsapp, user, "Sends confirmation/update", "WhatsApp")
```

## Data Flow

```mermaid
sequenceDiagram
    participant User as Citizen
    participant UI as Web Interface
    participant API as Convex Backend
    participant DB as Database
    participant AI as AI Service
    participant WA as WhatsApp

    User->>UI: Submit report with photo
    UI->>API: POST /api/reports
    API->>DB: Store initial report
    API->>AI: Send image for analysis
    AI-->>API: Return analysis (score, category, recommendation)
    API->>DB: Update report with AI results
    API->>WA: Send confirmation message
    WA-->>User: WhatsApp notification
    API-->>UI: Report submission confirmation
```

## Database Schema

```mermaid
erDiagram
    USERS {
        string phone PK
        string name
        boolean active
    }
    REPORTS {
        number id PK
        number score
        string category
        string recommendation
        number latitude
        number longitude
        string imageUrl
        number createdAt
    }
    USERS ||..|{ REPORTS : submits
```

## Features

- **Photo Submission**: Users can upload photos of cleanliness issues
- **AI Analysis**: Automatic image processing to categorize issues and provide recommendations
- **WhatsApp Integration**: Real-time notifications and updates via WhatsApp
- **Location Tagging**: GPS coordinates for precise issue reporting
- **Issue Tracking**: Categorization and scoring of reported issues

## Tech Stack

- **Frontend**: React 19 + TypeScript 6 + Vite
- **Styling**: Tailwind CSS 4
- **Backend**: Convex (serverless functions, database, real-time)
- **AI Integration**: External AI service for image analysis
- **Communication**: WhatsApp Business API

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Convex account
- WhatsApp Business API access
- AI service credentials

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd UrbanCleaner
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your Convex URL and other secrets
```

4. Start development server
```bash
npm run dev
```

## Project Structure

```mermaid
flowchart TD
    A[Root] --> B[src/]
    A --> C[convex/]
    A --> D[public/]
    
    B --> B1[main.tsx]
    B --> B2[App.tsx]
    B --> B3[index.css]
    B --> B4[components/]
    B --> B5[hooks/]
    B --> B6[utils/]
    
    C --> C1[schema.ts]
    C --> C2[reports.ts]
    C --> C3[ai.ts]
    C --> C4[whatsapp.ts]
    C --> C5[_generated/]
    
    style A fill:#f9f,stroke:#333
    style C fill:#bbf,stroke:#333
```

## Development Commands

```bash
npm run dev      # Start development server (http://localhost:5173)
npm run build    # Build for production (tsc -b && vite build)
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

## API Guidelines

### Convex Functions

- **Mutations**: Use `useMutation()` for creating/updating reports
- **Actions**: Use `useAction()` for AI processing and WhatsApp messaging
- **Queries**: Use `useQuery()` for retrieving reports and user data

### Phone Number Format

All phone numbers must follow Indonesian format:
- Must start with `62`
- Example: `628123456789`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Last Updated

April 29, 2026