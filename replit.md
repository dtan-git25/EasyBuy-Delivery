# Food Delivery Application

## Overview
This project is a comprehensive food delivery web application featuring Customer, Rider, Merchant, and Admin portals. It handles order management, real-time communication, location services, and a wallet-based payment system. Key capabilities include complex delivery logistics with multiple order bookings for riders, dynamic pricing, and extensive administrative controls. The application aims to streamline food delivery operations and enhance user experience across all stakeholders.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite)
- **UI**: Shadcn/ui (Radix UI primitives), Tailwind CSS (custom tokens)
- **State Management**: TanStack Query (server state), React hooks (local state)
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js (local strategy, session-based)
- **Real-time**: Custom WebSocket implementation for chat and order tracking
- **API**: RESTful endpoints with role-based access control

### Database Design
- **Schema**: Relational schema with enums for roles, statuses, and workflows.
- **Key Entities**: Users, Restaurants, Menu Items, Orders, Riders, Wallets, Chat Messages, System Settings, Saved Addresses.
- **Relationships**: Complex many-to-many relationships for orders, riders, and restaurants.
- **Data Integrity**: Foreign key constraints with cascading deletes/set nulls to maintain consistency and prevent orphaned data.

### Authentication & Authorization
- **Session Management**: Express sessions with PostgreSQL store.
- **Security**: Scrypt-based password hashing.
- **Access Control**: Four distinct user roles with specific permissions.
- **Workflows**: Admin approval for riders/merchants, OTP for customers.
- **Password Reset System**: Complete forgot password functionality with:
  - Email-based reset request from login page
  - Secure token generation (cryptographically random 32-byte tokens)
  - One-time use tokens with 1-hour expiration
  - Professional email templates via SendGrid
  - Dedicated reset password page with token validation
  - Password strength indicator (Weak/Fair/Good/Strong)
  - Minimum 6-character password requirement
  - Automatic token invalidation after successful reset
  - Works for all account types (Customer, Rider, Merchant, Admin)

### Real-time Features
- Custom WebSocket server for live updates.
- Order-specific chat between all user types.
- Real-time order status tracking and notifications.
- **Rider Information Visibility**: When a rider accepts an order, their name and phone number are displayed to customers, merchants, and admins in:
  - **Order Details Section**: Dedicated "Rider Information" box showing rider name and phone
  - **Chatbox Header**: Rider details appear at the top of the chat interface with clickable phone number (tel: link) for direct calling on mobile devices

### Location Services
- **Browser Geolocation API**: Optional "Share Location" button for customers to provide precise coordinates for accurate delivery fee calculation.
- **Geocoding Fallback**: OpenStreetMap Nominatim API automatically geocodes text addresses when precise coordinates aren't shared.
- **Distance-Based Delivery Fees**: Haversine formula calculates distance between restaurant and delivery location, applying configurable base fee + per-km rate from system settings.
- **Saved Addresses System**: Customers can save multiple delivery addresses with:
  - Structured Philippine address format (Lot/House No., Street, Barangay, City/Municipality, Province, Landmark)
  - Optional location sharing for precise coordinates (latitude/longitude)
  - Automatic geocoding for addresses without coordinates
  - Label addresses (e.g., "Home", "Office", "Mom's House")
  - Set default address for quick checkout
  - Edit, delete, and manage multiple saved addresses
  - Address dropdown selector in checkout
- **Merchant Store Location (Map Pin)**: Interactive Leaflet map integration for merchants to set and update exact store location:
  - **Registration**: During signup, merchants can optionally set their store location via interactive map with click-to-place pin, drag marker, GPS geolocation, and address search (geocoding)
  - **Profile Management**: Merchants can update store location in My Account tab when editing profile - map only appears in edit mode
  - **Features**: Click anywhere to place pin, drag pin to adjust, "Use Current Location" button (GPS), "Search Address" button (geocodes store address), real-time coordinate display
  - **Storage**: Coordinates saved to `restaurants.latitude` and `restaurants.longitude` in database
  - **Default Center**: Manila (14.5995, 120.9842) at zoom 15 for street-level view
  - **Map Lifecycle**: 150ms initialization delay for UI readiness, automatic cleanup when exiting edit mode or on save success
  - **Backend**: Registration via POST `/api/auth/register/merchant` and profile updates via PATCH `/api/merchant/profile` handle coordinate persistence
- **Rider Delivery View**: Enhanced rider portal displays delivery addresses with "View on Map" button when coordinates are available, opening OpenStreetMap for navigation.

