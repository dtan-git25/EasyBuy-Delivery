# Easy Buy Delivery - Complete Revenue Computation Model

## Overview
This document provides the complete breakdown of how revenue is calculated and distributed between Customers, Merchants, Riders, and the App Platform in the Easy Buy Delivery food delivery system.

---

## 1. CUSTOMER PAYMENT STRUCTURE

### What the Customer Pays:

```
Total Customer Payment = Subtotal + Markup + Delivery Fee + Multi-Merchant Fee + Convenience Fee
```

**Component Breakdown:**

1. **Items Subtotal** - Base cost of all items ordered (sum of menu item prices × quantities)
2. **Order Markup** - Percentage markup applied to subtotal (invisible to customer, shown only as final price)
3. **Delivery Fee** - Distance-based delivery charge
4. **Multi-Merchant Fee** - Additional fee when ordering from 2+ merchants (if applicable)
5. **Convenience Fee** - Service fee per order (if enabled)

---

## 2. MERCHANT EARNINGS

### What the Merchant Receives:

```
Merchant Earnings = Subtotal (Items Base Cost)
```

**Details:**
- Merchants receive **100% of the base item costs**
- Merchants DO NOT receive: markup, delivery fees, multi-merchant fees, or convenience fees
- **No deductions** are made from merchant earnings
- The markup is applied to their items but goes entirely to the App

**Example:**
- If items base cost = ₱500
- Merchant receives = ₱500

---

## 3. APP PLATFORM EARNINGS

### What the App Earns:

```
App Earnings = [(Delivery Fee + Multi-Merchant Fee) × App Earnings %] + Markup
```

**Revenue Sources:**

1. **Portion of Combined Fees** - Configurable percentage of (Delivery Fee + Multi-Merchant Fee) (default: 50%)
2. **100% of Order Markup** - All markup revenue goes to the app

**Formula:**
```
App Earnings Amount = [(Delivery Fee + Multi-Merchant Fee) × 0.50] + Markup
```

**Key Point:** Delivery Fee and Multi-Merchant Fee are **combined FIRST**, then the app's percentage is applied.

---

## 4. RIDER EARNINGS

### What the Rider Receives:

```
Rider Earnings = Convenience Fee + [(Delivery Fee + Multi-Merchant Fee) × (100% - App Earnings %)]
```

**Revenue Sources:**

1. **100% of Convenience Fee** - Fixed rider commission per order (goes entirely to rider)
2. **Portion of Combined Fees** - Remaining percentage of (Delivery Fee + Multi-Merchant Fee) after app's share (default: 50%)

**Formula:**
```
Rider Earnings Amount = Convenience Fee + [(Delivery Fee + Multi-Merchant Fee) × 0.50]
```

**Key Points:** 
- Convenience Fee acts as the fixed rider commission
- Delivery Fee and Multi-Merchant Fee are **combined FIRST**, then the rider's percentage is applied

---

## 5. EXAMPLE CALCULATION

### Scenario Parameters:
- **Items base cost:** ₱500.00
- **Restaurant markup:** 15% (₱75.00)
- **Distance to customer:** 3 km
- **Delivery fee:** ₱25 (base) + (2 km × ₱15) = ₱55.00
- **Multi-merchant order:** Yes (2 merchants)
- **Multi-merchant fee:** ₱20.00
- **Convenience fee:** ₱15.00
- **App earnings percentage:** 50%

### Complete Breakdown:

#### CUSTOMER PAYS:
```
Subtotal:              ₱500.00
Markup (15%):          ₱ 75.00
Delivery Fee:          ₱ 55.00
Multi-Merchant Fee:    ₱ 20.00
Convenience Fee:       ₱ 15.00
─────────────────────────────
TOTAL:                 ₱665.00
```

#### MERCHANT GETS:
```
Merchant Earnings:     ₱500.00 (100% of base items cost)
```

#### APP EARNS:
```
From Combined Fees (50%): ₱ 37.50  ((₱55.00 + ₱20.00) × 50%)
From Markup (100%):       ₱ 75.00  (all markup)
─────────────────────────────────
APP TOTAL:                ₱112.50
```

#### RIDER EARNS:
```
Convenience Fee (100%):   ₱ 15.00  (fixed rider commission)
From Combined Fees (50%): ₱ 37.50  ((₱55.00 + ₱20.00) × 50%)
─────────────────────────────────
RIDER TOTAL:              ₱ 52.50
```

