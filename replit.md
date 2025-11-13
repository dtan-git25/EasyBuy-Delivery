# Food Delivery Application

## Overview
This project is a comprehensive food delivery web application with Customer, Rider, Merchant, and Admin portals. It manages orders, real-time communication, location services, and a wallet-based payment system. The application features complex delivery logistics with multi-order bookings for riders, dynamic pricing, and extensive administrative controls, aiming to streamline operations and enhance user experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (November 2025)
- **Fixed Cart Pricing Display - Markup Now Invisible**: Completely restructured cart and checkout pricing displays to hide restaurant markup from customers, matching the Add to Cart modal behavior. Previously, carts showed base prices with a separate "Restaurant Markup (X%): ₱X.XX" line, confusing customers who saw different prices in Add to Cart vs Cart. Now all pricing is consistent:
  - **All Restaurant Carts Modal**: Items display at marked-up prices (base + options with markup applied). Shows only Subtotal → Delivery Fee → Total. No markup line visible.
  - **Single-Restaurant Cart Modal**: Same marked-up pricing. Shows Subtotal → Total with no markup breakdown.
  - **Checkout Modal**: Per-restaurant summaries show marked-up item prices. Displays Subtotal → Delivery Fee → Rider's Convenience Fee → Total for each restaurant. Grand total shows aggregated marked-up items + total delivery fees + total convenience fees.
  - **Pricing Consistency**: All views now match Add to Cart modal where prices already include markup (e.g., merchant's ₱20 item with 10% markup displays as ₱22 everywhere, not as ₱20 + ₱2 markup).
  - **Option Display**: Selected options shown as names only (no individual prices), keeping focus on final item price.
  - **Backend Compatibility**: Order submission still sends base subtotal + explicit markup fields separately for accounting/reporting - only customer-facing UI changed.
  - **Convenience Fee Visibility**: Now properly displayed in both per-restaurant totals and checkout grand total when enabled.
- **Added Admin Management to Owner Portal**: Implemented comprehensive admin account management exclusively for the Owner account in the User Management tab. Features include:
  - **Admin List Display**: Shows all admin and owner accounts with name, email, role, creation date, and action buttons
  - **View Admin Details**: Modal displaying complete admin information including personal details and account history
  - **Delete Admin**: Ability to delete admin accounts with owner protection (owner account cannot be deleted)
  - **Owner-Only Access**: All admin management routes restricted to owner role only (regular admins cannot access)
  - **UI/UX Consistency**: Follows the same design pattern as Customer and Rider Management components
  - **Backend API**: Three owner-only endpoints: GET /api/admin/admins (list), GET /api/admin/admins/:id (details), DELETE /api/admin/admins/:id (delete with owner protection)
  - **Storage Layer**: New methods getAdmins(), getAdminDetails(), deleteAdmin() with data sanitization and owner protection
  - **Security**: Owner account (david.jthan@gmail.com) protected from deletion at both frontend and backend levels
- **Implemented Multi-Merchant Fee System**: Added configurable fee charged when customers order from multiple restaurants in a single checkout (default ₱20 per additional merchant). The fee calculation is (merchant_count - 1) × fee_amount, so ordering from 2 restaurants = ₱20, from 3 restaurants = ₱40, etc. This fee goes entirely to app earnings to offset the operational complexity of coordinating multiple pickups. Features include:
  - **Admin Configuration**: New "Multi-Merchant Fee" field in Admin Settings > Multi-Merchant Checkout Settings to configure the per-merchant fee amount
  - **Database Schema**: Added `multiMerchantFee` column to both `orders` and `system_settings` tables with decimal precision
  - **Revenue Distribution**: Multi-merchant fee automatically added to app earnings in the revenue model calculation
  - **Customer Display**: Fee shown in checkout modal order summary, cart preview note (when 2+ merchants), and order details in "My Orders" tab
  - **Rider Display**: Fee shown in order breakdown for transparency on what the customer is paying
  - **Backend Logic**: Server-side calculation prevents manipulation, ensures accurate fee application and storage
- **Implemented Product Options Display in Cart and Checkout**: Enhanced the customer cart and checkout experience to show selected menu item options (Size, Flavor, Add-ons, etc.) with their prices. Previously, selected options were stored but not displayed, making it difficult for customers to verify their choices. Now displays options with clear visual hierarchy: bold item names with indented, gray-text option details showing "Option Type: Value (₱price)". Implemented across Cart modal, Checkout modal, and All Carts modal (multi-merchant view). Added `selectedOptions` array to CartItem interface to store full option details (optionTypeName, valueName, price). Created `normalizeSelectedOptions` helper function to handle order-independent comparison and undefined/empty array consistency, ensuring items with different options create separate cart entries while identical selections properly increment quantity.
- **Fixed Option Type Creation Flow**: Refactored menu item option type management to automatically display value/price fields when an option type is selected. Previously, merchants had to click "Add Value" after selecting an option type, and this button incorrectly added the option type to state, causing duplicate option types. Created separate `addOptionType()` function that handles option type selection and automatically adds one empty value field, while `addOptionValue()` now only adds additional values to existing option types. This ensures one option type can have multiple values without creating duplicates. Applied consistently to both Add and Edit Menu Item dialogs.
- **Renamed "Convenience Fee" to "Rider's Convenience Fee"**: Updated all user-facing text across the application to display "Rider's Convenience Fee" instead of "Convenience Fee" for clarity. This change reflects in Admin settings, checkout views (single and multi-restaurant), order details, rider earnings breakdown, and CSV export reports. The terminology change better communicates that this fee is part of the rider's earnings.
- **Fixed Multi-Merchant Order Filtering in Rider Portal**: Corrected the order tab filtering logic to properly handle multi-merchant orders. Previously, a multi-merchant order group would incorrectly move to "Order History" when only ONE merchant order was delivered. Now correctly remains in "Active Orders" until ALL merchant orders in the group are delivered or cancelled. Updated filtering uses `.some()` for active orders (ANY merchant order still active) and `.every()` for historical orders (ALL merchant orders delivered/cancelled). Also fixed stats calculations (today's earnings, success rate) to properly account for multi-merchant order completion status.
- **Implemented Product Option Pricing Integration**: Fixed critical pricing bug where selected menu item options (Size, Flavor, Add-ons) were displayed but NOT included in cart total calculations. Previously, if a burger cost ₱100 with ₱50 in options, the cart would display the options but only calculate ₱100, causing checkout totals to mismatch. Now all cart calculations include option prices:
  - **Cart Context**: Created exported `getItemTotalPrice()` utility function that calculates base price + all selectedOptions prices. Updated `getSubtotal()` and `getAllCartsTotal()` to use this helper
  - **All Restaurant Carts Modal**: Fixed subtotal calculations and item price displays to include options with restaurant markup applied. Added indented option breakdown below each item showing "OptionType: Value (₱price)" in gray text
  - **Checkout Modal**: Fixed subtotal calculations, item displays, and order summary to include options. Added same option breakdown format as All Carts modal
  - **Order Submission**: Updated `handleCheckout()` function to send `selectedOptions` array to backend in both multi-merchant and single-merchant checkout paths, ensuring orders are stored with complete option data
  - **Backend Compatibility**: Backend doesn't recalculate totals from items - it uses frontend-provided subtotals and stores selectedOptions in JSONB, making this fix immediately effective

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