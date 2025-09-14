import { 
  type Category, 
  type Product, 
  type OrderItem, 
  type OrderItemWithProduct,
  type InsertCategory,
  type InsertProduct,
  type InsertOrderItem 
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Products
  getProducts(): Promise<Product[]>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  
  // Order Items
  getOrderItems(): Promise<OrderItem[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  updateOrderItemQuantity(id: string, quantity: number): Promise<OrderItem | undefined>;
  deleteOrderItem(id: string): Promise<boolean>;
  clearAllOrderItems(): Promise<void>;
}

export class MemStorage implements IStorage {
  private categories: Map<string, Category> = new Map();
  private products: Map<string, Product> = new Map();
  private orderItems: Map<string, OrderItem> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed categories
    const categoriesData = [
      { id: "1", name: "Platos Principales", icon: "ChefHat" },
      { id: "2", name: "Bebidas", icon: "Coffee" },
      { id: "3", name: "Postres", icon: "Cake" },
    ];

    categoriesData.forEach(cat => this.categories.set(cat.id, cat));

    // Seed products
    const productsData = [
      { id: "1", name: "Solomillo a la Pimienta", description: "Tierno solomillo de ternera con salsa de pimienta verde", price: "28.50", categoryId: "1" },
      { id: "2", name: "Pescado del Día", description: "Pescado fresco a la plancha con verduras de temporada", price: "24.00", categoryId: "1" },
      { id: "3", name: "Paella Valenciana", description: "Paella tradicional con pollo, conejo y judías verdes", price: "32.00", categoryId: "1" },
      { id: "4", name: "Agua Mineral", description: "Agua mineral natural sin gas, botella 500ml", price: "2.50", categoryId: "2" },
      { id: "5", name: "Refresco de Cola", description: "Refresco de cola frío, lata 330ml", price: "3.50", categoryId: "2" },
      { id: "6", name: "Vino Tinto", description: "Vino tinto de la casa, copa 150ml", price: "4.50", categoryId: "2" },
      { id: "7", name: "Flan de la Casa", description: "Flan casero con caramelo líquido y nata montada", price: "6.50", categoryId: "3" },
      { id: "8", name: "Tarta de Queso", description: "Tarta de queso cremosa con mermelada de frutos rojos", price: "7.50", categoryId: "3" },
      { id: "9", name: "Fruta de Temporada", description: "Selección de frutas frescas de temporada", price: "5.50", categoryId: "3" },
    ];

    productsData.forEach(prod => this.products.set(prod.id, prod));
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(product => product.categoryId === categoryId);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const newProduct: Product = { ...product, id };
    this.products.set(id, newProduct);
    return newProduct;
  }

  // Order Items
  async getOrderItems(): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values());
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const id = randomUUID();
    const newOrderItem: OrderItem = { ...orderItem, id };
    this.orderItems.set(id, newOrderItem);
    return newOrderItem;
  }

  async updateOrderItemQuantity(id: string, quantity: number): Promise<OrderItem | undefined> {
    const orderItem = this.orderItems.get(id);
    if (orderItem) {
      orderItem.quantity = quantity;
      this.orderItems.set(id, orderItem);
    }
    return orderItem;
  }

  async deleteOrderItem(id: string): Promise<boolean> {
    return this.orderItems.delete(id);
  }

  async clearAllOrderItems(): Promise<void> {
    this.orderItems.clear();
  }
}

export const storage = new MemStorage();
