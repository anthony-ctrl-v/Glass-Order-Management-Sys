# Agent Log

This file records agent-assisted work and the related user verification for this project.

## Issue #001 — Initial Setup

- Date: 2026-09-21
- Agent: GitHub Copilot
- Work completed: Inspected the repository and created the initial project documentation structure. Updated the root README with the project purpose, problem statement, planned features and technology stack, development status, and basic local setup guidance.
- Application code added: None
- User verification: Verify that the requested files exist, review the documentation for accuracy, and confirm that no application code or fake research citations were added.

## Issue #002 — Paper Setup

- Date: 2026-09-21
- Agent: GitHub Copilot
- Work completed: Added the initial LaTeX paper structure with `paper.tex`, `references.bib`, a `Makefile`, and a `figures/` placeholder. Added target page-count comments for the title page and abstract, each required section, and the bibliography. Added root-level ignore rules for generated LaTeX build products.
- Files changed: `README.md`, `AGENTS.md`, `AGENT-LOG.md`, `.gitignore`, `paper/paper.tex`, `paper/references.bib`, `paper/Makefile`, `paper/figures/.gitkeep`, `sandbox/README.md`, and `docs/README.md`.
- Tests or checks run: Confirmed the requested paper section targets and ran `git diff --check`. Full LaTeX compilation is pending installation of MacTeX or TeX Live.
- User verification: User confirmed the changes should be committed and pushed.
- Follow-up: Install MacTeX or TeX Live and verify `make paper` locally.

## Issue #003 — Paper Build Verification

- Date: 2026-09-21
- Agent: GitHub Copilot
- Work completed: Verified that the initial LaTeX paper builds successfully with the installed MacTeX/TeX Live toolchain using `make paper` with a compatible locale.
- Files changed: `AGENT-LOG.md` only; generated LaTeX build products remain ignored.
- Tests or checks run: `latexmk` completed successfully and generated `paper/paper.pdf` with 2 pages. The build reports the expected empty bibliography warning because `references.bib` has no entries and the paper has no citation commands. The default shell locale in this environment (`C.UTF-8`) is unsupported by Perl, so the build required `LC_ALL=C LANG=C LC_CTYPE=C`.
- User verification: Review `paper/paper.pdf` visually and confirm the MacTeX setup works in the local terminal.
- Follow-up: Add verified bibliography entries and citations as the paper content is developed.

## Issue #004 — Issue Numbering

- Date: 2026-09-21
- Agent: GitHub Copilot
- Work completed: Added sequential issue numbers to existing agent-log entries and established zero-padded numbering for future entries.
- Files changed: `AGENT-LOG.md`.
- Tests or checks run: Reviewed the updated log structure.
- User verification: Review the issue numbering and confirm that future entries continue from Issue #005.
- Follow-up: Record the next agent-assisted task as Issue #005.

## Issue #005 — Remove Local Milestone List

- Date: 2026-09-21
- Agent: GitHub Copilot
- Work completed: Removed the project milestone list from `AGENT-LOG.md` after clarifying that milestones should be managed through GitHub.
- Files changed: `AGENT-LOG.md`.
- Tests or checks run: Reviewed the log structure after removing the milestone section.
- User verification: Confirm that the local log now contains issue history only.
- Follow-up: Create and manage milestones in GitHub when access and project planning details are available.

## Issue #006 — Repository-Based Wiki Template

- Date: 2026-09-21
- Agent: GitHub Copilot
- Work completed: Added a private repository-based wiki template under `docs/` with Home, weekly Log, Design, Results, Reading, and Appendix pages, plus navigation from `docs/README.md`.
- Files changed: `docs/README.md`, `docs/home.md`, `docs/log.md`, `docs/design.md`, `docs/results.md`, `docs/reading.md`, `docs/appendix.md`, and `AGENT-LOG.md`.
- Tests or checks run: Reviewed the page links and template structure; no application code was changed.
- User verification: Review the new documentation pages and confirm that the headings and placeholders fit the intended wiki structure.
- Follow-up: Record future agent-assisted work as Issue #007 or higher.

## Issue #007 — Agent Weekly Log Instruction

- Date: 2026-09-21
- Agent: GitHub Copilot
- Work completed: Updated `AGENTS.md` to require dated weekly updates in `docs/log.md` for material repository work, and added the current week’s documentation entry.
- Files changed: `AGENTS.md`, `docs/log.md`, and `AGENT-LOG.md`.
- Tests or checks run: Reviewed the instruction and confirmed the weekly log follows the existing template.
- User verification: Review the instruction and confirm that future material agent work should be summarized in the current weekly log entry.
- Follow-up: Record future agent-assisted work as Issue #008 or higher and update the current week in `docs/log.md` when appropriate.

