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
- **Edit Order Functionality**: Merchants can modify active orders by adding new items, changing quantities (min 1), or replacing items with different menu options - prevents item deletion to avoid disputes
- **Inventory Control**: Real-time availability tracking with alternative item suggestions

### Database Integrity & Recent Fixes

#### Order Data Format Fix (October 2025)
Fixed critical issue where merchant dashboards showed blank page when orders were created due to missing customer data:

**Root Cause**: Merchant portal expected `order.customer.name/phone/address` object, but backend queries only returned raw order data with `customerId` as a string - no customer details joined.

**Implemented Fixes**:
1. **Updated `getOrdersByRestaurant()` in server/storage.ts**:
   - Added LEFT JOIN with users table to include customer details
   - Transforms response to include customer object: `{name: "FirstName LastName", phone, address}`
   - Customer name properly built from `firstName + lastName` fields
   - Safe fallbacks for missing data: 'Unknown Customer' if user not found

2. **Fixed `getPendingOrders()` in server/storage.ts**:
   - Corrected to use `firstName + lastName` (was incorrectly using nonexistent `name` field)
   - Now returns proper customer names for rider orders

3. **Added defensive error handling in merchant-portal.tsx**:
   - Optional chaining (`order.customer?.name`) prevents crashes
   - Multiple fallback levels for all customer fields
   - Falls back to direct order fields if customer object missing

**Impact**: Merchants can now see orders with full customer details (name, phone, address) without dashboard crashes. Order creation no longer breaks merchant portals.

#### Foreign Key Constraints (October 2025)
Fixed critical database corruption issue where merchant dashboards broke after receiving orders due to orphaned data:

**Root Cause**: Missing foreign key constraints on orders and related tables allowed orphaned records to corrupt merchant queries.

**Implemented Fixes**:
1. **Orders Table Constraints**:
   - `customerId` → `users.id` (CASCADE DELETE)
   - `restaurantId` → `restaurants.id` (CASCADE DELETE)
   - `riderId` → `users.id` (SET NULL - preserves order history)

2. **Related Tables Constraints**:
   - `chat_messages.orderId` → `orders.id` (CASCADE DELETE)
   - `order_status_history.orderId` → `orders.id` (CASCADE DELETE)
   - `wallet_transactions.orderId` → `orders.id` (SET NULL - preserves transaction history)
   - `menu_items.restaurantId` → `restaurants.id` (CASCADE DELETE)
   - `restaurants.ownerId` → `users.id` (CASCADE DELETE)

**Data Cleanup Performed**:
- Deleted 4 orphaned orders with invalid restaurant references
- Deleted 3 orphaned order status history records
- Deleted 5 orphaned sessions from deleted user accounts
- Deleted 2 orphaned restaurants and 6 orphaned menu items

**Impact**: Prevents merchant account corruption when orders are created or when merchants/customers are deleted. All related data now cascades properly, maintaining database integrity.

#### Real-time Order Cancellation Updates (October 2025)
Fixed issue where order cancellations by merchants were not updating in real-time for customers and riders:

**Root Cause**: 
1. Backend sent inconsistent WebSocket message types (`order_items_updated`, `order_cancelled`) instead of the standard `order_update` that portals listen for
2. Rider portal had no WebSocket listeners for real-time updates at all

**Implemented Fixes**:
1. **Standardized WebSocket Messages in server/routes.ts**:
   - Edit Order endpoint: Changed from `order_items_updated` → `order_update`
   - Mark Unavailable endpoint: Changed from `order_cancelled` → `order_update`
   - Both endpoints now use consistent `updatedBy` field structure

2. **Added WebSocket Support to Rider Portal**:
   - Imported `useWebSocket` hook and integrated real-time listeners
   - Listens for `order_update` messages and invalidates TanStack Query caches
   - Shows toast notifications for status changes with special handling for cancellations
   - Mirrors customer portal's WebSocket implementation pattern

