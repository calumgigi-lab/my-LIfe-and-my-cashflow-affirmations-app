# Admin Payment Management System

## Overview

The Global Affirmation Hub now has a centralized, admin-controlled payment system where:

- **All payments go to a single account** managed by the admin
- **Admin controls and approves all purchases** before they unlock content
- **Complete audit trail** tracks who paid, when, and whether the payment was approved
- **Payment tracking** prevents errors by mapping users to their accounts and records

## System Architecture

### Database Schema Updates

The payment system uses three key tables:

#### 1. **monthlyPurchases** (Extended)
```
- id: Payment ID
- userId: User who made the payment
- bookletId: Booklet being purchased
- platform: 'ios', 'android', or 'web'
- productId: App store product ID
- transactionId: Unique transaction reference
- amountNaira: Payment amount in Naira (default: 1500 NGN)
- status: 'pending' | 'approved' | 'rejected'
- approvedBy: Admin user ID who approved it
- approvedAt: Timestamp when admin approved it
- createdAt: When payment was recorded
```

#### 2. **paymentAuditLog** (New)
Complete audit trail of all payment actions:
```
- id: Log entry ID
- paymentId: Reference to monthly_purchases
- userId: Admin who performed the action
- action: 'pending', 'approved', 'rejected', 'payment_account_updated'
- details: JSON details of the action/reason
- createdAt: When the action was recorded
```

#### 3. **adminSettings** (New)
System configuration for payment accounts:
```
- id: Setting ID
- key: 'payment_account' (centralized payment account details)
- value: JSON with accountName, accountNumber, bankName, bankCode
- updatedAt: When the setting was last updated
```

### User Table Update
- Added `isAdmin: boolean` field to identify admin users on the users table

## User Journey

### For Regular Users (Making Payments)

1. User initiates purchase of a booklet
2. User completes payment through app store (iOS/Android)
3. App calls `/api/purchases/verify` with purchase details
4. Payment is recorded as **"pending"** (not automatically approved)
5. User sees: "Purchase recorded. Admin will verify and approve your payment shortly."
6. User **cannot yet access the booklet**
7. Admin approves the payment
8. **Only then** does the user get access to the booklet

### For Admins (Managing Payments)

1. Admin logs in and visits admin dashboard
2. Admin can:
   - View all pending payments with user details
   - See exactly who made each payment
   - View payment dates and amounts (in Naira)
   - Approve verified, legitimate payments
   - Reject fraudulent or erroneous payments
   - View complete audit log of all payment actions
   - Set up centralized payment account details
   - View payment statistics and analytics

## API Endpoints

### Admin Payment Dashboard

#### Get All Payments (with filters)
```
GET /api/admin/payments
Query Parameters:
  - status: 'pending' | 'approved' | 'rejected' (optional)
  - userId: numeric user ID (optional)
  - startDate: ISO date string (optional)
  - endDate: ISO date string (optional)

Response:
{
  payments: [
    {
      id: 1,
      userId: 42,
      bookletId: 5,
      userName: "John Doe",
      userEmail: "john@example.com",
      bookletTitle: "April 2026 Affirmations",
      bookletMonth: "April",
      bookletYear: 2026,
      platform: "ios",
      productId: "com.affirmations.april2026",
      transactionId: "abc123",
      amountNaira: 1500,
      status: "pending",
      approvedBy: null,
      approvedAt: null,
      createdAt: "2026-03-15T10:30:00Z"
    }
  ],
  summary: {
    totalCount: 5,
    pendingCount: 2,
    approvedCount: 3,
    rejectedCount: 0,
    totalAmountNaira: 7500
  }
}
```

#### Get Payment Details with Audit Log
```
GET /api/admin/payments/:id

Response:
{
  id: 1,
  userId: 42,
  bookletId: 5,
  user: {
    id: 42,
    displayName: "John Doe",
    email: "john@example.com"
  },
  booklet: {
    id: 5,
    title: "April 2026 Affirmations",
    month: "April",
    year: 2026
  },
  amountNaira: 1500,
  status: "pending",
  transactionId: "abc123",
  auditLogs: [
    {
      id: 1,
      action: "pending",
      details: "Payment recorded from iOS app store",
      createdAt: "2026-03-15T10:30:00Z",
      user: {
        id: 0,
        displayName: "SYSTEM",
        email: "system"
      }
    }
  ]
}
```

#### Approve a Payment
```
POST /api/admin/payments/:id/approve
Body:
{
  reason: "Payment verified through app store"
}

Response: Updated payment object with approved status
```

#### Reject a Payment
```
POST /api/admin/payments/:id/reject
Body:
{
  reason: "Duplicate transaction"
}

Response: Updated payment object with rejected status
```

### Admin Statistics and Configuration

#### Get Payment Statistics
```
GET /api/admin/analytics/payments

Response:
{
  totalPayments: 15,
  pending: 2,
  approved: 12,
  rejected: 1,
  totalAmountNaira: 22500,
  approvedAmountNaira: 18000,
  uniqueUsers: 10,
  paymentsByStatus: {
    pending: 2,
    approved: 12,
    rejected: 1
  }
}
```