## Issue #008 — Remove Local Wiki After GitHub Verification

- Date: 2026-10-17
- Agent: GitHub Copilot
- Work completed: Removed the duplicate repository-based Wiki from `docs/` after the user verified the GitHub Wiki contents. Updated the root README and agent guidance to point to the GitHub Wiki instead.
- Files changed: `README.md`, `AGENTS.md`, `AGENT-LOG.md`, and the former Wiki files under `docs/`.
- Tests or checks run: Verified the exact old Wiki files before deletion and ran `git diff --check` after the updates.
- User verification: User confirmed that the GitHub Wiki contents were correct before requesting deletion of the old local Wiki.
- Follow-up: Use the separate GitHub Wiki repository for future Wiki pages and weekly logs.

## Issue #009 — Order and Production Tracking Requirements

- Date: 2026-10-31
- Agent: GitHub Copilot
- Work completed: Began a two-day requirements-definition effort (October 31–November 1) for a PostgreSQL relational schema covering customers and contacts, orders and order items, glass specifications, and pane/unit production tracking.
- Files changed: `AGENT-LOG.md`; GitHub Wiki `Log.md`.
- Tests or checks run: Reviewed the existing agent log and Wiki log; no application code or schema was changed.
- User verification: Requirements remain under discussion and must be confirmed before implementation.
- Follow-up:
  - See Issue #010 for the consolidated requirements and deferred scope.

## Issue #010 — Relational Schema Requirements Review

- Date: 2026-11-01
- Agent: GitHub Copilot
- Work completed: Completed the two-day requirements-definition effort and recorded the following agreed implementation baseline:
  - **Customer and order:** A business Customer has a legal name, general phone/email, default billing/shipping addresses, and one default contact (name, phone, email, optional role/title and notes). Each Order references the Customer, has an automatically generated order number, creation/due dates, and an order-lifecycle status separate from production. The order snapshots billing/shipping addresses and copies the default contact into editable order-specific shipping-contact fields.
  - **Order Item and pricing:** Each line has a stable line number within its Order, one glass make/specification, quantity of finished units, and a saved unit price. Line total is quantity × unit price; Order total is the sum of its lines.
  - **Glass specifications and catalogs:** One Glass Unit specification belongs to each Order Item and stores overall width/height in inches, construction type (monolithic, insulated, laminated, or laminated-insulated), and optional notes. The form may prefill 12 × 12 inches, but users can change it. Pane specifications are ordered exterior-to-interior and store an editable-catalog glass product, numeric-inch thickness and dimensions (displayed as fractions), heat treatment (none/tempered/heat strengthened), holes yes/no, and edge work (none/flat polish/bevel, with flat polish and bevel selectable together). Glass-product catalog entries have a name, optional manufacturer/description, and active flag.
  - **Surfaces and construction details:** Each pane has Side A facing the unit exterior and Side B facing inward; unit-wide surface numbers are calculated from pane position. A surface can have multiple treatments from an editable catalog; treatment types have active and facility-work-required flags, and every required treatment creates its own checklist step. Laminating Interlayers belong to a Glass Unit specification, reference the two adjacent pane specifications, and allow multiple sequenced sheets per gap with editable material/color, decimal-inch thickness, and optional free-text brand. Each adjacent-pane gap has one Insulating Cavity with editable spacer type/color, numeric-inch width (displayed as a fraction), and gas-filled yes/no. Interlayer and spacer colors use separate catalogs.
  - **Physical tracking and barcodes:** Create one Physical Glass Unit for every unit in the ordered quantity, with barcode `order_number-item_line_number-unit_number`. Create one Physical Pane per pane position for each unit, linked to its unit and pane specification, with barcode `order_number-item_line_number-unit_number-pane_position`. Each physical pane progresses independently. A unit view shows overall readiness and each pane’s current department/status.
  - **Departments, steps, and checklists:** Editable departments are Cutting, Tempering/Heatstrength, Edge Work, Drilling for Holes, Sandblast, Painting, Lamination, and Insulation. Reusable step types have a default department and configurable delay threshold. Checklists are generated from order specifications before production, then preserved if setup defaults change; pane-level requirements generate pane steps, while lamination/insulation generate unit-level steps. There is no separate configurable rule-builder in the initial scope. The standard pane sequence is cutting, heat treatment if specified, holes if required, required non-paint surface treatments, selected edge work, then painting if required. Unit assembly follows pane work; laminated-insulated units laminate before insulating.
  - **Scans, readiness, and audit:** Every checklist step has its own `staged` → `in_progress` → `ready` scan history with timestamp and employee. A ready scan alerts the next department via its work queue; the receiving department marks the item staged when picked up. Delay flags appear on department queues when the latest staged/in-progress status exceeds that step’s threshold, measured in Monday–Friday working days (holidays ignored initially); the timer resets on each status scan. Checklist edits are allowed at any time for authorized users and audited with actor, time, reason, action, affected step, and old/new values. Pane/unit statuses and readiness are derived from checklists and scans. Completing required pane and unit work yields “ready to ship.”
  - **Staff access:** Staff records have display name, unique work login/email, active status, one role (Administrator, Production Staff, or Supervisor), and association with one or more departments. Scans and checklist edits reference the staff record.
  - **Deferred scope:** Actual packing/shipping records and shipped status, order-completion records, backorders, and notification recipients are future work requiring further requirements. Initial scope includes “ready to ship,” department work queues, and delay flags, but does not implement shipment completion or recipient notifications.