3. **Fixed order_status_history Database Constraint**:
   - Corrected field name from `updatedBy` → `changedBy` in both endpoints
   - Prevented "null value in column 'changed_by'" constraint violations

**Impact**: When merchants mark orders unavailable or edit order items, customers and riders now see updates immediately without page refresh. All three portals receive synchronized real-time notifications via WebSocket broadcast.

#### Real-time New Order Updates and Order History (October 2025)
Fixed issues with real-time order updates and implemented proper order history for both Rider and Merchant portals:

**Problems Fixed**:
1. New orders not appearing in rider's Pending Orders automatically - required page refresh
2. Completed/cancelled orders not moving to Order History - stayed in Active Orders
3. Rider portal only listened for `order_update` messages, missing `new_order` broadcasts

**Implemented Fixes**:
1. **Enhanced Rider Portal WebSocket Listener** (rider-portal.tsx):
   - Added `new_order` message handler to refresh pending orders instantly
   - Kept `order_update` handler for status changes
   - Shows contextual toast notifications for new orders and status updates
   - Uses switch statement for cleaner message routing

2. **Rider Portal Order Filtering**:
   - `activeOrders`: ['accepted', 'preparing', 'ready', 'picked_up']
   - `historicalOrders`: ['delivered', 'cancelled'] - NEW
   - `todayDeliveredOrders`: Only delivered orders from today for earnings calculation
   - Order History tab now displays all completed and cancelled orders

3. **Merchant Portal Order Filtering**:
   - `activeOrders`: ['pending', 'accepted', 'preparing'] - unchanged
   - `historicalOrders`: ['ready', 'picked_up', 'delivered', 'cancelled'] - NEW
   - Order History tab shows full order details with status-coded badges

4. **Order History UI Implementation**:
   - Both portals now have fully functional Order History tabs
   - Display: Order number, date/time, status badge, customer details, items, total
   - Color-coded status badges: green (delivered), red (cancelled), gray (others)
   - Empty state messaging when no historical orders exist

**Impact**: 
- Riders see new orders instantly without refresh when customers place orders
- Completed/cancelled orders automatically move to Order History
- Active Orders tab only shows current work, keeping dashboards clean
- Both portals maintain complete order history for reporting and reference

#### Enhanced Edit Order Functionality (October 2025)
Implemented comprehensive order editing capabilities for merchants to handle inventory changes and customer requests while preventing disputes:

**Features Implemented**:
1. **Add New Menu Items** (merchant-portal.tsx):
   - "Add Menu Items to Order" button reveals dropdown of available menu items
   - Merchants can select items from their current menu and add to existing orders
   - Each added item starts with quantity 1
   - Toast notifications confirm when items are added

2. **Edit Item Quantities**:
   - Number input for each order item with validation
   - Minimum quantity enforced at 1 (prevents deletion)
   - If merchant tries to enter 0 or negative, reverts to minimum of 1
   - Preserves quantities when replacing items

3. **Replace Items with Different Options**:
   - "Replace with:" dropdown for each order item
   - Shows all available menu items from restaurant
   - Replaces item while preserving the original quantity
   - Useful when original item is out of stock
   - Toast notification shows what item was replaced

4. **Backend Integration**:
   - Uses existing `/api/orders/:id/items` endpoint
   - Automatically recalculates: subtotal, markup, delivery fee, total
   - Creates status history entry with merchant's reason
   - Sends WebSocket notifications to customer and assigned rider
   - Real-time updates ensure all parties see changes immediately

**Dispute Prevention**:
- Items cannot be deleted (only added or quantity increased)
- Minimum quantity of 1 enforced at UI and validation level
- Merchants must provide reason for all changes (sent to customer)
- All edits logged in order status history for audit trail

**Impact**:
- Merchants can adapt orders based on inventory availability
- Customers receive transparent communication about order modifications
- No disputes over removed items - only additions or replacements
- Order totals automatically recalculated, ensuring pricing accuracy

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