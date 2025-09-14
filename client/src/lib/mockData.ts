import type { Category, Product } from "@shared/schema";

// Mock categories data in Spanish
export const mockCategories: Category[] = [
  {
    id: "1",
    name: "Platos Principales",
    icon: "ChefHat",
  },
  {
    id: "2",
    name: "Bebidas",
    icon: "Coffee",
  },
  {
    id: "3",
    name: "Postres",
    icon: "Cake",
  },
];

// Mock products data in Spanish
export const mockProducts: Product[] = [
  // Platos Principales
  {
    id: "1",
    name: "Solomillo a la Pimienta",
    description: "Tierno solomillo de ternera con salsa de pimienta verde",
    price: "28.50",
    categoryId: "1",
  },
  {
    id: "2",
    name: "Pescado del Día",
    description: "Pescado fresco a la plancha con verduras de temporada",
    price: "24.00",
    categoryId: "1",
  },
  {
    id: "3",
    name: "Paella Valenciana",
    description: "Paella tradicional con pollo, conejo y judías verdes",
    price: "32.00",
    categoryId: "1",
  },
  // Bebidas
  {
    id: "4",
    name: "Agua Mineral",
    description: "Agua mineral natural sin gas, botella 500ml",
    price: "2.50",
    categoryId: "2",
  },
  {
    id: "5",
    name: "Refresco de Cola",
    description: "Refresco de cola frío, lata 330ml",
    price: "3.50",
    categoryId: "2",
  },
  {
    id: "6",
    name: "Vino Tinto",
    description: "Vino tinto de la casa, copa 150ml",
    price: "4.50",
    categoryId: "2",
  },
  // Postres
  {
    id: "7",
    name: "Flan de la Casa",
    description: "Flan casero con caramelo líquido y nata montada",
    price: "6.50",
    categoryId: "3",
  },
  {
    id: "8",
    name: "Tarta de Queso",
    description: "Tarta de queso cremosa con mermelada de frutos rojos",
    price: "7.50",
    categoryId: "3",
  },
  {
    id: "9",
    name: "Fruta de Temporada",
    description: "Selección de frutas frescas de temporada",
    price: "5.50",
    categoryId: "3",
  },
];

// TODO: Remove mock functionality - replace with real API calls
export const getCategories = (): Promise<Category[]> => {
  return Promise.resolve(mockCategories);
};

export const getProducts = (): Promise<Product[]> => {
  return Promise.resolve(mockProducts);
};

export const getProductsByCategory = (categoryId: string): Promise<Product[]> => {
  return Promise.resolve(mockProducts.filter(product => product.categoryId === categoryId));
};