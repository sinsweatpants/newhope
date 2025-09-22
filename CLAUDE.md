# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **DoodleDuel**, a monorepo containing a screenplay editor application with Arabic/RTL text support. The project is built with React/TypeScript frontend, Express backend, and uses Firebase for deployment.

## Commands

### Development
- `npm run dev` - Start development server (backend only, frontend served via Vite middleware)
- `npm run build` - Build both frontend and backend for production
- `npm run build:frontend` - Build frontend only using Vite
- `npm run build:backend` - Build backend only using esbuild
- `npm run start` - Start production server
- `npm run check` - TypeScript type checking across the entire monorepo
- `npm run db:push` - Push database schema changes using Drizzle

## Architecture

### Monorepo Structure
This is a workspace-based monorepo with:
- `apps/frontend/` - React/TypeScript Vite application
- `apps/backend/` - Express server with TypeScript
- `packages/shared/` - Shared code and types used by both frontend and backend

### Path Aliases
- `@shared/*` maps to `packages/shared/*`
- `@frontend/*` maps to `apps/frontend/src/*`
- `@backend/*` maps to `apps/backend/src/*`

### Screenplay Engine Architecture

The core screenplay formatting system is located in `packages/shared/screenplay/`:

- **ScreenplayCoordinator** (`coordinator.ts`) - Main orchestrator that processes screenplay text using agent-based pattern matching
- **Formatting Agents** (`agents.ts`) - Individual processors for different screenplay elements (characters, dialogue, scene headers, etc.)
- **Pattern Matching** (`patterns.ts`) - Regular expressions and matching logic for Arabic/English screenplay elements
- **Format Styles** (`formatStyles.ts`) - CSS styling functions for different screenplay element types
- **Custom Styles Manager** (`customStylesManager.ts`) - User-defined style management system

### Key Screenplay Features
- **Arabic/RTL Support** - Built-in right-to-left text handling
- **Agent-Based Processing** - Each line is processed by specialized agents (BasmalaAgent, CharacterDialogueAgent, SceneHeaderAgent, etc.)
- **Context-Aware Formatting** - Agents maintain context across lines for intelligent formatting decisions
- **Custom Styling System** - Users can create and manage custom text styles
- **Automatic Spacing** - Intelligent insertion of spacing between different screenplay elements

### Frontend Architecture
- **Component Structure**: Modular toolbar components (`ClipboardToolbar`, `EditingToolbar`, `FontToolbar`, etc.)
- **Main Editor**: `ScreenplayEditor.tsx` is the primary editing interface
- **UI Framework**: Radix UI components with Tailwind CSS styling
- **State Management**: React hooks with local state, TanStack Query for server state

### Backend Architecture
- **Express Server** with session management
- **Vite Integration** - Development server uses Vite middleware for hot reloading
- **Database**: Drizzle ORM with schema definitions in `packages/shared/schema/`

### Development Notes
- The project uses **Firebase Studio** for deployment and preview
- TypeScript configuration is centralized in `configs/tsconfig.base.json`
- Vite configuration handles both development and production builds
- The editor supports paste handling with automatic formatting via the screenplay agents