- Files changed: `AGENT-LOG.md`; GitHub Wiki `Log.md`.
- Tests or checks run: Reviewed the requirements with the user and ran `git diff --check`; no application code or database schema was changed.
- User verification: The user confirmed the summarized table groups and relationships. This is the agreed working baseline for implementation; deferred workflows remain out of scope until separately defined.
- Follow-up:
  - Implement the confirmed baseline in the existing application after inspecting its current architecture and database conventions.
  - Define and implement order completion, backorders, packing/shipping, shipped status, and notification recipients in later work.

## Issue #011 — Milestone 1: Customers and Orders

- Date: 2026-11-01
- Agent: GitHub Copilot
- Work completed: Implemented the first agreed milestone using React/TypeScript, Express/TypeScript, PostgreSQL, and Prisma. Added customer and one-to-one default-contact records, order and order-item records, order-specific billing/shipping address and shipping-contact snapshots, generated order numbers and stable line numbers, saved two-decimal unit prices, and calculated line/order totals. Added customer create/edit, order creation, order status changes, and responsive dashboard screens.
- Files changed: `README.md`, `.gitignore`, root/npm workspace manifests, and `apps/api` and `apps/web` application files including the Prisma schema and initial PostgreSQL migration.
- Tests or checks run: `npm run build`; `npm test` (5 passing tests); Prisma schema validation; initial migration diff reviewed against the schema; `npm audit` (0 vulnerabilities); `git diff --check`; API health and frontend HTTP smoke checks; mocked browser flow for creating an order and displaying its calculated total; later verified the migration and customer/order CRUD against local PostgreSQL.
- User verification: Not yet performed.
- Follow-up:
  - Continue with milestone 2 for glass products and specifications after milestone 1 is merged.
  - Keep physical pane/unit tracking, production workflow, staff access, and deferred fulfillment features in their planned later milestones.

## Issue #012 — Local PostgreSQL Development Setup

- Date: 2026-11-01
- Agent: GitHub Copilot
- Work completed: Installed and started Homebrew PostgreSQL 16 locally, created a dedicated `glass_orders_app` role and `glass_orders` database, and created a dedicated `glass_orders_shadow` database for Prisma migration checks. Configured the API’s local `.env` from the tracked example and updated Prisma config/README setup instructions.
- Files changed: `README.md`, `apps/api/.env.example`, `apps/api/prisma.config.ts`. The local `apps/api/.env` is ignored and not committed.
- Tests or checks run: Applied the initial Prisma migration successfully; created, read, and updated a temporary customer/order through the API; verified order totals, default contact/address snapshots, and that snapshots stay unchanged after customer defaults are edited; removed the temporary test records. `npm run build`, `npm test` (5 passing), `npm audit` (0 vulnerabilities), Prisma validation, and `git diff --check` passed.
- User verification: Local development database setup is complete; review the app at `http://localhost:5173`.
- Follow-up:
  - Keep local PostgreSQL 16 running for development.
  - Use password authentication and a non-publicly accessible database for any shared or deployed environment; the local Homebrew cluster is configured for local development.
  - Continue with milestone 2 after confirming the milestone 1 app workflow.
