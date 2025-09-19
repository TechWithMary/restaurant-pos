import { 
  type Category, 
  type Product, 
  type OrderItem, 
  type OrderItemWithProduct,
  type Table,
  type InsertCategory,
  type InsertProduct,
  type InsertOrderItem,
  type InsertTable
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
  
  // Order Items - Mesa-scoped operations
  getOrderItems(mesaId: number): Promise<OrderItem[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  updateOrderItemQuantity(id: string, quantity: number, mesaId: number): Promise<OrderItem | undefined>;
  deleteOrderItem(id: string, mesaId: number): Promise<boolean>;
  clearOrderItems(mesaId: number): Promise<void>;
  
  // Tables/Mesas
  getTables(): Promise<Table[]>;
  getTable(id: number): Promise<Table | undefined>;
  updateTableStatus(id: number, status: string): Promise<Table | undefined>;
  createTable(table: InsertTable): Promise<Table>;
}

export class MemStorage implements IStorage {
  private categories: Map<string, Category> = new Map();
  private products: Map<string, Product> = new Map();
  private orderItems: Map<string, OrderItem> = new Map();
  private tables: Map<number, Table> = new Map();

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

    // Seed tables/mesas
    const tablesData: Table[] = [
      { id: 1, number: 1, capacity: 4, status: "available" },
      { id: 2, number: 2, capacity: 2, status: "occupied" },
      { id: 3, number: 3, capacity: 6, status: "available" },
      { id: 4, number: 4, capacity: 4, status: "reserved" },
      { id: 5, number: 5, capacity: 2, status: "available" },
      { id: 6, number: 6, capacity: 8, status: "available" },
      { id: 7, number: 7, capacity: 4, status: "occupied" },
      { id: 8, number: 8, capacity: 2, status: "available" },
    ];

    tablesData.forEach(table => this.tables.set(table.id, table));
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

  // Order Items - Mesa-scoped
  async getOrderItems(mesaId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(item => item.mesaId === mesaId);
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const id = randomUUID();
    const newOrderItem: OrderItem = { 
      ...orderItem, 
      id,
      quantity: orderItem.quantity ?? 1,
      orderId: orderItem.orderId ?? null,
      mesaId: orderItem.mesaId
    };
    this.orderItems.set(id, newOrderItem);
    return newOrderItem;
  }

  async updateOrderItemQuantity(id: string, quantity: number, mesaId: number): Promise<OrderItem | undefined> {
    const orderItem = this.orderItems.get(id);
    if (orderItem && orderItem.mesaId === mesaId) {
      orderItem.quantity = quantity;
      this.orderItems.set(id, orderItem);
    }
    return orderItem;
  }

  async deleteOrderItem(id: string, mesaId: number): Promise<boolean> {
    const orderItem = this.orderItems.get(id);
    if (orderItem && orderItem.mesaId === mesaId) {
      return this.orderItems.delete(id);
    }
    return false;
  }

  async clearOrderItems(mesaId: number): Promise<void> {
    const itemsToDelete = Array.from(this.orderItems.entries())
      .filter(([, item]) => item.mesaId === mesaId)
      .map(([id]) => id);
    
    itemsToDelete.forEach(id => this.orderItems.delete(id));
  }

  // Tables/Mesas
  async getTables(): Promise<Table[]> {
    console.log('MemStorage: Getting all tables');
    return Array.from(this.tables.values());
  }

  async getTable(id: number): Promise<Table | undefined> {
    console.log('MemStorage: Getting table with id:', id);
    return this.tables.get(id);
  }

  async updateTableStatus(id: number, status: string): Promise<Table | undefined> {
    console.log(`MemStorage: Updating table ${id} status to:`, status);
    const table = this.tables.get(id);
    if (table) {
      const updatedTable = { ...table, status };
      this.tables.set(id, updatedTable);
      console.log('MemStorage: Table updated successfully:', updatedTable);
      return updatedTable;
    }
    console.log('MemStorage: Table not found for update:', id);
    return undefined;
  }

  async createTable(table: InsertTable): Promise<Table> {
    console.log('MemStorage: Creating new table:', table);
    const newTable: Table = { ...table, status: table.status || "available" };
    this.tables.set(newTable.id, newTable);
    console.log('MemStorage: Table created successfully:', newTable);
    return newTable;
  }
}

import { N8nStorage } from "./n8n-storage";

export const storage = new N8nStorage();
