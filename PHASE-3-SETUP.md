# Phase 3 — PostgreSQL + Prisma setup

This patch adds the database schema, Prisma client helper, and an idempotent seed script. The existing `/shop` page still uses demo data until a later phase wires it to database queries. That lets you configure and verify the database without breaking the current shop UI.

## Before you start

- Keep a copy of your working project.
- Install PostgreSQL locally, or create a PostgreSQL database with a managed provider.
- Never share your database password or commit your `.env` file.

## Apply this patch

Extract the patch ZIP into the root of your existing `bake-and-bloom-by-joe` project and merge folders. It adds `prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/prisma.ts`, `.env.example`, and this guide, and includes a `package.json` with the Prisma scripts/dependencies.

If Windows asks whether to replace `package.json` or `.env.example`, compare with your existing files first. This project version's package file preserves the existing dependencies and scripts while adding Prisma.

## Configure the database

1. Copy `.env.example` to `.env` in the project root (do not name it `.env.txt`).
2. Edit `DATABASE_URL` with your actual PostgreSQL username, password, host, port, and database name.
3. Ensure the database exists. For a local database, create one named `bake_and_bloom` using pgAdmin or your PostgreSQL tools.

Example local URL (replace the password):

`postgresql://postgres:YOUR_PASSWORD@localhost:5432/bake_and_bloom?schema=public`

## Install and initialize

Run these in the VS Code terminal from the project root, one at a time:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

To inspect records later:

```bash
npm run db:studio
```

Stop the studio with Ctrl+C when done. Run `npm run dev` to restart Next.js.

## What the seed creates

- Four sample categories and eight sample products based on the current demo catalog.
- A default variant for each product, sample prices, and sample stock.
- A product image record for each sample product.
- An inactive Coimbatore delivery-zone placeholder.

The seed script can be run more than once. The product details/prices and seed variant fields are updated to match the sample data when re-run; manually review changes before using it after editing the seed data.

## Important

- The shop is not yet connected to PostgreSQL in this phase; the current `/shop` still uses `src/lib/demo-products.ts`.
- Delivery zone, pickup location, and fulfillment slots intentionally remain inactive until actual business settings are supplied.
- Sample prices, products, stock counts, images and preparation times are development data only.
- Do not accept live orders or payments yet. Order, inventory, authentication, payment verification, and admin features are later phases.
