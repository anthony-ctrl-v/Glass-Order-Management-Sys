# Glass Order Management System

## Project Purpose

This senior-design project will explore and build a web-based system for managing glass-manufacturing orders from intake through production and fulfillment.

## Problem Being Addressed

Glass-manufacturing orders can require many specifications, production steps, deadlines, and status updates. When this information is scattered across manual records or disconnected tools, it can be difficult to track order progress, communicate changes, and maintain an accurate view of work. This project aims to provide a centralized workflow for organizing that information.

## Core Features

- Customer and contact management
- Order creation with glass specifications and measurements
- Order status and production-stage tracking
- Scheduling and assignment of production work
- Searchable order history
- Notifications or status updates for relevant users
- Role-based access for system users
- Reports or dashboard views for operational status

Implementation is being delivered in four milestones. The first milestone covers customers, their default contact, orders, and order items. Production tracking and fulfillment features will follow.

## Technology Stack

- Frontend: React with TypeScript
- Backend: Node.js with Express and TypeScript
- Database: PostgreSQL
- Database toolkit: Prisma ORM and migrations
- API: RESTful HTTP API
- Version control: Git and GitHub

## Development Status

Milestone 1 is implemented: customer/contact management, order entry, order items, address/contact snapshots, pricing, and order lifecycle status. Glass specifications and production tracking are planned for later milestones.

## Basic Local Setup

1. Clone the repository.
2. Install Node.js 20.19+ and PostgreSQL 16+.
3. Run `npm install`.
4. Create the development database role and database (Homebrew PostgreSQL on macOS):
   ```sh
   createuser --login glass_orders_app
   createdb --owner=glass_orders_app glass_orders
   createdb --owner=glass_orders_app glass_orders_shadow
   ```
   The shadow database is used by Prisma to safely check migrations. The Homebrew development cluster uses local trust authentication by default. Keep the server bound to localhost; use password authentication and a non-publicly accessible database for any shared or deployed environment.
5. Copy `apps/api/.env.example` to `apps/api/.env`.
6. Run `npm run db:migrate` to create the database tables.
7. Run `npm run dev`, then open the frontend at <http://localhost:5173>.

The API runs at <http://localhost:3001>; Vite proxies `/api` requests to it during development.
Do not commit `.env` files or credentials.

For current project activity and verification notes, see `AGENT-LOG.md`.
