import {
  type Payment,
  type Invoice,
  type InsertPayment,
  type InsertInvoice,
  paymentMethodSchema
} from "@shared/schema";
import { randomUUID } from "crypto";

// Colombian Payment Methods - SumaPOS Colombia
export type ColombianPaymentMethod = "efectivo" | "datafono_debito" | "datafono_credito" | "qr_bancolombia";

export interface PaymentCalculation {
  subtotal: number;
  impoconsumo: number; // 8% Colombia
  tip: number;
  discount: number;
  finalTotal: number;
  change?: number; // Solo para efectivo
}

export interface ColombianPaymentData {
  tableId: number;
  employeeId: string;
  paymentMethod: ColombianPaymentMethod;
  subtotal: number;
  tip: number;
  discount: number;
  discountType: "percentage" | "fixed";
  // Método específico data
  cashReceived?: number; // Efectivo
  datafonoTransactionId?: string; // Datáfono
  datafonoType?: "debito" | "credito"; // Datáfono
  qrReference?: string; // QR Bancolombia
}

export interface PaymentValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * PaymentService - Servicio colombiano para métodos de pago
 * Maneja: Efectivo, Datáfono (débito/crédito), QR Bancolombia
 * Impoconsumo 8%, validación, cálculos autoritativos
 */
export class PaymentService {
  private static readonly IMPOCONSUMO_RATE = 0.08; // 8% Colombia
  
