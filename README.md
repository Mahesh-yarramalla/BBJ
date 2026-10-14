# Bake and Bloom By Joe

A Next.js App Router starter for a rustic artisan bakery ecommerce store serving Coimbatore, Tamil Nadu, with delivery and direct pickup planned.

## Current phase

Phase 2 frontend catalog preview. The shop now includes searchable and filterable sample products, category filters, price/name sorting, and product detail pages. The catalog currently uses local demo data; it is not connected to PostgreSQL yet. Cart, checkout, payments, account features, and the admin dashboard remain future phases.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS 3
- PostgreSQL + Prisma planned for the next database integration step
- DM Serif Display + Inter via `next/font/google`
- Lucide icons

## Getting started

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Current brand defaults

- Brand: Bake and Bloom By Joe
- Service area: Coimbatore, Tamil Nadu, India
- Fulfillment: delivery and direct pickup
- Same-day cut-off default: 2:00 PM, subject to preparation time and slot availability
- Palette: `#F6F0E6`, `#FFFFFF`, `#68765A`, `#B86F50`, `#49382D`, `#E5D8C7`

## Demo catalog warning

Product names, prices, images, and preparation times are sample data for development. Replace them with verified business details before launch. The shop does not accept orders yet.

## Next steps

1. Connect PostgreSQL and Prisma; replace `src/lib/demo-products.ts` with database queries.
2. Add product variants, inventory, categories, delivery zones, pickup location and fulfillment slots.
3. Implement a real cart and server-calculated checkout.
4. Implement authentication, admin access, payment verification and order notifications.
5. Configure a verified Coimbatore delivery coverage list, real pickup address, opening hours, fees and payment settings.

Do not use this starter to accept real payments or orders until checkout, authorization, payment verification, policies, and production configuration are implemented and tested.
