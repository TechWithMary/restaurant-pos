import { 
  type Category, 
  type Product, 
  type OrderItem, 
  type InsertCategory,
  type InsertProduct,
  type InsertOrderItem
} from "@shared/schema";
import type { IStorage } from "./storage";

export class N8nStorage implements IStorage {
  private orderItems: Map<string, OrderItem> = new Map();
  private cachedCategories: Category[] = [];
  private cachedProducts: Product[] = [];
  private lastFetch = 0;
  private cacheTimeout = 60000; // 1 minute cache

  private async fetchMenuFromN8n(): Promise<{ categories: Category[], products: Product[] }> {
    const now = Date.now();
    
    // Return cached data if still fresh
    if (now - this.lastFetch < this.cacheTimeout && this.cachedCategories.length > 0) {
      return { categories: this.cachedCategories, products: this.cachedProducts };
    }

    const n8nMenuUrl = process.env.N8N_MENU_URL;
    if (!n8nMenuUrl) {
      console.log("N8N_MENU_URL not configured, using fallback menu data");
      return this.getFallbackMenuData();
    }

    try {
      console.log("Fetching menu from n8n:", n8nMenuUrl);
      
      const response = await fetch(n8nMenuUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // 10 second timeout
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        // Try to get error details from response body
        let errorDetails = `${response.status} ${response.statusText}`;
        try {
          const errorText = await response.text();
          if (errorText) {
            errorDetails += ` - ${errorText}`;
          }
        } catch {
          // Ignore if can't read error body
        }
        console.error(`n8n API error: ${errorDetails}`);
        throw new Error(`n8n API error: ${errorDetails}`);
      }

      const data = await response.json();
      console.log("Received menu data from n8n:", data);

      // Parse the data - adapt this based on your n8n API format
      let categories: Category[] = [];
      let products: Product[] = [];

      // If your n8n returns { categories: [...], products: [...] }
      if (data.categories && data.products) {
        categories = data.categories;
        products = data.products;
      }
      // If your n8n returns just an array of items with categories mixed in
      else if (Array.isArray(data)) {
        // Separate categories and products from the array
        categories = data.filter(item => item.type === 'category');
        products = data.filter(item => item.type === 'product');
      }
      // If your n8n returns a different format, adapt accordingly
      else {
        console.warn("Unexpected n8n data format:", data);
        // Try to extract categories and products from whatever format received
        categories = data.categories || [];
        products = data.products || data.items || [];
      }

      // If we didn't get valid data from n8n, use fallback
      if (categories.length === 0 || products.length === 0) {
        console.log("n8n returned empty or invalid data, using fallback menu data");
        return this.getFallbackMenuData();
      }

      // Cache the data
      this.cachedCategories = categories;
      this.cachedProducts = products;
      this.lastFetch = now;

      console.log(`Cached ${categories.length} categories and ${products.length} products from n8n`);
      
      return { categories, products };
      
    } catch (error) {
      console.error('Error fetching menu from n8n:', error);
      
      // Return cached data if available, even if stale
      if (this.cachedCategories.length > 0) {
        console.log("Using stale cached data due to n8n error");
        return { categories: this.cachedCategories, products: this.cachedProducts };
      }
      
      // If no cached data and n8n fails, use fallback data
      console.log("n8n unavailable, using fallback menu data");
      return this.getFallbackMenuData();
    }
  }

  private getFallbackMenuData(): { categories: Category[], products: Product[] } {
    const categories: Category[] = [
      { id: "1", name: "Platos Principales", icon: "ChefHat" },
      { id: "2", name: "Bebidas", icon: "Coffee" },
      { id: "3", name: "Postres", icon: "Cake" },
    ];

    const products: Product[] = [
      { id: "1", name: "Paella Valenciana", description: "Arroz bomba tradicional con pollo y verduras", price: "24.50", categoryId: "1" },
      { id: "2", name: "Solomillo de Ternera", description: "Solomillo a la plancha con salsa de pimienta", price: "28.90", categoryId: "1" },
      { id: "3", name: "Lubina a la Sal", description: "Pescado fresco del Mediterráneo", price: "26.80", categoryId: "1" },
      { id: "4", name: "Cerveza Estrella Galicia", description: "Cerveza rubia, botella 330ml", price: "3.50", categoryId: "2" },
      { id: "5", name: "Vino Tinto Crianza", description: "D.O. Rioja, copa 150ml", price: "5.80", categoryId: "2" },
      { id: "6", name: "Agua Mineral", description: "Agua con gas, botella 500ml", price: "2.50", categoryId: "2" },
      { id: "7", name: "Tiramisú Casero", description: "Postre italiano tradicional", price: "6.50", categoryId: "3" },
      { id: "8", name: "Crema Catalana", description: "Postre tradicional catalán", price: "5.80", categoryId: "3" },
    ];

    return { categories, products };
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const { categories } = await this.fetchMenuFromN8n();
    return categories;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    throw new Error("Creating categories via n8n not implemented");
  }

  // Products
  async getProducts(): Promise<Product[]> {
    const { products } = await this.fetchMenuFromN8n();
    return products;
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    const { products } = await this.fetchMenuFromN8n();
    return products.filter(product => product.categoryId === categoryId);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const { products } = await this.fetchMenuFromN8n();
    return products.find(product => product.id === id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    throw new Error("Creating products via n8n not implemented");
  }

  // Order Items (local storage only) - Mesa-scoped
  async getOrderItems(mesaId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(item => item.mesaId === mesaId);
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const id = Date.now().toString() + Math.random().toString(36);
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
}