export type BakeryCategory = "Cakes" | "Breads" | "Cookies & Brownies" | "Pastries & Desserts";

export type BakeryProduct = {
  id: string;
  slug: string;
  name: string;
  category: BakeryCategory;
  description: string;
  pricePaise: number;
  unit: string;
  image: string;
  imageAlt: string;
  preparationHours: number;
  featured?: boolean;
  tags: string[];
};

/**
 * Demo catalog for the UI build. These prices, preparation times, and products
 * are examples only and must be reviewed before the store accepts real orders.
 * This array will be replaced by PostgreSQL/Prisma queries in the next phase.
 */
export const demoProducts: BakeryProduct[] = [
  {
    id: "demo-001",
    slug: "classic-cinnamon-rolls",
    name: "Classic Cinnamon Rolls",
    category: "Pastries & Desserts",
    description: "Soft, buttery rolls with a warm cinnamon swirl and a delicate glaze.",
    pricePaise: 18000,
    unit: "box of 2",
    image: "https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Fresh golden cinnamon rolls on a bakery tray",
    preparationHours: 4,
    featured: true,
    tags: ["cinnamon", "sweet", "vegetarian"],
  },
  {
    id: "demo-002",
    slug: "fudgy-chocolate-brownies",
    name: "Fudgy Chocolate Brownies",
    category: "Cookies & Brownies",
    description: "Deep cocoa flavor with a tender centre and a delicate crackly top.",
    pricePaise: 24000,
    unit: "box of 4",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Rich chocolate brownies cut into squares",
    preparationHours: 4,
    featured: true,
    tags: ["chocolate", "brownie", "best seller"],
  },
  {
    id: "demo-003",
    slug: "everyday-sourdough-loaf",
    name: "Everyday Sourdough Loaf",
    category: "Breads",
    description: "A rustic crust, an open crumb, and a comforting loaf for the table.",
    pricePaise: 28000,
    unit: "one loaf",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Rustic artisan loaf of bread on a wooden surface",
    preparationHours: 12,
    featured: true,
    tags: ["bread", "sourdough", "artisan"],
  },
  {
    id: "demo-004",
    slug: "berry-celebration-cake",
    name: "Berry Celebration Cake",
    category: "Cakes",
    description: "A celebration-ready cake finished with cream and seasonal berries.",
    pricePaise: 125000,
    unit: "6-inch cake",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Layered celebration cake with decorative frosting",
    preparationHours: 24,
    featured: true,
    tags: ["cake", "celebration", "berries"],
  },
  {
    id: "demo-005",
    slug: "classic-chocolate-chip-cookies",
    name: "Chocolate Chip Cookies",
    category: "Cookies & Brownies",
    description: "Golden edges, soft centres, and generous chocolate chips.",
    pricePaise: 22000,
    unit: "box of 6",
    image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Freshly baked chocolate chip cookies",
    preparationHours: 3,
    tags: ["cookies", "chocolate", "snack"],
  },
  {
    id: "demo-006",
    slug: "butter-croissants",
    name: "Butter Croissants",
    category: "Breads",
    description: "Flaky, golden layers with a delicate buttery finish.",
    pricePaise: 16000,
    unit: "pack of 2",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Golden flaky butter croissants",
    preparationHours: 5,
    tags: ["croissant", "breakfast", "pastry"],
  },
  {
    id: "demo-007",
    slug: "vanilla-cupcakes",
    name: "Vanilla Celebration Cupcakes",
    category: "Cakes",
    description: "Light vanilla cupcakes with a smooth swirl of frosting.",
    pricePaise: 30000,
    unit: "box of 4",
    image: "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Vanilla cupcakes with frosting",
    preparationHours: 6,
    tags: ["cupcakes", "vanilla", "celebration"],
  },
  {
    id: "demo-008",
    slug: "seasonal-fruit-tarts",
    name: "Seasonal Fruit Tarts",
    category: "Pastries & Desserts",
    description: "Crisp pastry shells with a creamy filling and fruit topping.",
    pricePaise: 26000,
    unit: "pack of 2",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1000&q=85",
    imageAlt: "Small fruit tarts with fresh fruit topping",
    preparationHours: 6,
    tags: ["fruit", "tart", "dessert"],
  },
];

export const bakeryCategories: BakeryCategory[] = [
  "Cakes",
  "Breads",
  "Cookies & Brownies",
  "Pastries & Desserts",
];

export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}