  /**
   * Calcula totales con Impoconsumo 8% colombiano
   */
  static calculateTotals(
    subtotal: number, 
    tip: number = 0, 
    discount: number = 0, 
    discountType: "percentage" | "fixed" = "percentage"
  ): PaymentCalculation {
    // Validar inputs
    if (subtotal < 0 || tip < 0 || discount < 0) {
      throw new Error("Los montos no pueden ser negativos");
    }

    // Calcular descuento
    const discountAmount = discountType === "percentage" 
      ? Math.round((subtotal * discount) / 100 * 100) / 100
      : Math.round(discount * 100) / 100;

    const finalSubtotal = Math.max(0, subtotal - discountAmount);
    
    // Calcular Impoconsumo 8% sobre subtotal con descuento
    const impoconsumo = Math.round(finalSubtotal * this.IMPOCONSUMO_RATE * 100) / 100;
    const tipAmount = Math.round(tip * 100) / 100;
    const finalTotal = finalSubtotal + impoconsumo + tipAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      impoconsumo,
      tip: tipAmount,
      discount: discountAmount,
      finalTotal: Math.round(finalTotal * 100) / 100
    };
  }

  /**
   * Valida método de pago colombiano específico
   */
  static validateColombianPayment(paymentData: ColombianPaymentData): PaymentValidationResult {
    const errors: string[] = [];
    
    // Validación general
    if (!paymentData.employeeId || paymentData.employeeId.trim() === "") {
      errors.push("ID de empleado es requerido");
    }
    
    if (!paymentData.tableId || paymentData.tableId <= 0) {
      errors.push("ID de mesa válido es requerido");
    }

    if (paymentData.subtotal <= 0) {
      errors.push("Subtotal debe ser mayor que cero");
    }

    // Validación de esquema Zod
    try {
      paymentMethodSchema.parse(paymentData.paymentMethod);
    } catch {
      errors.push("Método de pago inválido para Colombia");
    }

    // Validaciones específicas por método
    switch (paymentData.paymentMethod) {
      case "efectivo":
        if (!paymentData.cashReceived || paymentData.cashReceived <= 0) {
          errors.push("Monto recibido en efectivo es requerido");
        } else {
          const totals = this.calculateTotals(
            paymentData.subtotal, 
            paymentData.tip, 
            paymentData.discount, 
            paymentData.discountType
          );
          if (paymentData.cashReceived < totals.finalTotal) {
            errors.push(`Efectivo insuficiente. Se requieren $${totals.finalTotal.toFixed(2)}`);
          }
        }
        break;

      case "datafono_debito":
      case "datafono_credito":
        if (!paymentData.datafonoTransactionId || paymentData.datafonoTransactionId.trim() === "") {
          errors.push("ID de transacción de datáfono es requerido");
        }
        if (!paymentData.datafonoType) {
          errors.push("Tipo de datáfono (débito/crédito) es requerido");
        }
        // IMPORTANTE: NO validamos números de tarjeta por seguridad
        break;

      case "qr_bancolombia":
        if (!paymentData.qrReference || paymentData.qrReference.trim() === "") {
          errors.push("Referencia de QR Bancolombia es requerida");
        }
        break;

      default:
        errors.push("Método de pago no reconocido");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Procesa pago con método colombiano - SOLO cálculos y validación
   * La persistencia se hace en el endpoint
   */
  static processColombianPayment(paymentData: ColombianPaymentData): {
    payment: InsertPayment;
    calculation: PaymentCalculation;
    change?: number;
  } {
    // Validar datos
    const validation = this.validateColombianPayment(paymentData);
    if (!validation.isValid) {
      throw new Error(`Errores de validación: ${validation.errors.join(", ")}`);
    }

    // Calcular totales
    const calculation = this.calculateTotals(
      paymentData.subtotal,
      paymentData.tip,
      paymentData.discount,
      paymentData.discountType
    );

    // Calcular cambio para efectivo
    let change: number | undefined;
    if (paymentData.paymentMethod === "efectivo" && paymentData.cashReceived) {
      change = Math.round((paymentData.cashReceived - calculation.finalTotal) * 100) / 100;
    }

    // Crear objeto Payment colombiano (convertir números a strings para Drizzle)
    const payment: InsertPayment = {
      tableId: paymentData.tableId,
      employeeId: paymentData.employeeId,
      paymentMethod: paymentData.paymentMethod,
      amount: calculation.finalTotal.toString(),
      subtotal: calculation.subtotal.toString(),
      impoconsumo: calculation.impoconsumo.toString(),
      tip: calculation.tip.toString(),
      discount: calculation.discount.toString(),
      discountType: paymentData.discountType,
      // Campos específicos por método
      datafonoTransactionId: paymentData.datafonoTransactionId,
      datafonoType: paymentData.datafonoType,
      qrReference: paymentData.qrReference,
      cashReceived: paymentData.cashReceived?.toString(),
      change: change?.toString(),
      status: "pending" // Se cambiará a "completed" cuando se confirme
    };

    return {
      payment,
      calculation,
      change
    };
  }

  /**
   * Genera factura DIAN básica (datos mínimos)
   * La integración completa con n8n será en Fase 2
   */
  static generateBasicInvoice(payment: Payment, invoiceNumber: string): InsertInvoice {
    // Generar CUFE temporal (en Fase 2 será generado por DIAN)
    const cufe = `TEMP-${randomUUID()}`;
    
    const invoice: InsertInvoice = {
      paymentId: payment.id!,
      invoiceNumber,
      cufe,
      nit: "900123456-1", // NIT del restaurante - configurar en env
      clientName: "CONSUMIDOR FINAL",
      clientDocument: "",
      clientDocumentType: "CC",
      subtotal: payment.subtotal,
      impoconsumo: payment.impoconsumo,
      totalAmount: payment.amount,
      qrCode: "", // Se generará en Fase 2
      xmlSigned: "", // Se generará en Fase 2
      dianStatus: "pending"
    };

    return invoice;
  }

  /**
   * Formatea precio colombiano (COP)
   */
  static formatColombianPrice(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(amount);
  }

  /**
   * Obtiene descripción de método de pago en español
   */
  static getPaymentMethodDescription(method: ColombianPaymentMethod): string {
    const descriptions = {
      "efectivo": "Efectivo",
      "datafono_debito": "Tarjeta Débito",
      "datafono_credito": "Tarjeta Crédito", 
      "qr_bancolombia": "QR Bancolombia"
    };
    return descriptions[method] || method;
  }
}