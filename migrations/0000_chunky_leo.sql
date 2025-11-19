CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."document_approval" AS ENUM('pending', 'approved', 'rejected', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('order_status_change', 'order_cancelled', 'order_modified', 'new_order', 'order_accepted_by_rider', 'chat_message', 'wallet_update', 'item_unavailable', 'merchant_pending_approval', 'rider_pending_approval', 'system_alert');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('gcash', 'maya', 'cod', 'cash', 'wallet');--> statement-breakpoint
CREATE TYPE "public"."rider_status" AS ENUM('offline', 'online', 'busy');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('wallet_deposit', 'wallet_withdrawal', 'order_payment', 'order_refund', 'rider_payout', 'merchant_payout', 'cash_collection', 'cash_remittance', 'fee_charge', 'promotion_credit', 'gcash_topup', 'maya_topup');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'rider', 'merchant', 'admin', 'owner');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_group_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar NOT NULL,
	"menu_item_id" varchar NOT NULL,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" varchar NOT NULL,
	"group_name" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_item_option_values" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_item_id" varchar NOT NULL,
	"option_type_id" varchar NOT NULL,
	"value" text NOT NULL,
	"price" numeric(8, 2) NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(8, 2) NOT NULL,
	"category" text NOT NULL,
	"image" text,
	"is_available" boolean DEFAULT true,
	"variants" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "option_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "option_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"status" "order_status" NOT NULL,
	"changed_by" varchar NOT NULL,
	"previous_status" "order_status",
	"notes" text,
	"location" jsonb,
	"estimated_delivery_time" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_group_id" varchar,
	"customer_id" varchar NOT NULL,
	"restaurant_id" varchar NOT NULL,
	"rider_id" varchar,
	"order_number" text NOT NULL,
	"items" jsonb NOT NULL,
	"subtotal" numeric(8, 2) NOT NULL,
	"markup" numeric(8, 2) NOT NULL,
	"delivery_fee" numeric(8, 2) NOT NULL,
	"merchant_fee" numeric(8, 2) DEFAULT '0',
	"multi_merchant_fee" numeric(8, 2) DEFAULT '0',
	"convenience_fee" numeric(8, 2) DEFAULT '0',
	"total" numeric(8, 2) NOT NULL,
	"commission" numeric(8, 2) DEFAULT '0',
	"app_earnings_percentage_used" numeric(5, 2),
	"app_earnings_amount" numeric(8, 2) DEFAULT '0',
	"rider_earnings_amount" numeric(8, 2) DEFAULT '0',
	"merchant_earnings_amount" numeric(8, 2) DEFAULT '0',
	"status" "order_status" DEFAULT 'pending',
	"delivery_address" text NOT NULL,
	"delivery_latitude" numeric(10, 8),
	"delivery_longitude" numeric(11, 8),
	"landmark" text,
	"customer_notes" text,
	"payment_method" "payment_method" DEFAULT 'cash' NOT NULL,
	"phone_number" text NOT NULL,
	"estimated_delivery_time" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"customer_id" varchar NOT NULL,
	"merchant_id" varchar,
	"rider_id" varchar,
	"merchant_rating" integer,
	"rider_rating" integer,
	"merchant_comment" text,
	"rider_comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"address" text NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"phone" text NOT NULL,
	"email" text,
	"cuisine" text NOT NULL,
	"image" text,
	"rating" numeric(3, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"markup" numeric(5, 2) DEFAULT '15',
	"delivery_fee" numeric(8, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rider_location_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" varchar NOT NULL,
	"order_id" varchar,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"accuracy" numeric(8, 2),
	"heading" numeric(5, 2),
	"speed" numeric(8, 2),
	"battery_level" integer,
	"is_online" boolean DEFAULT true,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "riders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"vehicle_type" text NOT NULL,
	"vehicle_model" text NOT NULL,
	"plate_number" text NOT NULL,
	"license_number" text NOT NULL,
	"orcr_document" text,
	"motor_image" text,
	"id_document" text,
	"documents_status" "document_approval" DEFAULT 'incomplete',
	"approved_by" varchar,
	"rejected_reason" text,
	"documents_submitted_at" timestamp,
	"documents_reviewed_at" timestamp,
	"status" "rider_status" DEFAULT 'offline',
	"current_latitude" numeric(10, 8),
	"current_longitude" numeric(11, 8),
	"rating" numeric(3, 2) DEFAULT '0',
	"total_earnings" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "riders_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "saved_addresses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"label" text,
	"lot_house_no" text NOT NULL,
	"street" text NOT NULL,
	"barangay" text NOT NULL,
	"city_municipality" text NOT NULL,
	"province" text NOT NULL,
	"landmark" text,
	"latitude" numeric(10, 8) NOT NULL,
	"longitude" numeric(11, 8) NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_delivery_fee" numeric(8, 2) DEFAULT '25',
	"per_km_rate" numeric(8, 2) DEFAULT '15',
	"convenience_fee" numeric(8, 2) DEFAULT '15',
	"show_convenience_fee" boolean DEFAULT true,
	"allow_multi_merchant_checkout" boolean DEFAULT false,
	"max_merchants_per_order" integer DEFAULT 2,
	"multi_merchant_fee" numeric(8, 2) DEFAULT '20',
	"app_earnings_percentage" numeric(5, 2) DEFAULT '50',
	"logo" text,
	"max_multiple_order_booking" integer DEFAULT 0,
	"cod_enabled" boolean DEFAULT true,
	"gcash_enabled" boolean DEFAULT true,
	"maya_enabled" boolean DEFAULT true,
	"card_enabled" boolean DEFAULT true,
	"enable_wallet_system" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"prefix" text,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"age" integer,
	"gender" text,
	"phone" text,
	"email_verified" boolean DEFAULT false,
	"lot_house_no" text,
	"street" text,
	"barangay" text,
	"city_municipality" text,
	"province" text,
	"landmark" text,
	"full_address" text,
	"profile_image" text,
	"photo_path" text,
	"drivers_license_no" text,
	"license_validity_date" timestamp,
	"license_photo_path" text,
	"store_name" text,
	"store_address" text,
	"store_contact_no" text,
	"owner_name" text,
	"approval_status" "approval_status" DEFAULT 'pending',
	"rejection_reason" text,
	"is_active" boolean DEFAULT true,
	"otp_code" text,
	"otp_expiry" timestamp,
	"password_reset_token" text,
	"password_reset_expiry" timestamp,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" varchar NOT NULL,
	"order_id" varchar,
	"type" "transaction_type" NOT NULL,
	"status" "transaction_status" DEFAULT 'pending',
	"payment_method" "payment_method" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"description" text,
	"gcash_reference_number" text,
	"maya_transaction_id" text,
	"maya_payment_id" text,
	"cash_handled_by" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"balance" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_group_items" ADD CONSTRAINT "menu_group_items_group_id_menu_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."menu_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_group_items" ADD CONSTRAINT "menu_group_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_groups" ADD CONSTRAINT "menu_groups_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_option_values" ADD CONSTRAINT "menu_item_option_values_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_option_values" ADD CONSTRAINT "menu_item_option_values_option_type_id_option_types_id_fk" FOREIGN KEY ("option_type_id") REFERENCES "public"."option_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_rider_id_users_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_merchant_id_users_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rider_id_users_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_addresses" ADD CONSTRAINT "saved_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;