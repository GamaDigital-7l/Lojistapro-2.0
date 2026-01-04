# Lojista Pro 2.0 - AI Development Rules

## Tech Stack Overview

- **Frontend Framework**: React 19+ with TypeScript for type safety and modern hooks
- **State Management**: React Context API with useReducer for global app state management
- **Database/Backend**: Supabase for PostgreSQL database, authentication, and real-time features
- **UI/Styling**: Tailwind CSS for utility-first styling with custom design system
- **Icons**: Lucide React for consistent, modern iconography
- **AI Integration**: Google Gemini API for natural language processing and chat functionality
- **Build Tool**: Vite for fast development and optimized production builds
- **Deployment**: Docker containerization with Nginx for production serving

## Library Usage Rules

### React & Core Libraries
- **React**: Only use functional components with hooks. No class components.
- **TypeScript**: All new files must be properly typed. Use interfaces for object shapes.
- **State Management**: Use React Context (AppContext) for global state. Local state with useState/useReducer.
- **Routing**: No external routing library. Manage views through AppContext's `activeView` state.

### UI & Styling
- **Tailwind CSS**: Use exclusively for all styling. No inline styles or CSS modules.
- **Icons**: Use Lucide React icons only. Import individual icons as needed.
- **Responsive Design**: Mobile-first approach with Tailwind responsive prefixes (sm:, lg:, etc.).
- **Animations**: Prefer Tailwind's animation utilities or CSS-in-JS with Tailwind classes.

### Data & API
- **Supabase**: Use the configured supabaseClient from services/supabaseClient.ts
- **Database Operations**: All database operations must go through services/databaseService.ts
- **Real-time**: Use Supabase subscriptions for real-time data updates
- **Error Handling**: Implement proper error boundaries and user-friendly error messages

### AI & External Services
- **AI Service**: Use services/geminiService.ts for all AI-related operations
- **API Keys**: Store API keys in Supabase settings table, never in frontend code
- **Timeouts**: Implement reasonable timeouts for all external API calls (15 seconds max)

### File Structure & Organization
- **Components**: Place in src/components/ folder, one component per file
- **Pages**: Place in src/pages/ folder for main views
- **Services**: All API and external service calls in src/services/ folder
- **Types**: Centralize all TypeScript interfaces in src/types.ts
- **Constants**: Use src/constants.ts for shared constants and configuration

### Code Quality
- **Imports**: Use absolute imports with @ alias when possible
- **Component Size**: Keep components under 100 lines. Refactor larger components.
- **Performance**: Use React.memo, useMemo, and useCallback appropriately
- **Accessibility**: Include proper ARIA labels and semantic HTML
- **Error Handling**: Never use try/catch blocks unless specifically requested. Let errors bubble up.

### Security
- **Authentication**: Use Supabase Auth only. No custom authentication
- **API Keys**: Never expose secret keys in frontend. Use environment variables or secure storage
- **Data Validation**: Validate all user inputs before processing
- **Row Level Security**: Implement RLS policies in Supabase for all tables

### Development Rules
- **No New Dependencies**: Do not add new npm packages without explicit approval
- **Shadcn UI**: Use prebuilt shadcn/ui components when available
- **Database Schema**: Do not modify database structure without proper migration
- **Environment Variables**: Use .env.example as reference for required variables

### Prohibited Practices
- **No Class Components**: Functional components only
- **No Inline Styles**: Use Tailwind classes exclusively
- **No console.log**: Remove or comment out console.log before production
- **No Hardcoded Values**: Use constants or environment variables
- **No Direct DOM Manipulation**: Use React state and refs appropriately
- **No External Routing**: Stick to the established view management system