### VERIFICATION:
```
Customer Payment:     ₱665.00
─────────────────────────────
Merchant Earnings:    ₱500.00
App Earnings:         ₱112.50
Rider Earnings:       ₱ 52.50
─────────────────────────────
TOTAL DISTRIBUTED:    ₱665.00  ✓ (Matches customer payment)
```

---

## 6. ADMIN CONFIGURABLE SETTINGS

### Current Default Values:

| Setting | Current Value | Description |
|---------|---------------|-------------|
| **Base Delivery Fee** | ₱25.00 | Fee for first kilometer |
| **Per KM Rate** | ₱15.00 | Additional fee per kilometer after first |
| **Convenience Fee** | ₱15.00 | Service fee per order (goes to rider) |
| **Show Convenience Fee** | `true` | Whether to charge convenience fee |
| **App Earnings Percentage** | 50% | Percentage of delivery fee app receives |
| **Multi-Merchant Fee** | ₱20.00 | Fee when ordering from 2+ merchants |
| **Allow Multi-Merchant Checkout** | `false` | Enable/disable multi-merchant orders |
| **Max Merchants Per Order** | 2 | Maximum merchants in single checkout |
| **Restaurant Markup** | 15% | Default markup percentage per restaurant |

### Admin Controls Location:
- Settings are managed in the **Admin Portal → System Settings**
- Each restaurant can have a custom markup percentage
- All settings are stored in the `system_settings` table

---

## 7. DETAILED FORMULAS

### Delivery Fee Calculation:
```javascript
function calculateDeliveryFee(distance, baseRate, perKmRate) {
  const roundedDistance = Math.ceil(distance); // Round up to nearest km
  
  if (roundedDistance <= 1) {
    return baseRate;
  } else {
    return baseRate + ((roundedDistance - 1) * perKmRate);
  }
}
```

**Examples:**
- 0.5 km: ₱25 (base only)
- 1.0 km: ₱25 (base only)
- 2.0 km: ₱25 + (1 × ₱15) = ₱40
- 3.5 km: ₱25 + (3 × ₱15) = ₱70
- 5.0 km: ₱25 + (4 × ₱15) = ₱85

### Multi-Merchant Fee Calculation:
```javascript
// Only applied when ordering from 2 or more merchants
if (merchantCount >= 2) {
  multiMerchantFee = systemSettings.multiMerchantFee; // ₱20
} else {
  multiMerchantFee = 0;
}
```

### Markup Calculation:
```javascript
markupAmount = subtotal × (restaurant.markup / 100)
```

### Earnings Distribution:
```javascript
// Get app earnings percentage from settings (default: 50%)
const appEarningsPercent = appEarningsPercentage / 100; // 0.50

// Calculate each stakeholder's earnings
merchantEarnings = subtotal; // 100% of base items cost

// IMPORTANT: Combine delivery fee and multi-merchant fee FIRST
const combinedFees = deliveryFee + multiMerchantFee;

// Then apply percentages to combined fees
appEarnings = (combinedFees × appEarningsPercent) + markup;

riderEarnings = convenienceFee + (combinedFees × (1 - appEarningsPercent));

// Calculate customer total
customerTotal = subtotal + markup + deliveryFee + multiMerchantFee + convenienceFee;
```

---

## 8. MULTI-MERCHANT ORDER SPECIAL RULES

### Fee Distribution in Multi-Merchant Orders:

When a customer orders from multiple merchants in a single checkout:

1. **Single Delivery Fee Applied:**
   - Only ONE delivery fee is charged (based on the **farthest merchant**)
   - This prevents customers from being charged multiple delivery fees

2. **Multi-Merchant Fee:**
   - Flat fee of ₱20 is added to the order
   - Applied only once per multi-merchant order
   - Goes 100% to the App

3. **Fee Assignment:**
   - The **first order in the group** (earliest created) carries:
     - The full delivery fee
     - The multi-merchant fee
   - All other orders in the group have:
     - Delivery fee: ₱0.00
     - Multi-merchant fee: ₱0.00
   - This prevents duplicate charging while maintaining proper revenue tracking

4. **Convenience Fee:**
   - Each order still has its own convenience fee
   - Charged per merchant order, not per checkout

**Example: 2-Merchant Order**

**Order 1 (First in Group):**
```
Subtotal:              ₱300.00
Markup (15%):          ₱ 45.00
Delivery Fee:          ₱ 55.00  (carries group delivery fee)
Multi-Merchant Fee:    ₱ 20.00  (carries group multi-merchant fee)
Convenience Fee:       ₱ 15.00
─────────────────────────────
Total:                 ₱435.00
```

