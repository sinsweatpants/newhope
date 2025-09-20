# Replit.md

## Overview

This is a modern full-stack web application that combines a React frontend with an Express backend, focused on screenplay processing functionality. The application processes pasted screenplay text, formats it according to industry standards, and displays it in a paginated format resembling standard screenplay layout with proper margins and styling.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **UI Library**: Comprehensive shadcn/ui component system with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming and specialized screenplay formatting
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation schemas

### Backend Architecture
- **Runtime**: Node.js with Express framework
- **Language**: TypeScript with ES modules
- **Development**: Hot reload with Vite middleware integration in development mode
- **Storage**: Abstract storage interface with in-memory implementation (easily replaceable with database)
- **Build Process**: ESBuild for production bundling

### Core Screenplay Processing System
- **ScreenplayCoordinator**: Central formatting engine that classifies text lines and applies appropriate styling
- **ScreenplayPasteProcessor**: Handles clipboard events, processes text line-by-line, and manages page layout
- **Format Classification**: Automatic detection of screenplay elements (scene headers, character names, dialogue, action lines, etc.)
- **Page Layout**: A4 page format with industry-standard 1-inch margins and automatic page breaks

### Database Integration
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema**: User authentication schema with username/password fields
- **Migration**: Drizzle Kit for schema migrations
- **Connection**: Neon Database serverless PostgreSQL connection

### Styling and Design System
- **CSS Architecture**: CSS custom properties for consistent theming across light/dark modes
- **Component System**: Modular UI components with variant-based styling using class-variance-authority
- **Typography**: Multiple font families (Inter, Georgia, Courier New) for different content types
- **Responsive Design**: Mobile-first approach with responsive breakpoints

### Development and Build Configuration
- **TypeScript**: Strict configuration with path mapping for clean imports
- **Build Pipeline**: Separate client and server builds with optimized production output
- **Asset Management**: Vite handles client assets, Express serves static files in production
- **Hot Reload**: Development server with HMR for both client and server code

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Router (Wouter)
- **Backend**: Express.js with TypeScript support
- **Build Tools**: Vite, ESBuild, TypeScript compiler

### UI and Styling
- **Component Library**: Complete Radix UI primitive collection (40+ components)
- **Styling**: Tailwind CSS with PostCSS processing
- **Icons**: Lucide React icon library
- **Utilities**: clsx and tailwind-merge for conditional styling

### Data and State Management
- **HTTP Client**: TanStack Query for server state management
- **Form Management**: React Hook Form with Hookform Resolvers
- **Validation**: Zod schema validation library
- **Database**: Drizzle ORM with Drizzle Kit for migrations

### Database and Storage
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Connection**: @neondatabase/serverless driver
- **Session Storage**: connect-pg-simple for PostgreSQL session storage
- **Schema Validation**: drizzle-zod for database schema validation

### Development Tools
- **Replit Integration**: Specialized Vite plugins for Replit environment
- **Error Handling**: Runtime error overlay for development
- **Code Quality**: TypeScript strict mode with comprehensive type checking

### Utility Libraries
- **Date Handling**: date-fns for date manipulation
- **Carousel**: Embla Carousel React for image/content carousels
- **Command Interface**: cmdk for command palette functionality
- **Trace Mapping**: @jridgewell/trace-mapping for source map support