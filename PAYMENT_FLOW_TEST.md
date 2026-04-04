# Payment Flow Testing Guide

This guide walks you through testing the complete payment system end-to-end.

## Overview

The payment system works as follows:
1. **User registers/logs in** → Session is created
2. **User clicks "Unlock" on a booklet** → Payment modal appears
3. **User confirms payment** → Payment recorded as "pending"
4. **Booklet shows "Pending admin approval" status** → User waits for admin
5. **Admin logs in & approves payment** → Booklet unlocks for user
6. **User refreshes app** → Booklet is now unlocked

---

## Step 1: Start Dev Server

```bash
npm run dev
```

Wait for:
- ✓ Backend server ready on port 5000
- ✓ Database connection initialized
- › Metro waiting on exp://127.0.0.1:8081

---

## Step 2: Create Test User Account

Open Expo Go and:
1. Navigate to booklet **April 2026**
2. Click **"Sign Up"** on the login screen
3. Register with:
   - **Username:** testuser
   - **Email:** test@example.com
   - **Password:** Test123!
   - **Display Name:** Test User

✓ You are now logged in

---

## Step 3: Test Payment Recording

API Endpoint: `POST /api/purchases/verify`

Replace `172.20.10.3` with your actual PC IP address:

```bash
curl -X POST http://172.20.10.3:5000/api/purchases/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "bookletId": 12,
    "platform": "android",
    "productId": "affirmation_april_2026",
    "transactionId": "manual_android_12_1234567890",
    "purchaseToken": "manual_affirmation_april_2026_1234567890"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "bookletId": 12,
  "paymentId": 1,
  "status": "pending_approval",
  "message": "Payment recorded successfully. Waiting for admin approval."
}
```

---

## Step 4: Check Payment Status

In the app, in Dev Tools or via API:

```bash
curl -X GET http://172.20.10.3:5000/api/purchases/status \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**Expected Response:**
```json
{
  "purchases": [
    {
      "id": 1,
      "bookletId": 12,
      "status": "pending",
      "amountNaira": 1500,
      "transactionId": "manual_android_12_1234567890",
      "createdAt": "2026-04-03T...",
      "approvedAt": null,
      "bookletTitle": "Affirmations - April 2026",
      "bookletMonth": 4,
      "bookletYear": 2026
    }
  ],
  "summary": {
    "pending": 1,
    "approved": 0,
    "rejected": 0
  }
}
```

✓ Payment is recorded as "pending"

---

## Step 5: Admin Approval

First, create an admin account:

```bash
curl -X POST http://172.20.10.3:5000/api/admin/setup \
  -H "Content-Type: application/json" \
  -H "x-admin-setup-token: admin-secret-key-2026" \
  -d '{
    "username": "admin",
    "email": "admin@affirmations.app",
    "password": "AdminPass123!",
    "displayName": "Admin User"
  }'
```

**Expected Response:**
```json
{
  "id": 2,
  "username": "admin",
  "email": "admin@affirmations.app",
  "displayName": "Admin User",
  "isAdmin": true,
  "message": "Admin account created successfully"
}
```

Save the session cookie, then approve the payment:

```bash
curl -X POST http://172.20.10.3:5000/api/admin/payments/1/approve \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=ADMIN_SESSION_COOKIE" \
  -d '{
    "reason": "Verified and approved"
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "userId": 1,
  "bookletId": 12,
  "status": "approved",
  "amountNaira": 1500,
  "approvedBy": 2,
  "approvedAt": "2026-04-03T...",
  "message": "Payment approved successfully"
}
```

✓ Payment status is now "approved"

---

## Step 6: Verify Booklet Access

Check if the user now has access:

```bash
curl -X GET http://172.20.10.3:5000/api/booklets/12/access \
  -H "Cookie: connect.sid=USER_SESSION_COOKIE"
```

**Expected Response:**
```json
{
  "bookletId": 12,
  "unlocked": true,
  "previewDays": 2,
  "monthlyPriceNaira": 1500
}
```

✓ The booklet is now unlocked for the user

---

## Server Logs

When testing via the app, check the server terminal for logs like:

```
💳 Payment verification started for user 1
📋 Payment details: bookletId=12, platform=android, transactionId=manual_android_12_1234567890
✓ Purchase verification passed
✅ Payment recorded with ID 1, status: pending
```

---

## Troubleshooting

### Payment not recording?
- Check server logs for error messages
- Verify user is authenticated (session cookie is valid)
- Make sure all required fields are present

### Booklet not unlocking after admin approval?
- Refresh the app (pull down to refresh)
- Check that payment status is indeed "approved"
- Verify the booklet ID matches in the payment record

### Session/authentication issues?
- Make sure cookies are being sent with `-H "Cookie: connect.sid=..."`
- Logout and login again
- Clear browser/app cache

---

## Quick Test Flow in App

1. **Register** → testuser / test@example.com / Test123!
2. **Browse booklets** → Tap "April 2026"
3. **Tap "Unlock" button**
4. **Payment modal appears** → Shows bank details
5. **Tap "I've Made the Payment"**
6. **See "Pending admin approval"** ← Payment recorded as pending
7. **Admin approves payment** (via API)
8. **User refreshes app** → Now shows "✓ Unlocked!"

---

## API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/register` | POST | None | Register new user |
| `/api/auth/login` | POST | None | Login user |
| `/api/auth/me` | GET | Required | Get current user |
| `/api/purchases/verify` | POST | Required | Record payment |
| `/api/purchases/status` | GET | Required | Check user's payments |
| `/api/booklets/:id/access` | GET | Required | Check if booklet unlocked |
| `/api/admin/setup` | POST | Token | Create admin account |
| `/api/admin/payments` | GET | Admin | List all payments |
| `/api/admin/payments/:id/approve` | POST | Admin | Approve payment |
| `/api/admin/payments/:id/reject` | POST | Admin | Reject payment |

---

## Environment Variables

Make sure `.env.local` has:
```
DATABASE_URL=postgresql://...
ADMIN_SETUP_TOKEN=admin-secret-key-2026
```

---

**Ready to test!** 🚀
