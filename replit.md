# My Life & My Cash Flow - Affirmations App

## Overview
A mobile affirmations app that delivers daily affirmations via timed notifications throughout the day. Users can browse monthly affirmation booklets, mark affirmations as completed, track their affirmation streak, and view engagement statistics.

**Produced by:** My Life & My Cash Flow Affirmation Studios, a subsidiary of Zion House Int'l

## Current State
- Full-stack Expo + Express application with PostgreSQL database
- User authentication (register/login/logout) with session management
- 12 monthly affirmation booklets with 15 daily affirmations each (placeholder content - awaiting real PDF content from user)
- Daily affirmation display, completion tracking, streak system
- Push notification reminders via expo-notifications (local scheduled)
- Luxury gold/black theme with Playfair Display + DM Sans fonts

## Recent Changes
- 2026-02-08: Added studio branding attribution to login, register, and profile screens
- 2026-02-08: Implemented notification settings with toggle on profile screen
- 2026-02-08: Fixed route ordering bug - /api/affirmations/today before /api/affirmations/:id
- 2026-02-08: Built all main screens (Today, Library, Profile, Booklet detail, Affirmation detail)

## Project Architecture
### Frontend (Expo Router)
- `app/_layout.tsx` - Root layout with font loading, auth provider, query client
- `app/index.tsx` - Splash/redirect based on auth state
- `app/(auth)/login.tsx` - Login screen with gold gradient branding
- `app/(auth)/register.tsx` - Registration screen
- `app/(main)/_layout.tsx` - Tab navigation (NativeTabs for iOS 26+, classic Tabs with blur fallback)
- `app/(main)/index.tsx` - Today dashboard: daily affirmation, streak stats, quick actions
- `app/(main)/library.tsx` - Browse all monthly booklets
- `app/(main)/profile.tsx` - User stats, notification settings, sign out
- `app/booklet/[id].tsx` - Booklet detail with list of affirmations
- `app/affirmation/[id].tsx` - Full affirmation text with mark-as-affirmed button

### Backend (Express + TypeScript)
- `server/index.ts` - Express server setup, landing page, Expo manifest serving
- `server/routes.ts` - All API routes (auth, booklets, affirmations, completions, streaks, stats, notifications)
- `server/storage.ts` - Database storage layer with Drizzle ORM
- `server/seed.ts` - Database seeding with 12 monthly booklets

### Shared
- `shared/schema.ts` - Drizzle schema (users, booklets, affirmations, completions, streaks, notification_settings)
- `constants/colors.ts` - Theme colors (gold #C8973E/#D4A853, black #0A0A0A)
- `lib/auth-context.tsx` - Auth context provider
- `lib/query-client.ts` - React Query setup with API helpers
- `lib/notifications.ts` - Expo notifications setup and scheduling

### Key Design Decisions
- Gold (#C8973E, #D4A853) and black (#0A0A0A) luxury color scheme
- Playfair Display for headings, DM Sans for body text
- Route order: /api/affirmations/today MUST come before /api/affirmations/:id
- Notifications: Local scheduled notifications every 30 min from 8am-9pm

## User Preferences
- User has their own affirmation content in PDF format to replace placeholder data
- App should convey wealth and spiritual energy
- Notifications should send affirmation chunks (paragraph by paragraph) every 20-30 min with "Have you affirmed today?" prompts
