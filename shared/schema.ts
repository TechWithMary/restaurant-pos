import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Categories table
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
});

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  categoryId: varchar("category_id").notNull(),
});

// Order items table
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  orderId: varchar("order_id"),
  mesaId: integer("mesa_id").notNull(),
});

// Tables/Mesas table
export const tables = pgTable("tables", {
  id: integer("id").primaryKey(),
  number: integer("number").notNull(),
  capacity: integer("capacity").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("available"),
});

// Create insert schemas
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertTableSchema = createInsertSchema(tables);

// Create types
export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Table = typeof tables.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type InsertTable = z.infer<typeof insertTableSchema>;

// Extended types for the frontend
export type ProductWithDetails = Product & {
  categoryName?: string;
};

export type OrderItemWithProduct = OrderItem & {
  product: Product;
  subtotal: number;
};

// Send to kitchen validation schema
export const sendToKitchenSchema = z.object({
  mesa_id: z.number().int().positive(),
  mesero_id: z.number().int().positive(),
  numberOfPeople: z.number().int().positive().optional(),
});
