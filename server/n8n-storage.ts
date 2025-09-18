import { 
  type Category, 
  type Product, 
  type OrderItem, 
  type Table,
  type InsertCategory,
  type InsertProduct,
  type InsertOrderItem,
  type InsertTable
} from "@shared/schema";
import type { IStorage } from "./storage";

export class N8nStorage implements IStorage {
  private orderItems: Map<string, OrderItem> = new Map();
  private cachedCategories: Category[] = [];
  private cachedProducts: Product[] = [];
  private tables: Map<number, Table> = new Map();
  private lastFetch = 0;
  private cacheTimeout = 60000; // 1 minute cache

  constructor() {
    this.seedTables();
  }

  private seedTables() {
    // Seed tables/mesas con datos de prueba - todas disponibles hasta que n8n funcione
    const tablesData: Table[] = [
      { id: 1, number: 1, capacity: 4, status: "available" },
      { id: 2, number: 2, capacity: 2, status: "available" },
      { id: 3, number: 3, capacity: 6, status: "available" },
      { id: 4, number: 4, capacity: 4, status: "available" },
      { id: 5, number: 5, capacity: 2, status: "available" },
      { id: 6, number: 6, capacity: 8, status: "available" },
      { id: 7, number: 7, capacity: 4, status: "available" },
      { id: 8, number: 8, capacity: 2, status: "available" },
    ];

    tablesData.forEach(table => this.tables.set(table.id, table));
    console.log("N8nStorage: Seeded", tablesData.length, "tables");
  }

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
        // Check if items have Spanish format (nombre, precio, categoria)
        if (data.length > 0 && data[0].nombre && data[0].precio && data[0].categoria) {
          // Get unique categories from the data
          const uniqueCategories = new Set<string>();
          data.forEach((item: any) => {
            if (item.categoria) uniqueCategories.add(item.categoria);
          });
          
          // Create categories array
          categories = Array.from(uniqueCategories).map((categoryName, index) => ({
            id: categoryName.toLowerCase().replace(/\s+/g, '-'),
            name: categoryName,
            icon: this.getCategoryIcon(categoryName)
          }));
          
          // Transform products
          products = data.map((item: any) => ({
            id: item.id.toString(),
            name: item.nombre,
            description: item.descripcion || '',
            price: item.precio,
            categoryId: item.categoria.toLowerCase().replace(/\s+/g, '-')
          }));
        } else {
          // Original logic for arrays with type property
          categories = data.filter(item => item.type === 'category');
          products = data.filter(item => item.type === 'product');
        }
      }
      // If your n8n returns a single product object in Spanish format
      else if (data.nombre && data.precio && data.categoria) {
        // Create category from the categoria field
        const categoryName = data.categoria;
        const categoryId = categoryName.toLowerCase().replace(/\s+/g, '-');
        
        categories = [{
          id: categoryId,
          name: categoryName,
          icon: this.getCategoryIcon(categoryName)
        }];
        
        // Transform Spanish product to English format
        products = [{
          id: data.id.toString(),
          name: data.nombre,
          description: data.descripcion || '',
          price: data.precio,
          categoryId: categoryId
        }];
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

  private getCategoryIcon(categoryName: string): string {
    const categoryMap: Record<string, string> = {
      'ensaladas': 'Salad',
      'platos principales': 'ChefHat',
      'principales': 'ChefHat',
      'bebidas': 'Coffee',
      'postres': 'Cake',
      'aperitivos': 'Utensils',
      'sopas': 'Bowl',
      'carnes': 'Beef',
      'pescados': 'Fish',
      'vegetarianos': 'Leaf',
      'mariscos': 'Fish'
    };
    
    const key = categoryName.toLowerCase();
    return categoryMap[key] || 'Utensils';
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

  // Extract n8n base URL from the configured endpoint
  private getN8nBaseUrl(): string | null {
    const n8nUrl = process.env.N8N_ORDER_BASE_URL;
    if (!n8nUrl) return null;
    
    // Extract base URL from: https://domain/webhook/id/api/pedido/mesa/:mesaId
    const match = n8nUrl.match(/(https:\/\/[^\/]+\/webhook\/[^\/]+)/);
    return match ? match[1] : null;
  }

  // Normalize table status from Spanish to English
  private normalizeTableStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'disponible': 'available',
      'ocupada': 'occupied', 
      'reservada': 'reserved',
      'available': 'available',
      'occupied': 'occupied',
      'reserved': 'reserved'
    };
    
    const normalized = statusMap[status.toLowerCase()] || 'available';
    console.log(`Normalizing status: "${status}" -> "${normalized}"`);
    return normalized;
  }

  // Tables/Mesas (fetch from n8n with local cache)
  async getTables(): Promise<Table[]> {
    console.log('N8nStorage: Getting all tables from n8n');
    
    try {
      const n8nBaseUrl = this.getN8nBaseUrl();
      if (!n8nBaseUrl) {
        console.log('N8N_ORDER_BASE_URL not configured properly, using cached tables');
        return Array.from(this.tables.values());
      }

      // Try different possible endpoints for table status
      const possibleEndpoints = [
        `${n8nBaseUrl}/api/mesas/estado`,
        `${n8nBaseUrl}/api/mesas`, 
        `${n8nBaseUrl}/mesas`,
        `${n8nBaseUrl}/tables`
      ];

      for (const tablesStatusUrl of possibleEndpoints) {
        console.log('Trying n8n endpoint:', tablesStatusUrl);
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
          
          const response = await fetch(tablesStatusUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (response.ok) {
            const n8nTablesData = await response.json();
            console.log('Table statuses received from n8n:', n8nTablesData);
            
            // Update local cache with n8n data
            if (Array.isArray(n8nTablesData)) {
              n8nTablesData.forEach((n8nTable: any) => {
                const tableId = n8nTable.id || n8nTable.mesa_id || n8nTable.number;
                const existingTable = this.tables.get(tableId);
                
                if (existingTable) {
                  // Update status from n8n and normalize Spanish→English
                  const rawStatus = n8nTable.status || n8nTable.estado || existingTable.status;
                  const normalizedStatus = this.normalizeTableStatus(rawStatus);
                  const updatedTable = {
                    ...existingTable,
                    status: normalizedStatus
                  };
                  this.tables.set(tableId, updatedTable);
                  console.log(`Updated table ${tableId} status from "${rawStatus}" to:`, updatedTable.status);
                }
              });
            }
            
            // Successfully got data from this endpoint, break out of the loop
            break;
          } else {
            console.warn(`Endpoint ${tablesStatusUrl} failed with status ${response.status}`);
          }
        } catch (endpointError) {
          console.warn(`Failed to fetch from ${tablesStatusUrl}:`, endpointError);
          // Continue to next endpoint
        }
      }
      
      return Array.from(this.tables.values());
    } catch (error) {
      console.warn('Error fetching tables from n8n, using cached data:', error);
      return Array.from(this.tables.values());
    }
  }

  async getTable(id: number): Promise<Table | undefined> {
    console.log('N8nStorage: Getting table with id:', id);
    return this.tables.get(id);
  }

  async updateTableStatus(id: number, status: string): Promise<Table | undefined> {
    console.log(`N8nStorage: Updating table ${id} status to:`, status);
    const table = this.tables.get(id);
    if (table) {
      const updatedTable = { ...table, status };
      this.tables.set(id, updatedTable);
      console.log('N8nStorage: Table updated successfully:', updatedTable);
      // TODO: En el futuro, podríamos sincronizar este cambio con n8n
      return updatedTable;
    }
    console.log('N8nStorage: Table not found for update:', id);
    return undefined;
  }

  async createTable(table: InsertTable): Promise<Table> {
    console.log('N8nStorage: Creating new table:', table);
    const newTable: Table = { 
      ...table,
      status: table.status || "available" // Ensure status is always defined
    };
    this.tables.set(newTable.id, newTable);
    console.log('N8nStorage: Table created successfully:', newTable);
    // TODO: En el futuro, podríamos sincronizar este cambio con n8n
    return newTable;
  }
}