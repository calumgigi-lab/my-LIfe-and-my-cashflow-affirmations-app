# Admin Console Setup Guide

## Quick Start: Creating Your Admin Account

### Option 1: Setup Token Method (Recommended for Production)

1. **Set environment variable** in `.env`:
   ```bash
   ADMIN_SETUP_TOKEN=your-secret-admin-token-here
   ```

2. **Call the setup endpoint** with your token:
   ```bash
   curl -X POST http://localhost:5000/api/admin/setup \
     -H "Content-Type: application/json" \
     -H "x-admin-setup-token: your-secret-admin-token-here" \
     -d '{
       "username": "admin",
       "email": "admin@affirmations.app",
       "password": "your-secure-password",
       "displayName": "Admin"
     }'
   ```

3. **Login** with your admin credentials at `/` in the app

4. **Access admin console** at `/admin-payments` to manage all payments

### Option 2: Direct Database Method (Development Only)

If you want to skip the setup token:

1. **Create a regular user account** via the app signup (username: admin, email: admin@affirmations.app)

2. **Promote to admin** via:
   ```bash
   curl -X POST http://localhost:5000/api/admin/users/1/promote \
     -H "Cookie: your-session-cookie"
   ```

   Or directly in the database:
   ```sql
   UPDATE users SET is_admin = true WHERE id = 1;
   ```

3. **Login** with those credentials and access `/admin-payments`

## Admin Routes

Once you're logged in as admin:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/payments` | GET | List all payments (with filters) |
| `/api/admin/payments/:id/approve` | POST | Approve a payment |
| `/api/admin/payments/:id/reject` | POST | Reject a payment |
| `/api/admin/analytics/payments` | GET | Payment statistics & analytics |
| `/api/admin/payment-account` | GET/PUT | Manage centralized payment account |
| `/api/admin/users` | GET | List all users (admin only) |
| `/api/admin/users/:userId/promote` | POST | Promote user to admin |
| `/api/admin/users/:userId/demote` | POST | Demote admin to regular user |

## Admin Console Features

### Payment Management (`/admin-payments`)
- View pending, approved, and rejected payments
- Filter by status and search by user/booklet
- Approve or reject individual payments with optional reasons
- View payment audit logs and history
- See payment statistics (pending count, total amounts, etc.)
- Configure centralized payment account details

### User Management
- View all registered users
- Promote users to admin status
- Demote admins back to regular users
- Manage who can access the admin console

## Important Notes

⚠️ **Setup Token**: 
- Only works **once** if `ADMIN_SETUP_TOKEN` is set
- After first admin is created, only existing admins can register new admins via the promote endpoint
- Store your setup token securely in `.env` (never commit to git)

⚠️ **Admin Access**: 
- Only users with `isAdmin = true` can access `/admin-payments`
- Regular users cannot see or approve payments
- All admin actions are logged in the payment audit log

🔐 **Security**:
- Setup endpoint is protected by token header
- All admin routes require authentication + admin status
- Self-demotion is prevented (can't accidentally lock yourself out)

## Example Workflow

1. Set `ADMIN_SETUP_TOKEN=demo-secret-123` in `.env`
2. Start the server
3. Call setup endpoint with your token to create first admin
4. Login with admin credentials
5. Navigate to `/admin-payments` in the app
6. View and manage all payments
7. Use `/api/admin/users/:id/promote` to make other users admins
