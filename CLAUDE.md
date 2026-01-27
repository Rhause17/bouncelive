# BounceLive Mobile - Project Context

## Project Overview
Physics-based puzzle game being migrated from HTML5 to React for mobile deployment.

## Current State
- Working HTML5 game exists in src/legacy/
- 12 different shape types implemented
- Lives-based progression system
- Known issue: Safari freezes 1-2 minutes during level transitions

## Tech Stack
- Framework: React 18 + Vite
- Physics: Matter.js
- Database: Supabase
- Hosting: Vercel
- Testing: Vitest + Playwright

## Key Features to Preserve
1. All 12 shape types and their physics behaviors
2. Lives system
3. Level progression
4. Score calculation

## Features to Add
1. User authentication
2. Cloud save
3. Leaderboards
4. PWA support

## Priority Tasks
1. Analyze legacy code and identify Safari issue
2. Set up React + Vite
3. Migrate physics engine
4. Add Supabase integration
5. Deploy to Vercel
