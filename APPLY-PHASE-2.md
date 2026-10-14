# Apply Phase 2 catalog update

This update adds the shop catalog preview and product detail pages to the existing Phase 1 project.

## Option A — Update your existing VS Code project

1. Stop the dev server with `Ctrl+C` in the VS Code terminal.
2. Extract `bake-and-bloom-phase2-catalog-patch.zip`.
3. Copy the extracted `src` folder into your existing `bake-and-bloom-by-joe` project folder.
4. If Windows asks whether to merge folders or replace `src/app/globals.css`, choose **Merge** and **Replace** for that CSS file.
5. The new files should appear under `src/app/shop`, `src/components/products`, and `src/lib/demo-products.ts`.
6. Start the site again with `npm run dev`.
7. Open `http://localhost:3000/shop`.

No new npm packages are required for this catalog phase.

## What is included

- Searchable product catalog
- Category filters
- Price and name sorting
- Product detail pages
- Responsive Rustic Artisan styling
- Demo product data and sample prices

## Important

The products, prices, images, and preparation times are sample data. This phase does not connect PostgreSQL and does not enable real cart, checkout, payments, or order placement. Those features come later.
