# Food Delivery Application

## Overview
This project is a comprehensive food delivery web application designed to manage orders, real-time communication, location services, and a wallet-based payment system across Customer, Rider, Merchant, and Admin portals. It aims to streamline operations and enhance user experience through complex delivery logistics, multi-order bookings for riders, dynamic pricing, and extensive administrative controls. The application provides a complete ecosystem for food delivery, focusing on efficiency, user satisfaction, and operational scalability.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend is built with React and TypeScript (Vite), utilizing Shadcn/ui (Radix UI primitives) and Tailwind CSS for a responsive, user-friendly interface tailored to each user role. Custom design tokens ensure consistency.

### Technical Implementations
- **Backend**: Node.js with Express.js.
- **Database**: PostgreSQL with Drizzle ORM.
- **Authentication**: Passport.js for local, session-based authentication with Scrypt hashing and role-based access control.
- **Real-time**: Custom WebSocket for chat and order tracking.
- **API**: RESTful endpoints with robust access control.
- **State Management**: TanStack Query for server state and React hooks for local state.
- **Form Handling**: React Hook Form with Zod validation.
- **Routing**: Wouter.
- **Database Design**: Relational schema with Users, Restaurants, Orders, Riders, Wallets, and many-to-many relationships, utilizing enums and foreign key constraints.
- **Real-time Features**: Custom WebSocket server for live updates, order-specific chat, real-time order status tracking, and rider information visibility. Supports multi-merchant order chat.
- **Location Services**: Browser Geolocation API, OpenStreetMap Nominatim API for geocoding, Haversine formula for delivery fees, and saved addresses. Merchants use Leaflet maps for store location.

### Feature Specifications
- **Business Logic**: Multi-tier pricing including markup, delivery fees, merchant fees, and convenience fees.
- **Wallet System**: Pre-funded rider wallets with configurable commission deduction.
- **Order Management**: Complex order states, merchant item management, real-time recalculations, and audit trails.
- **Inventory Control**: Real-time availability tracking.
- **Product Options**: Two-level system for global option types and merchant-defined values, with options reflected in cart and checkout pricing.
- **Multi-Merchant Checkout & Order Grouping**: Secure, atomic transaction-based system with admin controls for limits, server-side `orderGroupId` generation, and pessimistic locking for rider assignment. Includes a configurable multi-merchant fee.
- **Store Management (Admin)**: CRUD operations for restaurants, status toggling, and markup configuration.
- **Payment Method Controls**: Admin-configurable activation/deactivation of COD, GCash, Maya, Debit/Credit Card.
- **Rider Booking Restrictions**: Admin-configurable limits on rider order capacity with specific rules for multi-merchant orders (e.g., riders can only accept one multi-merchant order at a time).
- **Admin Management**: Owner portal includes comprehensive admin account management (list, view details, delete) with owner-only access.
- **Analytics & Reporting**: Admin dashboard for revenue, orders, users, delivery, and product analytics with date range filtering.

## External Dependencies

### Database & ORM
- **Neon Database**: PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database operations.
- **connect-pg-simple**: PostgreSQL session store.

### UI & Styling
- **Radix UI**: Headless component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Class Variance Authority**: Type-safe variant generation.

### Authentication & Security
- **Passport.js**: Authentication middleware.
- **bcryptjs**: Password hashing.
- **Express Session**: Session management.

### Development & Build Tools
- **Vite**: Fast build tool.
- **TypeScript**: Type safety.

### State Management & API
- **TanStack Query**: Server state management.
- **React Hook Form**: Form library.
- **Zod**: Runtime type validation.
- **Wouter**: Routing library.

### Real-time & Communication
- **WebSocket (ws)**: Native WebSocket implementation.
- **CORS**: Cross-origin resource sharing middleware.

### File Handling & Media
- **Multer**: Secure server-side file uploads.

### Location & Maps
- **OpenStreetMap**: Map provider.
- **Nominatim API**: Geocoding service.
- **Geolocation API**: Browser-based location detection.