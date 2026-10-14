/** Plain serializable shapes passed from server components to client UI. */
export type CatalogProduct = {
  id: string;
  variantId: string;
  stockQuantity: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  pricePaise: number;
  unit: string;
  image: string;
  imageAlt: string;
  preparationHours: number;
  featured: boolean;
  tags: string[];
};

export type CatalogCategory = {
  name: string;
  slug: string;
  count: number;
};
