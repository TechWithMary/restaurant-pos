import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  categories,
  products, 
  orderItems,
  tables,
  payments,
  invoices,
  employees,
  type Category,
  type Product,
  type OrderItem,
  type Table,
  type Payment,
  type Invoice,
  type Employee,
  type InsertCategory,
  type InsertProduct,
  type InsertOrderItem,
  type InsertTable,
  type InsertPayment,
  type InsertInvoice,
  type InsertEmployee
} from "@shared/schema";
import type { IStorage } from "./storage";
import { N8nStorage } from "./n8n-storage";

export class DatabaseStorage implements IStorage {
  private db;
  private n8nStorage: N8nStorage;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    const sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql);
    this.n8nStorage = new N8nStorage();
    
    console.log("DatabaseStorage: Connected to PostgreSQL for payments and invoices");
  }

  // ========== DELEGATE TO N8N STORAGE FOR MENU DATA ==========
  async getCategories(): Promise<Category[]> {
    return this.n8nStorage.getCategories();
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    return this.n8nStorage.createCategory(category);
  }

  async getProducts(): Promise<Product[]> {
    return this.n8nStorage.getProducts();
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return this.n8nStorage.getProductsByCategory(categoryId);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.n8nStorage.getProduct(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    return this.n8nStorage.createProduct(product);
  }

  async getOrderItems(mesaId: number): Promise<OrderItem[]> {
    return this.n8nStorage.getOrderItems(mesaId);
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    return this.n8nStorage.createOrderItem(orderItem);
  }

  async updateOrderItemQuantity(id: string, quantity: number, mesaId: number): Promise<OrderItem | undefined> {
    return this.n8nStorage.updateOrderItemQuantity(id, quantity, mesaId);
  }

  async deleteOrderItem(id: string, mesaId: number): Promise<boolean> {
    return this.n8nStorage.deleteOrderItem(id, mesaId);
  }

  async clearOrderItems(mesaId: number): Promise<void> {
    return this.n8nStorage.clearOrderItems(mesaId);
  }

  async getTables(): Promise<Table[]> {
    return this.n8nStorage.getTables();
  }

  async getTable(id: number): Promise<Table | undefined> {
    return this.n8nStorage.getTable(id);
  }

  async updateTableStatus(id: number, status: string): Promise<Table | undefined> {
    return this.n8nStorage.updateTableStatus(id, status);
  }

  async createTable(table: InsertTable): Promise<Table> {
    return this.n8nStorage.createTable(table);
  }

  // ========== POSTGRESQL PAYMENTS - FOR CASH REGISTER CLOSING ==========
  async createPayment(payment: InsertPayment): Promise<Payment> {
    console.log("DatabaseStorage: Creating payment in PostgreSQL:", payment);
    
    const result = await this.db.insert(payments).values({
      ...payment,
      status: "completed",
      completedAt: new Date()
    }).returning();
    
    const createdPayment = result[0];
    console.log("DatabaseStorage: Payment created successfully with ID:", createdPayment.id);
    
    return createdPayment;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    console.log("DatabaseStorage: Getting payment by ID:", id);
    
    const result = await this.db.select().from(payments).where(eq(payments.id, id));
    return result[0];
  }

  async getPaymentsByDate(date: string): Promise<Payment[]> {
    console.log("DatabaseStorage: Getting payments for date:", date);
    
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    
    const result = await this.db
      .select()
      .from(payments)
      .where(and(
        gte(payments.createdAt, startOfDay),
        lte(payments.createdAt, endOfDay)
      ))
      .orderBy(payments.createdAt);
    
    console.log(`DatabaseStorage: Found ${result.length} payments for ${date}`);
    return result;
  }

  async getPaymentsByDateRange(startDate: string, endDate: string): Promise<Payment[]> {
    console.log("DatabaseStorage: Getting payments for date range:", startDate, "to", endDate);
    
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);
    
    const result = await this.db
      .select()
      .from(payments)
      .where(and(
        gte(payments.createdAt, start),
        lte(payments.createdAt, end)
      ))
      .orderBy(payments.createdAt);
    
    console.log(`DatabaseStorage: Found ${result.length} payments between ${startDate} and ${endDate}`);
    return result;
  }

  // ========== POSTGRESQL INVOICES - FOR DIAN COMPLIANCE ==========
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    console.log("DatabaseStorage: Creating invoice in PostgreSQL:", invoice);
    
    const result = await this.db.insert(invoices).values(invoice).returning();
    
    const createdInvoice = result[0];
    console.log("DatabaseStorage: Invoice created successfully with ID:", createdInvoice.id);
    
    return createdInvoice;
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    console.log("DatabaseStorage: Getting invoice by ID:", id);
    
    const result = await this.db.select().from(invoices).where(eq(invoices.id, id));
    return result[0];
  }

  async getInvoiceByPaymentId(paymentId: string): Promise<Invoice | undefined> {
    console.log("DatabaseStorage: Getting invoice by payment ID:", paymentId);
    
    const result = await this.db.select().from(invoices).where(eq(invoices.paymentId, paymentId));
    return result[0];
  }

  // ========== POSTGRESQL EMPLOYEES - FOR STAFF MANAGEMENT ==========
  async getAllEmployees(): Promise<Employee[]> {
    console.log("DatabaseStorage: Getting all employees from PostgreSQL");
    
    const result = await this.db.select().from(employees).orderBy(employees.firstName, employees.lastName);
    
    console.log(`DatabaseStorage: Found ${result.length} employees`);
    return result;
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    console.log("DatabaseStorage: Getting employee by ID:", id);
    
    const result = await this.db.select().from(employees).where(eq(employees.id, id));
    return result[0];
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    console.log("DatabaseStorage: Creating employee in PostgreSQL:", employee);
    
    const result = await this.db.insert(employees).values({
      ...employee,
      active: true
    }).returning();
    
    const createdEmployee = result[0];
    console.log("DatabaseStorage: Employee created successfully with ID:", createdEmployee.id);
    
    return createdEmployee;
  }

  async updateEmployee(id: string, updates: Partial<InsertEmployee>): Promise<Employee | undefined> {
    console.log("DatabaseStorage: Updating employee:", id, updates);
    
    const result = await this.db
      .update(employees)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(employees.id, id))
      .returning();
    
    if (result.length === 0) {
      console.log("DatabaseStorage: Employee not found for update:", id);
      return undefined;
    }
    
    const updatedEmployee = result[0];
    console.log("DatabaseStorage: Employee updated successfully:", updatedEmployee.id);
    
    return updatedEmployee;
  }
}