#### Get Payment Account Details
```
GET /api/admin/payment-account

Response:
{
  accountName: "Global Affirmation Hub Limited",
  accountNumber: "1234567890",
  bankName: "Example Bank",
  bankCode: "012"
}
```

#### Set Payment Account Details
```
PUT /api/admin/payment-account
Body:
{
  accountName: "Global Affirmation Hub Limited",
  accountNumber: "1234567890",
  bankName: "Example Bank",
  bankCode: "012"
}

Response:
{
  message: "Payment account updated successfully",
  account: { ...account details }
}
```

## Security Features

### Admin Access Control
- Only users with `isAdmin = true` can access admin endpoints
- Middleware `requireAdmin` verifies admin status before processing
- All admin actions logged to audit trail with admin user ID

### Payment Tracking
- Every payment records exact user and amount
- Each approval/rejection tracked with admin ID and timestamp
- Complete audit log prevents fraud and ensures accountability

### Approval Mechanism
- Payments start in "pending" state
- Users cannot access purchased content until "approved"
- Admin must explicitly approve each payment while reviewing facts
- Rejections tracked with reasons for audit purposes

## Best Practices for Admins

1. **Review Pending Payments Regularly**
   - Check `/api/admin/payments?status=pending` daily
   - Verify transaction IDs match app store records
   - Check for duplicate transactions

2. **Document Rejections**
   - Always provide a reason when rejecting
   - Examples: "Duplicate transaction", "User already has access", "Fraud suspected"

3. **Maintain Payment Account**
   - Keep `/api/admin/payment-account` details updated
   - Update whenever account details change
   - Admins can share this with Finance/Accounting

4. **Monitor Statistics**
   - Check `/api/admin/analytics/payments` to spot trends
   - Monitor approved vs pending vs rejected ratios
   - Track total revenue by checking `approvedAmountNaira`

5. **Audit Trail**
   - Use audit logs to investigate discrepancies
   - Reference audit logs when disputes arise
   - All admin actions are permanently recorded

## Error Prevention

### Payment Errors Prevented
✅ **Duplicate Payments**: Transaction IDs are unique, duplicate attempts recorded  
✅ **Unverified Payments**: Admin must explicitly approve before unlock  
✅ **Wrong User Access**: User IDs tied to payment records, audit trail confirms  
✅ **Unauthorized Spending**: Admin controls all subscriptions centrally  
✅ **Lost Records**: Complete audit log never deletes, all actions tracked  

## Admin User Setup

To make a user an admin:

```typescript
// Direct database update (until admin UI is built)
UPDATE users SET is_admin = true WHERE id = <user_id>;
```

Or through code:
```typescript
import { db } from "./server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

await db
  .update(users)
  .set({ isAdmin: true })
  .where(eq(users.id, userId));
```

## API Authentication

All admin endpoints require:
- Valid session (via `/api/auth/login`)
- User must have `isAdmin = true`
- Session cookie automatically included in requests

## Monitoring & Alerts (Future Enhancements)

Consider implementing alerts for:
- Payment amount anomalies (unusually large/small amounts)
- High rejection rates
- Pending payment queue buildup (>24 hours)
- Failed payment verifications

## Example Admin Workflow

1. Admin logs in
2. Admin visits `/api/admin/payments` to view pending payments
3. Admin reviews each payment:
   - Checks transaction ID against app store
   - Verifies booklet and amount
   - Reviews user's account history
4. Admin approves legitimate payments via POST `/api/admin/payments/:id/approve`
5. Approved payment automatically unlocks the booklet for the user
6. Admin can review audit logs anytime via payment details endpoint
7. Admin updates account info at `/api/admin/payment-account` as needed

## Database Migrations

Run these migrations to add the new tables:

```sql
-- Add isAdmin to users table
ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Update monthlyPurchases with new fields
ALTER TABLE monthly_purchases 
ADD COLUMN amount_naira INTEGER NOT NULL DEFAULT 0,
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending',
ADD COLUMN approved_by INTEGER REFERENCES users(id),
ADD COLUMN approved_at TIMESTAMP;

-- Create paymentAuditLog table
CREATE TABLE payment_audit_log (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES monthly_purchases(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  details TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create adminSettings table
CREATE TABLE admin_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Summary

The Global Affirmation Hub now has a **completely centralized payment system** where:

- ✅ **All payments go to one account** - managed by admin
- ✅ **Admin controls everything** - subscriptions, in-app purchases, approvals
- ✅ **Complete transparency** - admin always knows who paid and for what
- ✅ **Full audit trail** - every payment action is recorded permanently
- ✅ **Error prevention** - unique transaction IDs, user mapping, explicit approvals
- ✅ **Fraud detection ready** - admins can review and reject suspicious payments

Everyone gets exactly what they paid for, and the admin maintains complete control.
