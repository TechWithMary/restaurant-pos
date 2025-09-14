# POS Restaurant System

## Overview

This is a modern Point of Sale (POS) system designed specifically for restaurants. The application provides a touch-friendly interface for taking orders, managing menu items, and processing transactions. Built with React and TypeScript, it features a three-column layout with categories, products, and order summary sections optimized for restaurant workflow efficiency.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with custom design system focused on touch interactions
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Design System**: Material Design principles with custom restaurant-focused color palette and typography

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Language**: TypeScript with ES modules
- **Development**: Hot module replacement via Vite integration
- **Data Storage**: In-memory storage with interface abstraction for easy database migration
- **API Design**: RESTful endpoints for categories, products, and order management

### Database Schema
The application uses Drizzle ORM with PostgreSQL schema definitions:
- **Categories**: ID, name, and icon fields for menu organization
- **Products**: ID, name, description, price, and category relationship
- **Order Items**: ID, product reference, quantity, and optional order grouping
- **Type Safety**: Zod schemas for runtime validation and TypeScript type generation

### Component Architecture
- **Layout**: Three-column responsive grid (1fr 2fr 1fr ratio)
- **CategoryList**: Left sidebar with touch-friendly 60px height items
- **ProductGrid**: Center area with 2-3 column responsive product cards
- **OrderSummary**: Right sidebar with order management and checkout
- **Touch Optimization**: Minimum 48px touch targets and 140px card heights

### Design System Features
- **Color Palette**: Restaurant-themed green primary with light/dark mode support
- **Typography**: Inter font via Google Fonts with weight variations for hierarchy
- **Spacing**: Consistent Tailwind units (2, 4, 6, 8) for uniform layout
- **Interactive States**: Hover elevations and active state feedback
- **Accessibility**: Focus rings, ARIA labels, and semantic HTML structure

## External Dependencies

### UI and Styling
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework with custom design tokens
- **class-variance-authority**: Type-safe variant API for component styling
- **lucide-react**: Modern icon library for consistent iconography

### Data Management
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm**: Type-safe SQL query builder and migrations
- **drizzle-zod**: Runtime schema validation integration
- **@neondatabase/serverless**: PostgreSQL database connection (configured but not actively used)

### Development Tools
- **vite**: Fast build tool with HMR and TypeScript support
- **tsx**: TypeScript execution for server development
- **@replit/vite-plugin-***: Replit-specific development enhancements
- **esbuild**: Fast JavaScript bundler for production builds

### Form and Validation
- **react-hook-form**: Performant form library with minimal re-renders
- **@hookform/resolvers**: Validation resolver integrations
- **zod**: TypeScript-first schema validation

### Additional Libraries
- **date-fns**: Modern date utility library
- **wouter**: Lightweight routing solution
- **express**: Web application framework for Node.js
- **cmdk**: Command palette component for search functionality