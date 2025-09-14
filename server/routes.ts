import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCategorySchema, insertProductSchema, insertOrderItemSchema } from "@shared/schema";

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

  // Order Items API
  app.get("/api/order-items", async (req, res) => {
    try {
      const orderItems = await storage.getOrderItems();
      
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
      const { quantity } = req.body;
      
      if (!quantity || typeof quantity !== 'number' || quantity < 1) {
        return res.status(400).json({ error: "Invalid quantity" });
      }
      
      const orderItem = await storage.updateOrderItemQuantity(req.params.id, quantity);
      if (!orderItem) {
        return res.status(404).json({ error: "Order item not found" });
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
      const success = await storage.deleteOrderItem(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Order item not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting order item:", error);
      res.status(500).json({ error: "Failed to delete order item" });
    }
  });

  // Send order to kitchen
  app.post("/api/orders/send-to-kitchen", async (req, res) => {
    try {
      const orderItems = await storage.getOrderItems();
      
      if (orderItems.length === 0) {
        return res.status(400).json({ error: "No items in current order" });
      }
      
      // In a real system, this would create an order record and notify kitchen
      console.log("Order sent to kitchen:", orderItems);
      
      // Clear current order items
      await storage.clearAllOrderItems();
      
      res.json({ 
        message: "Order sent to kitchen successfully",
        itemCount: orderItems.length 
      });
    } catch (error) {
      console.error("Error sending order to kitchen:", error);
      res.status(500).json({ error: "Failed to send order to kitchen" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
