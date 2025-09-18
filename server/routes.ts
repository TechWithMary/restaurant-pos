import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCategorySchema, insertProductSchema, insertOrderItemSchema, insertTableSchema, sendToKitchenSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Categories API
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  // Products API
  app.get("/api/products", async (req, res) => {
    try {
      const { categoryId } = req.query;
      
      if (categoryId && typeof categoryId === 'string') {
        const products = await storage.getProductsByCategory(categoryId);
        res.json(products);
      } else {
        const products = await storage.getProducts();
        res.json(products);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(400).json({ error: "Invalid product data" });
    }
  });

  // Order Items API - Mesa-scoped
  app.get("/api/order-items", async (req, res) => {
    try {
      const { mesa_id } = req.query;
      
      if (!mesa_id || typeof mesa_id !== 'string') {
        return res.status(400).json({ error: "mesa_id query parameter is required" });
      }
      
      const mesaId = parseInt(mesa_id);
      if (isNaN(mesaId) || mesaId <= 0) {
        return res.status(400).json({ error: "mesa_id must be a positive integer" });
      }
      
      const orderItems = await storage.getOrderItems(mesaId);
      
      // Enhance order items with product details
      const orderItemsWithProducts = await Promise.all(
        orderItems.map(async (item) => {
          const product = await storage.getProduct(item.productId);
          if (!product) {
            throw new Error(`Product not found for order item ${item.id}`);
          }
          return {
            ...item,
            product,
            subtotal: item.quantity * parseFloat(product.price),
          };
        })
      );
      
      res.json(orderItemsWithProducts);
    } catch (error) {
      console.error("Error fetching order items:", error);
      res.status(500).json({ error: "Failed to fetch order items" });
    }
  });

  app.post("/api/order-items", async (req, res) => {
    try {
      const orderItemData = insertOrderItemSchema.parse(req.body);
      
      // Validate product exists before creating order item
      const product = await storage.getProduct(orderItemData.productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      const orderItem = await storage.createOrderItem(orderItemData);
      
      const orderItemWithProduct = {
        ...orderItem,
        product,
        subtotal: orderItem.quantity * parseFloat(product.price),
      };
      
      res.status(201).json(orderItemWithProduct);
    } catch (error) {
      console.error("Error creating order item:", error);
      res.status(400).json({ error: "Invalid order item data" });
    }
  });

  app.put("/api/order-items/:id", async (req, res) => {
    try {
      const { quantity, mesa_id } = req.body;
      
      if (!quantity || typeof quantity !== 'number' || quantity < 1) {
        return res.status(400).json({ error: "Invalid quantity" });
      }
      
      if (!mesa_id || typeof mesa_id !== 'number' || mesa_id <= 0) {
        return res.status(400).json({ error: "mesa_id is required and must be a positive integer" });
      }
      
      const orderItem = await storage.updateOrderItemQuantity(req.params.id, quantity, mesa_id);
      if (!orderItem) {
        return res.status(404).json({ error: "Order item not found or does not belong to this mesa" });
      }
      
      // Return enhanced order item with product details
      const product = await storage.getProduct(orderItem.productId);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      const orderItemWithProduct = {
        ...orderItem,
        product,
        subtotal: orderItem.quantity * parseFloat(product.price),
      };
      
      res.json(orderItemWithProduct);
    } catch (error) {
      console.error("Error updating order item:", error);
      res.status(500).json({ error: "Failed to update order item" });
    }
  });

  app.delete("/api/order-items/:id", async (req, res) => {
    try {
      const { mesa_id } = req.query;
      
      if (!mesa_id || typeof mesa_id !== 'string') {
        return res.status(400).json({ error: "mesa_id query parameter is required" });
      }
      
      const mesaId = parseInt(mesa_id);
      if (isNaN(mesaId) || mesaId <= 0) {
        return res.status(400).json({ error: "mesa_id must be a positive integer" });
      }
      
      const success = await storage.deleteOrderItem(req.params.id, mesaId);
      if (!success) {
        return res.status(404).json({ error: "Order item not found or does not belong to this mesa" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting order item:", error);
      res.status(500).json({ error: "Failed to delete order item" });
    }
  });

  // Send order to kitchen via n8n webhook
  app.post("/api/orders/send-to-kitchen", async (req, res) => {
    try {
      // Validate request body with Zod schema
      const validatedData = sendToKitchenSchema.parse(req.body);
      const { mesa_id, mesero_id, numberOfPeople } = validatedData;
      
      const orderItems = await storage.getOrderItems(mesa_id);
      
      if (orderItems.length === 0) {
        return res.status(400).json({ success: false, error: "No items in current order" });
      }

      // Prepare data in the format expected by n8n
      const orderData = {
        mesa_id: mesa_id, // Already validated as number by Zod
        mesero_id: mesero_id, // Already validated as number by Zod
        numero_personas: numberOfPeople || null, // Optional field
        productos: orderItems.map(item => {
          const producto_id = parseInt(item.productId);
          // Validate that producto_id is a valid number
          if (!Number.isFinite(producto_id)) {
            throw new Error(`Invalid product ID: ${item.productId}`);
          }
          return {
            producto_id,
            cantidad: item.quantity
          };
        })
      };

      // Send to n8n webhook
      const n8nUrl = process.env.N8N_NUEVO_PEDIDO_URL;
      if (!n8nUrl) {
        return res.status(500).json({ success: false, error: "N8N webhook URL not configured" });
      }

      console.log("Sending order to n8n:", orderData);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(n8nUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Error al procesar el pedido';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } else {
            const text = await response.text();
            errorMessage = text || `Error ${response.status}: ${response.statusText}`;
          }
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        console.error("n8n error response:", errorMessage);
        return res.status(response.status).json({ success: false, error: errorMessage });
      }

      // If successful, clear the order and update table status to "occupied"
      await storage.clearOrderItems(mesa_id);
      
      // Actualizar el estado de la mesa a "occupied" después de enviar el pedido
      try {
        const updatedTable = await storage.updateTableStatus(mesa_id, "occupied");
        if (updatedTable) {
          console.log(`Mesa ${mesa_id} status updated to "occupied" after order sent`);
        }
      } catch (error) {
        console.error(`Error updating table ${mesa_id} status:`, error);
        // No fallar el envío del pedido si no se puede actualizar la mesa
      }
      
      let responseData = null;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }
      } catch {
        // If we can't parse the response, that's OK for success case
        responseData = { status: 'sent' };
      }
      
      console.log("Order successfully sent to n8n:", responseData);
      res.json({ 
        success: true, 
        message: '¡Pedido enviado a cocina!',
        data: responseData
      });
    } catch (error) {
      console.error('Error sending order to n8n:', error);
      
      let errorMessage = 'Error interno del servidor';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Timeout al conectar con la cocina. Intenta de nuevo.';
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  // Tables/Mesas API
  app.get("/api/tables", async (req, res) => {
    try {
      const tables = await storage.getTables();
      console.log("Fetching all tables, found:", tables.length);
      res.json(tables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      res.status(500).json({ error: "Failed to fetch tables" });
    }
  });

  app.get("/api/tables/:id", async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      if (isNaN(tableId) || tableId <= 0) {
        return res.status(400).json({ error: "Invalid table ID" });
      }
      
      const table = await storage.getTable(tableId);
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }
      
      console.log(`Fetching table ${tableId}:`, table);
      res.json(table);
    } catch (error) {
      console.error("Error fetching table:", error);
      res.status(500).json({ error: "Failed to fetch table" });
    }
  });

  app.put("/api/tables/:id/status", async (req, res) => {
    try {
      const tableId = parseInt(req.params.id);
      if (isNaN(tableId) || tableId <= 0) {
        return res.status(400).json({ error: "Invalid table ID" });
      }
      
      const { status } = req.body;
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ error: "Status is required and must be a string" });
      }
      
      // Validar que el status sea uno de los valores permitidos
      const validStatuses = ['available', 'occupied', 'reserved'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
      }
      
      const updatedTable = await storage.updateTableStatus(tableId, status);
      if (!updatedTable) {
        return res.status(404).json({ error: "Table not found" });
      }
      
      console.log(`Updated table ${tableId} status to "${status}":`, updatedTable);
      res.json(updatedTable);
    } catch (error) {
      console.error("Error updating table status:", error);
      res.status(500).json({ error: "Failed to update table status" });
    }
  });

  // Admin KPIs endpoint
  app.get("/api/admin/kpis", async (req, res) => {
    try {
      const n8nUrl = process.env.N8N_ADMIN_KPI_URL;
      if (!n8nUrl) {
        return res.status(500).json({ error: "N8N admin KPIs URL not configured" });
      }

      console.log("Fetching admin KPIs from n8n:", n8nUrl);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(n8nUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = 'Error al obtener KPIs administrativos';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } else {
            const text = await response.text();
            errorMessage = text || `Error ${response.status}: ${response.statusText}`;
          }
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        console.error("n8n admin KPIs error response:", errorMessage);
        return res.status(response.status).json({ error: errorMessage });
      }

      let responseData = null;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }
      } catch {
        // If we can't parse the response, return error
        return res.status(500).json({ error: 'Invalid response format from n8n' });
      }
      
      console.log("Admin KPIs received from n8n:", responseData);
      res.json(responseData);
    } catch (error) {
      console.error('Error fetching admin KPIs from n8n:', error);
      
      let errorMessage = 'Error interno del servidor';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Timeout al conectar con el servidor de KPIs. Intenta de nuevo.';
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ 
        error: errorMessage
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
