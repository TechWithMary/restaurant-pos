import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
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

// ========== MODELOS COLOMBIANOS - SumaPOS Colombia ==========

// Empleados/Meseros table
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  document: varchar("document", { length: 20 }).notNull().unique(), // Cédula colombiana
  phone: varchar("phone", { length: 15 }),
  email: varchar("email", { length: 100 }),
  role: varchar("role", { length: 20 }).notNull().default("mesero"), // mesero, cajero, chef, admin, gerente
  salary: decimal("salary", { precision: 10, scale: 2 }),
  pin: varchar("pin", { length: 4 }), // PIN de 4 dígitos para autenticación
  isActive: boolean("is_active").notNull().default(true),
  startDate: timestamp("start_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Turnos de trabajo table
export const shifts = pgTable("shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  breakMinutes: integer("break_minutes").default(0),
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Pagos colombianos table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tableId: integer("table_id").notNull(),
  employeeId: varchar("employee_id").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(), // efectivo, datafono_debito, datafono_credito, qr_bancolombia
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  impoconsumo: decimal("impoconsumo", { precision: 10, scale: 2 }).notNull(), // 8% Colombia
  tip: decimal("tip", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  discountType: varchar("discount_type", { length: 10 }).default("percentage"), // percentage, fixed
  // Campos específicos para métodos colombianos
  datafonoTransactionId: varchar("datafono_transaction_id", { length: 50 }), // ID transacción datáfono
  datafonoType: varchar("datafono_type", { length: 10 }), // debito, credito
  qrReference: varchar("qr_reference", { length: 100 }), // Referencia QR Bancolombia
  cashReceived: decimal("cash_received", { precision: 10, scale: 2 }),
  change: decimal("change", { precision: 10, scale: 2 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, completed, failed, refunded
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Facturas DIAN table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: varchar("payment_id").notNull().unique(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(), // Numeración DIAN
  cufe: varchar("cufe", { length: 96 }).notNull().unique(), // Código Único de Facturación Electrónica
  nit: varchar("nit", { length: 20 }).notNull(), // NIT del restaurante
  clientName: varchar("client_name", { length: 100 }).default("CONSUMIDOR FINAL"),
  clientDocument: varchar("client_document", { length: 20 }),
  clientDocumentType: varchar("client_document_type", { length: 5 }).default("CC"), // CC, CE, NIT, etc.
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  impoconsumo: decimal("impoconsumo", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  qrCode: text("qr_code"), // QR DIAN
  xmlSigned: text("xml_signed"), // XML firmado DIAN
  dianStatus: varchar("dian_status", { length: 20 }).default("pending"), // pending, approved, rejected
  dianResponse: text("dian_response"), // Respuesta completa DIAN
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sentToDianAt: timestamp("sent_to_dian_at"),
});

// Proveedores table
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nit: varchar("nit", { length: 20 }).unique(),
  contact: varchar("contact", { length: 100 }),
  phone: varchar("phone", { length: 15 }),
  email: varchar("email", { length: 100 }),
  address: text("address"),
  city: varchar("city", { length: 50 }),
  isActive: boolean("is_active").notNull().default(true),
  paymentTerms: varchar("payment_terms", { length: 50 }), // contado, 30_dias, 60_dias
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Gastos table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplierId: varchar("supplier_id"),
  employeeId: varchar("employee_id").notNull(), // Quien registra el gasto
  category: varchar("category", { length: 50 }).notNull(), // ingredientes, servicios, mantenimiento, marketing, etc.
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  iva: decimal("iva", { precision: 10, scale: 2 }).default("0"), // Algunos gastos tienen IVA
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  receiptNumber: varchar("receipt_number", { length: 50 }),
  paymentMethod: varchar("payment_method", { length: 20 }), // efectivo, transferencia, datafono, etc.
  approvalStatus: varchar("approval_status", { length: 20 }).default("pending"), // pending, approved, rejected
  expenseDate: timestamp("expense_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Cierres diarios table
export const closures = pgTable("closures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull(), // Cajero que hace el cierre
  date: timestamp("date").notNull(), // Fecha del cierre
  // Ingresos
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).notNull(),
  totalImpoconsumo: decimal("total_impoconsumo", { precision: 10, scale: 2 }).notNull(),
  totalTips: decimal("total_tips", { precision: 10, scale: 2 }).default("0"),
  // Métodos de pago
  cashSales: decimal("cash_sales", { precision: 10, scale: 2 }).default("0"),
  datafonoSales: decimal("datafono_sales", { precision: 10, scale: 2 }).default("0"),
  qrSales: decimal("qr_sales", { precision: 10, scale: 2 }).default("0"),
  // Cash management
  expectedCash: decimal("expected_cash", { precision: 10, scale: 2 }).notNull(),
  actualCash: decimal("actual_cash", { precision: 10, scale: 2 }),
  cashDifference: decimal("cash_difference", { precision: 10, scale: 2 }),
  // Estadísticas
  ordersCount: integer("orders_count").default(0),
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }),
  busyHours: text("busy_hours"), // JSON con horas pico
  // Estado
  status: varchar("status", { length: 20 }).default("open"), // open, closed, reviewed
  notes: text("notes"),
  n8nWorkflowStatus: varchar("n8n_workflow_status", { length: 20 }).default("pending"), // pending, completed, failed
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ========== ESQUEMAS ZOD Y TIPOS COLOMBIANOS ==========

// Create insert schemas para modelos colombianos
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, updatedAt: true });
export const insertShiftSchema = createInsertSchema(shifts).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, sentToDianAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export const insertClosureSchema = createInsertSchema(closures).omit({ id: true, createdAt: true, closedAt: true });

// Create select types para modelos colombianos
export type Employee = typeof employees.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Closure = typeof closures.$inferSelect;

// Create insert types para modelos colombianos
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertClosure = z.infer<typeof insertClosureSchema>;

// ========== TIPOS EXTENDIDOS COLOMBIANOS ==========

// Payment con detalles del empleado
export type PaymentWithEmployee = Payment & {
  employee: Employee;
};

// Invoice con detalles del payment
export type InvoiceWithPayment = Invoice & {
  payment: Payment;
};

// Shift con detalles del empleado
export type ShiftWithEmployee = Shift & {
  employee: Employee;
};

// Expense con detalles de supplier y employee
export type ExpenseWithDetails = Expense & {
  supplier?: Supplier;
  employee: Employee;
};

// Closure con estadísticas adicionales
export type ClosureWithStats = Closure & {
  employee: Employee;
  paymentsCount: number;
  topSellingProducts?: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
};

// ========== ESQUEMAS DE VALIDACIÓN ESPECÍFICOS ==========

// Schema para métodos de pago colombianos
export const paymentMethodSchema = z.enum(["efectivo", "datafono_debito", "datafono_credito", "qr_bancolombia"]);

// Schema para roles de empleados colombianos
export const employeeRoleSchema = z.enum(["mesero", "cajero", "chef", "admin", "gerente"]);

// Schema para completar pago con método colombiano
export const completePaymentColombianSchema = z.object({
  tableId: z.number().int().positive(),
  employeeId: z.string().uuid(),
  paymentMethod: paymentMethodSchema,
  subtotal: z.number().min(0),
  impoconsumo: z.number().min(0),
  tip: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  discountType: z.enum(["percentage", "fixed"]).default("percentage"),
  // Campos específicos por método
  cashReceived: z.number().min(0).optional(),
  datafonoTransactionId: z.string().optional(),
  datafonoType: z.enum(["debito", "credito"]).optional(),
  qrReference: z.string().optional(),
});

// Schema para cierre diario
export const closureSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.date(),
  expectedCash: z.number().min(0),
  actualCash: z.number().min(0),
  notes: z.string().optional(),
});