**Order 2 (Second in Group):**
```
Subtotal:              ₱200.00
Markup (15%):          ₱ 30.00
Delivery Fee:          ₱  0.00  (waived - already charged in Order 1)
Multi-Merchant Fee:    ₱  0.00  (waived - already charged in Order 1)
Convenience Fee:       ₱ 15.00
─────────────────────────────
Total:                 ₱245.00
```

**Customer Pays:** ₱435.00 + ₱245.00 = ₱680.00

---

## 9. DATABASE STORAGE

### Revenue Tracking Fields in Orders Table:

Each order stores:
```sql
subtotal                    -- Merchant earnings (base items cost)
markup                      -- Markup amount applied
deliveryFee                 -- Delivery fee for this order
multiMerchantFee           -- Multi-merchant fee (if applicable)
convenienceFee             -- Convenience fee
total                      -- Total customer payment

-- Revenue distribution tracking:
appEarningsPercentageUsed  -- % used at order creation time (snapshot)
appEarningsAmount          -- Calculated app earnings
riderEarningsAmount        -- Calculated rider earnings
merchantEarningsAmount     -- Calculated merchant earnings (= subtotal)
```

These fields ensure:
- Accurate historical revenue tracking
- Settings changes don't affect past orders
- Complete audit trail for all transactions

---

## 10. REVENUE VERIFICATION

### The Golden Rule:
```
Customer Payment = Merchant Earnings + App Earnings + Rider Earnings
```

This equation **MUST ALWAYS** balance to maintain system integrity.

### Verification Checklist:

✓ All earnings fields are properly calculated at order creation  
✓ Multi-merchant fee distribution is correct  
✓ Delivery fee is assigned to first order in group only  
✓ Convenience fee is applied to each order  
✓ Markup is invisible to customers (shown only in final prices)  
✓ Settings snapshot is stored with each order  

---

## 11. MARKUP VISIBILITY RULES

### Critical Business Rule: Markup is INVISIBLE to Customers

**What Customers See:**
- Final prices only (base price + markup combined)
- Example: If base = ₱100 and markup = 15%, customer sees ₱115 as the item price
- Customers NEVER see "₱100 + ₱15 markup"

**What Merchants See:**
- Their base prices
- The markup percentage configured for their restaurant
- How markup affects their final displayed prices

**What Admin/Owner Sees:**
- Complete breakdown including markup amounts
- Revenue analytics showing markup earnings
- Markup configuration for each restaurant

**Implementation:**
- Customer portal: Shows (base price + markup) as a single unit price
- Checkout summary: Shows items subtotal already including markup
- No separate "Markup" line item in customer-facing views
- Order details for customers: Show final prices without breakdown

---

## 12. PAYMENT METHOD CONSIDERATIONS

The system supports multiple payment methods:

- **Cash on Delivery (COD)** - Default, can be disabled by admin
- **GCash** - Philippine e-wallet, can be disabled by admin
- **Maya** - Philippine e-wallet, can be disabled by admin
- **Debit/Credit Card** - Can be disabled by admin
- **Wallet** - Internal wallet system (if enabled)

**Note:** Payment method does **NOT** affect revenue distribution calculations. The same formulas apply regardless of payment method chosen.

---

## 13. ADMIN ANALYTICS DASHBOARD

The Admin Portal includes comprehensive revenue analytics showing:

### Revenue Metrics:
- Total Revenue (all customer payments)
- Merchant Earnings (total subtotal amounts)
- App Earnings (delivery % + markup + multi-merchant fees)
- Rider Earnings (delivery % + convenience fees)

### Breakdown:
- Subtotal Revenue
- Delivery Fee Revenue
- Markup Earnings
- Convenience Fee Revenue
- Multi-Merchant Fee Revenue

### Filters:
- Date range selection
- Revenue by payment method
- Revenue by merchant
- Revenue trends over time

---

## SUMMARY

The Easy Buy Delivery revenue model ensures fair distribution:

- **Merchants** receive 100% of item base costs
- **App** earns from delivery fee portion, all markup, and multi-merchant fees
- **Riders** earn from delivery fee portion and all convenience fees
- **Customers** pay a transparent total with markup invisibly included in prices

All calculations are automated, tracked, and verifiable through the admin analytics dashboard.

---

**Document Version:** 1.0  
**Last Updated:** November 17, 2025  
**Status:** Current Production Model
