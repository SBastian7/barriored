# 03 — Product Capabilities & State of the Art

**As of June 2026, BarrioRed is feature-rich and near launch-ready.** Far beyond an MVP: all four public pillars are live, plus a full admin/operations layer and the first monetization features. This file is the canonical inventory of *what the product can actually do*, so strategy and content stay grounded in reality.

> Status legend: ✅ built & working · 🟡 partial / in progress · 🔜 planned

## Platform architecture (in plain terms)

- **Multi-tenant:** every neighborhood is its own instance at `barriored.co/{community-slug}` (e.g. `/parqueindustrial`). Data is isolated per community; adding a neighborhood doesn't require new code. ✅
- **Mobile-first PWA:** installable, works on low-end phones, tolerates poor connectivity, has an offline page. ✅
- **WhatsApp-first contact** throughout. ✅
- **Role-based access:** Super Admin (all communities), Community Admin (own community), Community Moderator (content only), Regular User. ✅

## Pillar 1 — Directorio (Business Directory) ✅

- Community homepage: hero, neighborhood stats, quick-nav to the four pillars, featured businesses, register CTA.
- Browse the directory; filter by category; search by name.
- Individual business profiles: name, description, photos, hours, location, category, and a **WhatsApp button** with a pre-filled message.
- **Map view** of all businesses (Leaflet).
- **Business registration** — multi-step form with photo upload and map location picker. **No RUT or Cámara de Comercio required.**
- Approval workflow: `pending → approved / rejected`.
- Favorite/save businesses.
- Merchant **dashboard** to create, edit, resubmit, and manage their listing.

## Pillar 2 — Comunidad / Red Vecinal (Neighborhood Board) ✅

- Neighborhood board with **announcements**, **alerts**, **events**, and **jobs**.
- Alerts for water cuts, construction, security, etc., with **expiration dates** and **auto-deactivation** of expired alerts.
- **Local events** with detail pages and an "attend" action.
- Residents can **create, edit, and delete their own posts** (with confirmation), including image uploads.
- **Pin/unpin** important announcements.
- **Browser push notifications** for community alerts, with a permission prompt and a service worker for offline handling.
- Admin/moderator panel with **type + status filtering**, full CRUD, and manual or automatic push dispatch.
- Favorite community posts; flag posts for moderation.

## Pillar 3 — Marketplace / Clasificados (Local Buy & Sell) ✅

- Public marketplace hub per community; browse active classifieds.
- Category filtering, search by title/description, instant client-side filtering, featured (newest) section.
- Classified detail pages with image gallery and a **WhatsApp contact button**.
- **Authenticated users can create and edit their own listings** (user dashboard).
- Full admin moderation: list/detail/edit/delete, flag/unflag, **ban users** from the marketplace, stats dashboard (active/sold/flagged/banned), audit logging.
- Responsive design with empty-state handling.
- 🔜 Paid featured listings (monetization).

## Pillar 4 — Servicios (Public Services Directory) ✅

- Curated directory of public services, emergency contacts, transport, and government procedures.
- Residents can **suggest** a service and **report** an issue with a listing.
- Admin management of services and platform-level service categories.

## Monetization features (Phase 2 — substantially built) ✅🟡

- **Premium / featured businesses** — subscription model: request, admin activate/revoke/cancel, payment tracking. ✅
- **Subscriptions admin** + business-level subscription status. ✅
- **Rotating banner ads** on the homepage — request → admin approval → active rotation. ✅
- **Reviews & ratings** for businesses — create/edit/delete reviews, business owner **responses**, **flagging** and admin resolution of flagged reviews. ✅
- **Business analytics** — view metrics and engagement tracking per business. ✅
- **Payments** admin + platform payment-gateway configuration (manual transfer / Nequi-style first; gateways configurable). 🟡

## Cross-cutting capabilities

### Accounts & auth ✅🟡
- Email/password signup, login, password reset/forgot. ✅
- User profiles: view, edit, avatar upload. ✅
- **WhatsApp OTP** verification (send/verify/link). 🟡 (built; uses Twilio)
- Account states (e.g. suspended) and per-role dashboards. ✅

### Admin & operations console ✅
A deep operations layer exists, including:
- **Businesses** moderation (approve/reject/edit/feature), **categories** management (with drag-and-drop reorder), **users** management (search, view, delete).
- **Communities** management — create and configure neighborhoods, **staff/roles**, and **SEO** settings (the heart of multi-tenant operations).
- **Reports** handling, **community** content moderation, **alerts** with push dispatch.
- **Reviews** and **review-flags** moderation; **banners** and **subscriptions** management.
- **Statistics**, **engagement**, and **payments** dashboards.
- **Logs:** audit log + error log. **Tools** and **storage** (summary/sync) utilities.
- **Platform settings**, **policies**, **payments**, and **service categories** at the platform level.
- Data export (e.g. businesses).

### Notifications & messaging ✅
- Web **push notifications** (VAPID/web-push) with subscription management and admin test/stats/config.
- **Email** via Resend, including a **weekly digest** and **daily expiration** cron jobs.
- Scheduled jobs (cron) for community maintenance, digests, and expiration checks.

### Trust, safety & analytics ✅
- Row-Level Security enforcing community isolation across all tables.
- Audit logging for admin actions; error logging.
- Flagging/moderation across businesses, posts, reviews, and marketplace.
- User bans (marketplace); content approval workflows.
- Analytics tracking (custom events + Vercel Analytics); health endpoint.

## Honest gaps / things still owed before launch

- **Security follow-ups** (key rotation, hardening migration) tracked separately in the engineering workspace — relevant for *launch timing*, not for product capability.
- Some monetization flows are **manual-first** (payments) rather than fully automated gateways.
- WhatsApp OTP and a few growth features are built but may need real-world hardening/testing.
- No real users/metrics yet — see file 05 for targets vs. reality.

## What this means for strategy & content

- We can credibly market BarrioRed as a **complete neighborhood platform**, not a prototype.
- The strongest launch hooks: **free WhatsApp-first business listing**, **the neighborhood board with alerts**, and **local marketplace** — all live today.
- Monetization (featured businesses, banners) is technically ready, so revenue messaging is realistic — but should be introduced gently and only after adoption.
