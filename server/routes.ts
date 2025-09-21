import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertCategorySchema, insertProductSchema, insertOrderItemSchema, insertTableSchema, sendToKitchenSchema, completePaymentColombianSchema } from "@shared/schema";
import { PaymentService, type ColombianPaymentData } from "./payments-service";
import { getN8nClient } from "./n8n-client";
import { randomUUID } from "crypto";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

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
      
      // SERVER-SIDE SAFEGUARD: Check if this is first item for the table
      const existingItems = await storage.getOrderItems(orderItemData.mesaId);
      const isFirstItem = existingItems.length === 0;
      let tableStatusChanged = false;
      
      // If first item, automatically mark table as occupied
      if (isFirstItem) {
        try {
          const table = await storage.getTable(orderItemData.mesaId);
          if (table && table.status === "available") {
            await storage.updateTableStatus(orderItemData.mesaId, "occupied");
            tableStatusChanged = true;
            console.log(`SERVER-SIDE: Table ${orderItemData.mesaId} automatically marked as occupied on first order item`);
          }
        } catch (error) {
          console.error(`Failed to auto-update table ${orderItemData.mesaId} status:`, error);
          // Don't fail the order creation if table status update fails
        }
      }
      
      const orderItem = await storage.createOrderItem(orderItemData);
      
      const orderItemWithProduct = {
        ...orderItem,
        product,
        subtotal: orderItem.quantity * parseFloat(product.price),
        // Include hint for frontend to invalidate tables cache if needed
        tableStatusChanged,
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

      // If successful, update table status to "occupied" but keep order items for billing
      // Note: Order items will be cleared after payment is completed, not after sending to kitchen
      
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

  // In-memory idempotency cache (simple implementation)
  const idempotencyCache = new Map<string, any>();
  const IDEMPOTENCY_TTL = 10 * 60 * 1000; // 10 minutes

  // Colombian Payment Processing - SumaPOS Colombia
  app.post("/api/payments/complete-colombian", async (req, res) => {
    try {
      // Validate request body with Zod schema
      const validatedPayload = completePaymentColombianSchema.parse(req.body);
      const { 
        tableId, 
        paymentMethod, 
        subtotal,
        impoconsumo,
        tip = 0, 
        discount = 0,
        discountType = 'percentage',
        cashReceived,
        datafonoTransactionId,
        datafonoType,
        qrReference
      } = validatedPayload;

      // Generate idempotency key and check cache
      const idempotencyKey = `payment_${tableId}_${paymentMethod}_${Date.now()}_${randomUUID().slice(0, 8)}`;
      const cacheKey = `${tableId}_${paymentMethod}_${JSON.stringify({ tip, discount, cashReceived, datafonoTransactionId, qrReference })}`;
      
      // Check for duplicate request
      const cachedResponse = idempotencyCache.get(cacheKey);
      if (cachedResponse) {
        console.log(`Idempotent request detected for table ${tableId}, returning cached response`);
        return res.json(cachedResponse);
      }

      // Get order items for authoritative calculation
      const orderItems = await storage.getOrderItems(tableId);
      if (orderItems.length === 0) {
        return res.status(400).json({ error: "No order items found for this table" });
      }

      // Calculate authoritative server-side subtotal
      let serverSubtotal = 0;
      const enhancedOrderItems = [];
      for (const item of orderItems) {
        const product = await storage.getProduct(item.productId);
        if (product) {
          const itemSubtotal = item.quantity * parseFloat(product.price);
          serverSubtotal += itemSubtotal;
          enhancedOrderItems.push({
            ...item,
            product,
            subtotal: itemSubtotal
          });
        }
      }

      // Generate temporary employee ID for admin (TODO: Get from auth context in future)
      const tempEmployeeId = randomUUID(); 
      
      // Prepare Colombian payment data for PaymentService validation
      const paymentData: ColombianPaymentData = {
        tableId,
        employeeId: tempEmployeeId,
        paymentMethod: paymentMethod as any,
        subtotal: serverSubtotal,
        tip,
        discount,
        discountType,
        cashReceived,
        datafonoTransactionId,
        datafonoType,
        qrReference
      };

      // Validate and process payment using PaymentService
      let processedPayment;
      try {
        processedPayment = PaymentService.processColombianPayment(paymentData);
      } catch (validationError) {
        console.error('Colombian payment validation failed:', validationError);
        return res.status(400).json({ 
          error: validationError instanceof Error ? validationError.message : "Payment validation failed" 
        });
      }

      const { payment, calculation } = processedPayment;

      // Use the same idempotency key for consistency

      // Trigger Colombian payment workflow via n8n with idempotency (optional)
      const n8nClient = getN8nClient();
      let paymentWorkflowResponse;
      try {
        paymentWorkflowResponse = await n8nClient.processColombianPayment({
          tableId,
          employeeId: tempEmployeeId,
          paymentMethod,
          amount: calculation.finalTotal,
          subtotal: calculation.subtotal,
          impoconsumo: calculation.impoconsumo,
          tip: calculation.tip,
          items: enhancedOrderItems
        });
        
        if (!paymentWorkflowResponse.success) {
          console.warn('N8N payment workflow failed (non-fatal):', paymentWorkflowResponse.error);
          paymentWorkflowResponse = { success: true, executionId: null }; // Continue without n8n
        }
      } catch (n8nError) {
        console.warn('N8N service unavailable, continuing with local payment processing:', n8nError);
        paymentWorkflowResponse = { success: true, executionId: null }; // Continue without n8n
      }

      // Create Payment record (basic implementation)
      const paymentId = paymentWorkflowResponse.executionId || randomUUID();
      const createdPayment = {
        ...payment,
        id: paymentId,
        createdAt: new Date().toISOString()
      };
      
      console.log('Payment record created:', createdPayment);

      // Generate and create Invoice record
      const invoiceNumber = `COL-${Date.now()}-${tableId}`;
      const invoice = PaymentService.generateBasicInvoice(
        createdPayment as any,
        invoiceNumber
      );

      const createdInvoice = {
        ...invoice,
        id: randomUUID(),
        createdAt: new Date().toISOString()
      };
      
      console.log('Invoice record created:', createdInvoice);

      // Trigger DIAN invoice generation workflow (optional)
      try {
        const invoiceWorkflowResponse = await n8nClient.generateDianInvoice({
          paymentId: paymentId,
          invoiceNumber,
          nit: process.env.RESTAURANT_NIT || "900123456-1",
          clientName: "CONSUMIDOR FINAL",
          subtotal: calculation.subtotal,
          impoconsumo: calculation.impoconsumo,
          totalAmount: calculation.finalTotal
        });

        if (!invoiceWorkflowResponse.success) {
          console.warn('DIAN invoice generation failed (non-fatal):', invoiceWorkflowResponse.error);
          // Continue - invoice generation failure doesn't block payment
        }
      } catch (invoiceError) {
        console.warn('DIAN invoice service unavailable (non-fatal):', invoiceError);
        // Continue - invoice generation failure doesn't block payment
      }

      // Trigger analytics calculation workflow (optional)
      try {
        await n8nClient.calculateAnalytics({
          date: new Date().toISOString().split('T')[0],
          restaurantId: process.env.RESTAURANT_ID || 'sumapos-colombia',
          includeEmployeeMetrics: false,
          includePeakHours: false
        });
      } catch (analyticsError) {
        console.warn('Analytics service unavailable (non-fatal):', analyticsError);
        // Continue - analytics failure doesn't block payment
      }

      // Payment completed successfully - clear order items and free table
      await storage.clearOrderItems(tableId);
      await storage.updateTableStatus(tableId, "available");

      // Log successful Colombian payment
      console.log(`Colombian payment completed for table ${tableId}:`, {
        paymentMethod,
        finalTotal: calculation.finalTotal,
        impoconsumo: calculation.impoconsumo,
        change: calculation.change,
        tip: calculation.tip,
        discount: calculation.discount,
        invoiceNumber,
        n8nExecutionId: paymentWorkflowResponse.executionId,
        idempotencyKey,
        timestamp: new Date().toISOString(),
      });

      // Construct final response
      const responseData = {
        success: true,
        message: "¡Pago colombiano completado exitosamente!",
        data: {
          tableId,
          paymentMethod,
          paymentMethodName: PaymentService.getPaymentMethodDescription(paymentMethod as any),
          amount: PaymentService.formatColombianPrice(calculation.finalTotal),
          calculation: {
            subtotal: PaymentService.formatColombianPrice(calculation.subtotal),
            impoconsumo: PaymentService.formatColombianPrice(calculation.impoconsumo),
            tip: PaymentService.formatColombianPrice(calculation.tip),
            discount: PaymentService.formatColombianPrice(calculation.discount),
            finalTotal: PaymentService.formatColombianPrice(calculation.finalTotal),
            change: calculation.change ? PaymentService.formatColombianPrice(calculation.change) : undefined
          },
          invoice: {
            id: createdInvoice.id,
            number: invoiceNumber,
            cufe: createdInvoice.cufe,
            status: invoiceWorkflowResponse.success ? 'generated' : 'pending'
          },
          payment: {
            id: paymentId,
            createdAt: createdPayment.createdAt
          },
          workflows: {
            payment: paymentWorkflowResponse.executionId,
            invoice: invoiceWorkflowResponse.executionId
          },
          idempotencyKey
        }
      };

      // Cache the response with TTL cleanup
      idempotencyCache.set(cacheKey, responseData);
      setTimeout(() => {
        idempotencyCache.delete(cacheKey);
      }, IDEMPOTENCY_TTL);

      res.json(responseData);
    } catch (error) {
      console.error('Error processing Colombian payment:', error);
      res.status(500).json({ 
        error: 'Error interno procesando pago colombiano', 
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create Stripe payment intent
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY);
      const { tableId, tip = 0, discount = 0, discountType = 'percentage' } = req.body;

      if (!tableId || typeof tableId !== 'number') {
        return res.status(400).json({ error: "Valid table ID is required" });
      }

      // Get order items from server-side storage (authoritative)
      const orderItems = await storage.getOrderItems(tableId);
      if (orderItems.length === 0) {
        return res.status(400).json({ error: "No order items found for this table" });
      }

      // Calculate totals on server-side (authoritative)
      let subtotal = 0;
      for (const item of orderItems) {
        const product = await storage.getProduct(item.productId);
        if (product) {
          subtotal += item.quantity * parseFloat(product.price);
        }
      }

      // Apply discount
      const discountAmount = discountType === 'percentage' 
        ? Math.round((subtotal * discount) / 100 * 100) / 100
        : discount;
      const finalSubtotal = Math.max(0, subtotal - discountAmount);
      
      // Calculate Impoconsumo and final total (8% Colombia)
      const tax = Math.round(finalSubtotal * 0.08 * 100) / 100;
      const tipAmount = Math.round(tip * 100) / 100;
      const finalTotal = finalSubtotal + tax + tipAmount;
      
      // Convert to cents for Stripe
      const amountInCents = Math.round(finalTotal * 100);

      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'eur',
        metadata: {
          tableId: tableId.toString(),
          subtotal: subtotal.toString(),
          discount: discountAmount.toString(),
          tax: tax.toString(),
          tip: tipAmount.toString(),
          finalTotal: finalTotal.toString(),
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        calculatedTotals: {
          subtotal,
          discount: discountAmount,
          tax,
          tip: tipAmount,
          total: finalTotal,
        },
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ error: 'Failed to create payment intent' });
    }
  });

  // Complete payment and clear table
  app.post("/api/complete-payment", async (req, res) => {
    try {
      const { 
        tableId, 
        paymentMethod, 
        cashReceived, 
        tip = 0, 
        discount = 0,
        discountType = 'percentage',
        paymentIntentId 
      } = req.body;

      if (!tableId || typeof tableId !== 'number') {
        return res.status(400).json({ error: "Valid table ID is required" });
      }

      if (!paymentMethod || !['cash', 'card'].includes(paymentMethod)) {
        return res.status(400).json({ error: "Valid payment method is required" });
      }

      // Get order items from server-side storage (authoritative)
      const orderItems = await storage.getOrderItems(tableId);
      if (orderItems.length === 0) {
        return res.status(400).json({ error: "No order items found for this table" });
      }

      // Calculate authoritative totals on server-side
      let subtotal = 0;
      for (const item of orderItems) {
        const product = await storage.getProduct(item.productId);
        if (product) {
          subtotal += item.quantity * parseFloat(product.price);
        }
      }

      // Apply discount
      const discountAmount = discountType === 'percentage' 
        ? Math.round((subtotal * discount) / 100 * 100) / 100
        : discount;
      const finalSubtotal = Math.max(0, subtotal - discountAmount);
      
      // Calculate Impoconsumo and final total (8% Colombia)
      const tax = Math.round(finalSubtotal * 0.08 * 100) / 100;
      const tipAmount = Math.round(tip * 100) / 100;
      const finalTotal = finalSubtotal + tax + tipAmount;

      // Validate payment method specific requirements
      if (paymentMethod === 'cash') {
        if (!cashReceived || typeof cashReceived !== 'number' || cashReceived < finalTotal) {
          return res.status(400).json({ 
            error: "Insufficient cash received",
            required: finalTotal,
            received: cashReceived 
          });
        }
      }

      if (paymentMethod === 'card') {
        if (!paymentIntentId) {
          return res.status(400).json({ error: "Payment intent ID is required for card payments" });
        }

        // Verify payment with Stripe
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY);
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          
          if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ error: "Payment not completed in Stripe" });
          }

          const expectedAmountInCents = Math.round(finalTotal * 100);
          if (paymentIntent.amount !== expectedAmountInCents) {
            return res.status(400).json({ 
              error: "Payment amount mismatch",
              expected: expectedAmountInCents,
              received: paymentIntent.amount 
            });
          }

          if (paymentIntent.metadata.tableId !== tableId.toString()) {
            return res.status(400).json({ error: "Payment intent does not match table ID" });
          }
        } catch (stripeError) {
          console.error('Stripe verification error:', stripeError);
          return res.status(400).json({ error: "Failed to verify payment with Stripe" });
        }
      }

      // Payment verified - clear order items and free table
      await storage.clearOrderItems(tableId);
      await storage.updateTableStatus(tableId, "available");

      const change = paymentMethod === 'cash' ? Math.round((cashReceived - finalTotal) * 100) / 100 : 0;

      // Log payment completion
      console.log(`Payment completed for table ${tableId}:`, {
        paymentMethod,
        finalTotal,
        cashReceived,
        change,
        tip: tipAmount,
        discount: discountAmount,
        paymentIntentId,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: "Payment completed successfully",
        tableId,
        paymentMethod,
        amount: finalTotal,
        tip: tipAmount,
        discount: discountAmount,
        change,
      });
    } catch (error) {
      console.error('Error completing payment:', error);
      res.status(500).json({ error: 'Failed to complete payment' });
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
      
      // Transform string values from n8n to numbers for frontend compatibility
      const transformedData = {
        ventas_hoy: parseFloat(responseData.ventas_hoy) || 0,
        personal_activo: parseInt(responseData.personal_activo) || 0,
        mesas_ocupadas: parseInt(responseData.mesas_ocupadas) || 0,
        mesas_totales: parseInt(responseData.mesas_totales) || 0
      };
      
      console.log("Transformed KPIs data (strings to numbers):", transformedData);
      res.json(transformedData);
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

  // Endpoint para obtener pedido existente por mesa desde n8n
  app.get("/api/pedido/mesa/:id", async (req, res) => {
    try {
      const mesaId = req.params.id;
      const n8nBaseUrl = process.env.N8N_ORDER_BASE_URL;
      
      if (!n8nBaseUrl) {
        return res.status(500).json({ error: "N8N order base URL not configured" });
      }

      console.log(`Fetching existing order for mesa ${mesaId} from n8n`);
      
      // Construir URL dinámica para obtener pedido por mesa
      const n8nUrl = `${n8nBaseUrl}/api/pedido/mesa/${mesaId}`;
      
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
        let errorMessage = 'Error al obtener pedido de la mesa';
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
        console.error(`n8n order fetch error for mesa ${mesaId}:`, errorMessage);
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
        return res.status(500).json({ error: 'Invalid response format from n8n' });
      }
      
      console.log(`Order data received from n8n for mesa ${mesaId}:`, responseData);
      res.json(responseData);
    } catch (error) {
      console.error('Error fetching order from n8n:', error);
      
      let errorMessage = 'Error interno del servidor';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Timeout al conectar con el servidor de pedidos. Intenta de nuevo.';
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ 
        error: errorMessage
      });
    }
  });

  // Stripe payment endpoint
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, tableNumber, orderItems } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "eur",
        metadata: {
          tableNumber: tableNumber?.toString() || '',
          orderCount: orderItems?.length?.toString() || '0'
        }
      });
      
      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ 
        error: "Error creating payment intent: " + error.message 
      });
    }
  });

  // Complete payment and clear table
  app.post("/api/complete-payment", async (req, res) => {
    try {
      const { tableId, paymentMethod, paymentIntentId, tip = 0 } = req.body;
      
      if (!tableId) {
        return res.status(400).json({ error: "Table ID is required" });
      }

      // Clear order items for this table
      await storage.clearOrderItems(parseInt(tableId));
      
      // Set table status to available
      await storage.updateTableStatus(parseInt(tableId), "available");
      
      res.json({ 
        success: true, 
        message: "Pago completado y mesa liberada",
        tableId,
        paymentMethod,
        tip
      });
    } catch (error: any) {
      console.error("Error completing payment:", error);
      res.status(500).json({ 
        error: "Error completing payment: " + error.message 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
