# Food Delivery Application

## Overview

This is a comprehensive food delivery web application with four distinct user portals: Customer, Rider, Merchant, and Admin. The system facilitates order management, real-time communication, location services, and payment processing through a wallet-based system. The application supports complex delivery logistics with features like multiple order bookings for riders, dynamic pricing, and comprehensive admin controls.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query for server state and React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with local strategy and session-based auth
- **Real-time Communication**: WebSocket implementation for chat and order tracking
- **API Design**: RESTful endpoints with role-based access control

### Database Design
- **Schema**: Comprehensive relational schema with enums for user roles, order statuses, and approval workflows
- **Key Entities**: Users, Restaurants, Menu Items, Orders, Riders, Wallets, Chat Messages, System Settings
- **Relationships**: Complex many-to-many relationships between orders, riders, and restaurants
- **Data Integrity**: Foreign key constraints and approval status tracking

### Authentication & Authorization
- **Session Management**: Express sessions with PostgreSQL session store
- **Password Security**: Scrypt-based password hashing with salt
- **Role-based Access**: Four distinct user roles with different permissions
- **Approval Workflows**: Admin approval required for riders and merchants, OTP verification for customers

### Real-time Features
- **WebSocket Server**: Custom WebSocket implementation for live updates
- **Chat System**: Order-specific chat between customers, riders, merchants, and admin
- **Order Tracking**: Real-time status updates for order progression
- **Notifications**: Live notifications for order events and status changes

### Location Services
- **GPS Integration**: Current location detection for customers and merchants
- **Distance Calculation**: Dynamic delivery fee calculation based on distance
- **Address Management**: Manual address input with landmark support

### Business Logic
- **Pricing Model**: Multi-tier pricing with markup, delivery fees, merchant fees, and convenience fees
- **Wallet System**: Pre-funded wallets for riders with commission deduction
- **Order Management**: Complex order states with merchant-specific item management
- **Inventory Control**: Real-time availability tracking with alternative item suggestions

## External Dependencies

### Database & ORM
- **Neon Database**: PostgreSQL hosting with serverless connection pooling
- **Drizzle ORM**: Type-safe database operations with migration support
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI & Styling
- **Radix UI**: Headless component library for accessible UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe variant generation for components

### Authentication & Security
- **Passport.js**: Authentication middleware with local strategy
- **bcryptjs**: Password hashing library for secure authentication
- **Express Session**: Session management with secure cookie handling

### Development & Build Tools
- **Vite**: Fast build tool with HMR and optimized production builds
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind and Autoprefixer

### State Management & API
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Performant form library with validation
- **Zod**: Runtime type validation and schema parsing
- **Wouter**: Lightweight routing library for React

### Real-time & Communication
- **WebSocket (ws)**: Native WebSocket implementation for real-time features
- **CORS**: Cross-origin resource sharing middleware
- **Socket.io**: Planned upgrade for enhanced real-time communication

### File Handling & Media
- **File Upload Components**: Custom file upload with validation and preview
- **Image Processing**: Support for restaurant, menu, and user profile images
- **Document Management**: Rider verification documents (OR/CR, Motor, ID)

### Location & Maps
- **Google Maps API**: Planned integration for location services and routing
- **Geolocation API**: Browser-based location detection
- **Distance Calculation**: Custom algorithms for delivery fee computation