# Food Delivery Application

## Overview
This project is a comprehensive food delivery web application with Customer, Rider, Merchant, and Admin portals. It manages orders, real-time communication, location services, and a wallet-based payment system. The application features complex delivery logistics with multi-order bookings for riders, dynamic pricing, and extensive administrative controls, aiming to streamline operations and enhance user experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (October 2025)
- **Fixed Multi-Merchant Order Filtering in Rider Portal**: Corrected the order tab filtering logic to properly handle multi-merchant orders. Previously, a multi-merchant order group would incorrectly move to "Order History" when only ONE merchant order was delivered. Now correctly remains in "Active Orders" until ALL merchant orders in the group are delivered or cancelled. Updated filtering uses `.some()` for active orders (ANY merchant order still active) and `.every()` for historical orders (ALL merchant orders delivered/cancelled). Also fixed stats calculations (today's earnings, success rate) to properly account for multi-merchant order completion status.

## System Architecture

### UI/UX Decisions
- **Frontend**: React with TypeScript (Vite)
- **UI**: Shadcn/ui (Radix UI primitives), Tailwind CSS (custom tokens)
- **Design Principles**: Responsive, user-friendly interfaces tailored for each user role.

### Technical Implementations
- **Backend**: Node.js with Express.js, PostgreSQL with Drizzle ORM.
- **Authentication**: Passport.js (local, session-based), Scrypt hashing, role-based access control.
- **Real-time**: Custom WebSocket for chat and order tracking.
- **API**: RESTful endpoints with robust access control.
- **State Management**: TanStack Query (server), React hooks (local).
- **Form Handling**: React Hook Form with Zod validation.
- **Routing**: Wouter.
- **Database Design**: Relational schema with key entities like Users, Restaurants, Orders, Riders, Wallets, and complex many-to-many relationships. Enums are used for roles and statuses, and foreign key constraints ensure data integrity.
- **Authentication & Authorization**: Session management with PostgreSQL store, secure password reset system with email verification and token management, multi-level access control for Admin, Merchant, Rider, and Customer roles.
- **Real-time Features**: Custom WebSocket server for live updates, order-specific chat across all user types, real-time order status tracking, and rider information visibility (name, phone) for customers, merchants, and admins. Supports multi-merchant order chat with separate threads for individual orders within a grouped delivery.
- **Location Services**: Browser Geolocation API for precise coordinates, OpenStreetMap Nominatim API for geocoding, Haversine formula for distance-based delivery fees, and a comprehensive saved addresses system. Merchants can set their store location via an interactive Leaflet map. Riders have "View on Map" functionality for delivery addresses.

### Feature Specifications
- **Business Logic**: Multi-tier pricing (markup, delivery, merchant, convenience fees).
- **Wallet System**: Pre-funded rider wallets with configurable commission deduction.
- **Order Management**: Complex order states, merchant item management, comprehensive order editing, real-time recalculations, and audit trails.
- **Inventory Control**: Real-time availability tracking.
- **Product Options**: Two-level system for global option types and merchant-defined values.
- **Multi-Merchant Checkout & Order Grouping**: Secure, atomic transaction-based system for ordering from multiple merchants, including admin controls for limits, server-side `orderGroupId` generation, and pessimistic row-level locking for rider assignment.
- **Store Management (Admin)**: Comprehensive restaurant management with CRUD operations, status toggling, and markup configuration.
- **Payment Method Controls**: Admin configurable payment method activation/deactivation (COD, GCash, Maya, Debit/Credit Card).
- **Rider Booking Restrictions**: Admin-configurable system to limit rider order capacity with special rules for multi-merchant orders:
  - **Multi-Merchant Priority Rules**: Riders can only accept ONE multi-merchant order at a time. When active, blocks all other order acceptances (single or multi-merchant). Cannot accept multi-merchant orders if rider has ANY active single-merchant orders.
  - **Single-Merchant Rules**: Follows max booking limit (counted by unique customers). Cannot accept if rider has active multi-merchant order.
  - **Backend**: POST/PATCH `/api/orders/:id` validates restrictions in priority order, returns HTTP 429 with specific error messages.
  - **Frontend**: Rider portal displays context-aware messages ("Multi-Merchant Order Active" or "Booking Limit Reached").
- **Analytics & Reporting**: Comprehensive admin dashboard for revenue, orders, users, delivery, and product analytics with date range filtering.

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
- **ESBuild**: JavaScript bundler.
- **PostCSS**: CSS processing.

### State Management & API
- **TanStack Query**: Server state management.
- **React Hook Form**: Form library.
- **Zod**: Runtime type validation.
- **Wouter**: Routing library.

### Real-time & Communication
- **WebSocket (ws)**: Native WebSocket implementation.
- **CORS**: Cross-origin resource sharing middleware.

### File Handling & Media
- **Multer**: Secure server-side file uploads for restaurant and menu item images.

### Location & Maps
- **OpenStreetMap**: Map provider.
- **Nominatim API**: Geocoding service.
- **Geolocation API**: Browser-based location detection.