### Business Logic
- **Pricing**: Multi-tier model including markup, delivery fees, merchant fees, and convenience fees.
- **Wallet System**: Pre-funded wallets for riders with commission deduction.
- **Rider Commission System**: Configurable commission-based earnings where admins set the rider commission percentage (0-100%, default 70%) in system settings. Rider earnings are auto-calculated as: `(Delivery Fee + Order Markup) × Commission %`. For example, with a ₱50 delivery fee, ₱30 markup, and 70% commission, riders earn ₱56. The rider portal displays simplified earnings in a highlighted box showing only the total amount with an auto-calculated description.
- **Order Management**: Complex order states, merchant-specific item management, and comprehensive order editing (add, modify, replace, delete items) with real-time recalculations and audit trails.
- **Inventory Control**: Real-time availability tracking with alternative item suggestions.
- **Product Options**: Two-level system where admins define global option types (e.g., Size, Flavor), and merchants define specific values with individual pricing for their menu items.
- **Multi-Merchant Checkout & Order Grouping**: Secure, transaction-based system for customers to order from multiple merchants in a single checkout:
  - **Admin Controls**: Enable/disable multi-merchant ordering, set merchant limits (2-5 per order)
  - **Security**: Server-side `orderGroupId` generation using `crypto.randomUUID()` prevents client-side forgery
  - **Atomic Checkout**: POST `/api/orders/checkout` creates all orders atomically with shared delivery details
  - **Rider Assignment**: Transaction-based atomic group acceptance using Drizzle's `db.transaction()` with pessimistic row-level locking (`.for('update')`)
  - **Race Condition Protection**: Multiple riders cannot accept the same group - first to lock wins, others get rejection
  - **All-or-Nothing Semantics**: Group acceptance validates all orders are pending/unassigned, updates atomically, verifies row count, auto-rolls back on failure
  - **Order Tracking**: Individual merchant orders within a group maintain separate status tracking while sharing the same rider and delivery
  - **Notifications**: Sent only after successful transaction commit to maintain consistency
  - **Error Handling**: Clear rider messages for unavailable groups, with automatic refresh suggestions
  - **Rider Portal - Multi-Merchant Pickup Addresses**: For grouped orders, riders see all merchant pickup addresses in the Active Orders section:
    - Each merchant's pickup location is displayed separately with restaurant name clearly labeled
    - Individual addresses shown with border-left accent for visual separation
    - "View on Map" button available for each merchant location (when coordinates are available)
    - Single pickup location display maintained for non-grouped orders
- **Store Management (Admin)**: Comprehensive restaurant management system with table view showing all restaurants (active and inactive), owner information, markup percentages, and registration dates. Admins can set individual restaurant markups, toggle active/inactive status, view detailed information, and delete restaurants with cascade delete (automatically removes menu items, orders, and related data).
- **Payment Method Controls**: Admin can enable/disable payment methods (COD, GCash, Maya, Debit/Credit Card) platform-wide. Backend validation ensures at least one method remains enabled. Customer checkout automatically filters to show only enabled payment methods with real-time state synchronization.
- **Analytics & Reporting System**: Comprehensive analytics dashboard for admins featuring:
  - **Revenue Analytics**: Total revenue, delivery fees, markup earnings, average order value, revenue breakdown by payment method and merchant, daily revenue trends
  - **Order Analytics**: Order counts by status (pending, active, completed, cancelled), completion rate, cancellation rate, average delivery time, orders by merchant, daily/weekly trends, peak ordering hours heatmap
  - **User Analytics**: Customer metrics (total, new, active, top spenders), merchant analytics (total, active, top performers by revenue/orders, average ratings), rider analytics (total, active, top performers by deliveries/earnings, ratings)
  - **Delivery Metrics**: Total deliveries, success rate, average distance, delivery fees collected, distance distribution by ranges, deliveries by rider
  - **Product Analytics**: Total menu items, most/least ordered items (top 20), items by category, average item price
  - **Date Range Filtering**: All analytics support date range filtering via query parameters (startDate, endDate)
  - **Backend API**: Five dedicated analytics endpoints at `/api/admin/analytics/*` (revenue, orders, users, delivery, products) with admin-only authentication guards
  - **Frontend Dashboard**: Complete Reports tab in Admin portal with organized sections, metric cards, data tables for top performers, placeholder areas for charts (Recharts integration pending), export buttons (PDF/Excel - pending implementation), responsive grid layouts with color-coded metrics

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
- **Socket.io**: Planned upgrade.

### File Handling & Media
- **Photo Upload System**: Merchants can upload restaurant photos and menu item images with:
  - File validation (JPEG, PNG, WebP support, 5MB max)
  - Real-time preview before upload
  - Secure server-side validation with multer
  - Organized storage in /uploads/menu-items and /uploads/restaurants folders
  - Path traversal prevention and authentication-protected endpoints
- **Restaurant Photos**: Merchants can upload/update restaurant photos via hover-to-change interface in profile header
- **Menu Item Images**: Image upload integrated in Add/Edit menu item forms with preview functionality
- **Customer Display**: Menu items and restaurants display images with graceful fallback icons when images are missing
- **Document Management**: Rider verification documents (planned/in development)

### Location & Maps
- **OpenStreetMap**: Map provider for location visualization and rider navigation.
- **Nominatim API**: Free geocoding service (OpenStreetMap) for converting addresses to coordinates.
- **Geolocation API**: Browser-based location detection for optional precise coordinate sharing.