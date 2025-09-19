import crypto from "crypto";

// N8N Workflow Types - SumaPOS Colombia
export interface N8nWorkflowTrigger {
  workflowId: string;
  data: Record<string, any>;
  endpoint?: string; // For specific workflow endpoints
}

export interface N8nWorkflowResponse {
  success: boolean;
  executionId?: string;
  data?: any;
  error?: string;
}

export interface N8nConfig {
  baseUrl: string;
  apiKey?: string;
  hmacSecret?: string;
  timeout: number;
  mode?: 'production' | 'test'; // For webhook path selection
}

/**
 * N8nClient - Cliente para workflows inteligentes SumaPOS Colombia
 * 
 * WORKFLOWS PRINCIPALES:
 * 1. Payment Processing (Impoconsumo 8%)
 * 2. DIAN Invoice Generation (CUFE, XML firmado)
 * 3. Analytics & KPI Calculation
 * 4. Automated Daily Closure
 * 5. Inventory Intelligence (30min)
 * 6. Employee Shift Management
 * 7. Expense Tracking & Approval
 * 8. Supplier Integration
 * 9. Real-time Dashboard Updates
 * 10. ChefBot IA Integration
 * 11. Peak Hours Analysis
 * 12. Performance Monitoring
 */
export class N8nClient {
  private config: N8nConfig;
  private baseHeaders: Record<string, string>;

  constructor(config: N8nConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || 30000, // 30 seconds default
      mode: config.mode || 'production'
    };

    // Normalize baseUrl - remove trailing slash
    this.config.baseUrl = this.config.baseUrl.replace(/\/$/, '');

    this.baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'SumaPOS-Colombia/1.0'
    };

    // API Key authentication (if provided)
    if (config.apiKey) {
      this.baseHeaders['X-N8N-API-KEY'] = config.apiKey;
    }
  }

  /**
   * Genera signature HMAC-SHA256 para seguridad
   */
  private generateHmacSignature(data: string, timestamp: string): string {
    if (!this.config.hmacSecret) {
      throw new Error("HMAC secret no configurado");
    }

    const payload = `${timestamp}.${data}`;
    return crypto
      .createHmac('sha256', this.config.hmacSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Crea AbortSignal con timeout (compatible Node 16+)
   */
  private createTimeoutSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // Clean up timeout if request completes normally
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    }, { once: true });
    
    return controller.signal;
  }

  /**
   * Trigger workflow n8n con autenticación HMAC
   */
  async triggerWorkflow(trigger: N8nWorkflowTrigger): Promise<N8nWorkflowResponse> {
    const timestamp = Date.now().toString();
    const data = JSON.stringify(trigger.data);

    try {
      // Headers con autenticación HMAC
      const headers = { ...this.baseHeaders };
      if (this.config.hmacSecret) {
        const signature = this.generateHmacSignature(data, timestamp);
        headers['X-N8N-Signature'] = `t=${timestamp},v1=${signature}`;
      }

      // Construir URL del workflow con modo correcto
      const endpoint = trigger.endpoint || this.buildWebhookEndpoint(trigger.workflowId);
      const url = `${this.config.baseUrl}/${endpoint}`;

      console.log(`🤖 N8N: Triggering workflow ${trigger.workflowId}...`);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: data,
        signal: this.createTimeoutSignal(this.config.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`N8N API error ${response.status}: ${errorText}`);
      }

      const result = await response.json().catch(() => ({}));

      console.log(`✅ N8N: Workflow ${trigger.workflowId} executed successfully`);

      return {
        success: true,
        executionId: result.executionId || result.id || 'unknown',
        data: result
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ N8N: Error triggering workflow ${trigger.workflowId}:`, errorMsg);

      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Construye endpoint de webhook según el modo
   */
  private buildWebhookEndpoint(workflowId: string): string {
    const webhookPrefix = this.config.mode === 'test' ? 'webhook-test' : 'webhook';
    return `${webhookPrefix}/${workflowId}`;
  }

  /**
   * Workflow 1: Procesar pago colombiano con Impoconsumo 8%
   */
  async processColombianPayment(paymentData: {
    tableId: number;
    employeeId: string;
    paymentMethod: string;
    amount: number;
    subtotal: number;
    impoconsumo: number;
    tip: number;
    items: any[];
  }): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({
      workflowId: 'payment-processing-colombia',
      data: {
        ...paymentData,
        country: 'CO',
        taxRate: 0.08, // Impoconsumo 8%
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Workflow 2: Generar factura DIAN electrónica
   */
  async generateDianInvoice(invoiceData: {
    paymentId: string;
    invoiceNumber: string;
    nit: string;
    clientName: string;
    subtotal: number;
    impoconsumo: number;
    totalAmount: number;
  }): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({
      workflowId: 'dian-invoice-generation',
      data: {
        ...invoiceData,
        country: 'CO',
        taxType: 'impoconsumo',
        dianEnvironment: process.env.NODE_ENV === 'production' ? 'production' : 'test'
      }
    });
  }

  /**
   * Workflow 3: Calcular analytics y KPIs
   */
  async calculateAnalytics(analyticsData: {
    date: string;
    restaurantId?: string;
    includeEmployeeMetrics?: boolean;
    includePeakHours?: boolean;
  }): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({
      workflowId: 'analytics-calculation',
      data: {
        ...analyticsData,
        timezone: 'America/Bogota'
      }
    });
  }

  /**
   * Workflow 4: Cierre automático diario
   */
  async triggerDailyClosure(closureData: {
    date: string;
    expectedCash: number;
    actualCash?: number;
    employeeId: string;
  }): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({
      workflowId: 'daily-closure-automation',
      data: {
        ...closureData,
        timezone: 'America/Bogota',
        currency: 'COP'
      }
    });
  }

  /**
   * Workflow 5: Control de inventario inteligente (cada 30min)
   */
  async checkInventoryLevels(inventoryData: {
    restaurantId?: string;
    lowStockThreshold?: number;
    criticalStockThreshold?: number;
  }): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({
      workflowId: 'inventory-intelligence',
      data: {
        ...inventoryData,
        checkInterval: '30min',
        autoReorder: true
      }
    });
  }

  /**
   * Workflow 6: Gestión de turnos empleados
   */
  async manageEmployeeShift(shiftData: {
    employeeId: string;
    action: 'start' | 'end' | 'break' | 'status';
    shiftId?: string;
    hoursWorked?: number;
  }): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({
      workflowId: 'employee-shift-management',
      data: {
        ...shiftData,
        timestamp: new Date().toISOString(),
        timezone: 'America/Bogota'
      }
    });
  }

  /**
   * Workflow 7: Tracking de gastos y aprobación
   */
  async trackExpense(expenseData: {
    amount: number;
    category: string;
    supplierId?: string;
    description: string;
    employeeId: string;
    requiresApproval?: boolean;
  }): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({
      workflowId: 'expense-tracking',
      data: {
        ...expenseData,
        currency: 'COP',
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Workflow 8: Integración con proveedores
   */
  async integrateSupplier(supplierData: {
    supplierId: string;
    action: 'sync_catalog' | 'place_order' | 'check_prices' | 'update_contact';
    orderData?: any;
  }): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({
      workflowId: 'supplier-integration',
      data: {
        ...supplierData,
        country: 'CO'
      }
    });
  }

  /**
   * Workflow 9: Actualización dashboard en tiempo real
   */
  async updateDashboard(dashboardData: {
    type: 'sales' | 'inventory' | 'employees' | 'analytics';
    data: any;
    broadcastToClients?: boolean;
  }): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({
      workflowId: 'realtime-dashboard-update',
      data: {
        ...dashboardData,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Workflow 10: ChefBot IA Integration
   */
  async triggerChefBot(chefBotData: {
    action: 'menu_suggestion' | 'inventory_optimization' | 'cost_analysis' | 'demand_forecast';
    context: any;
    aiModel?: 'gpt-4' | 'claude' | 'local';
  }): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({
      workflowId: 'chefbot-ai-integration',
      data: {
        ...chefBotData,
        restaurant_type: 'colombian',
        language: 'es'
      }
    });
  }

  /**
   * Workflow 11: Análisis de horas pico
   */
  async analyzePeakHours(analysisData: {
    dateRange: { start: string; end: string };
    includeWeatherData?: boolean;
    includeEventsData?: boolean;
  }): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({
      workflowId: 'peak-hours-analysis',
      data: {
        ...analysisData,
        timezone: 'America/Bogota',
        country: 'CO'
      }
    });
  }

  /**
   * Workflow 12: Monitoreo de rendimiento
   */
  async monitorPerformance(performanceData: {
    employeeId?: string;
    departmentId?: string;
    metrics: string[];
    period: 'daily' | 'weekly' | 'monthly';
  }): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({
      workflowId: 'performance-monitoring',
      data: {
        ...performanceData,
        country: 'CO',
        currency: 'COP'
      }
    });
  }

  /**
   * Test de conectividad con n8n
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.triggerWorkflow({
        workflowId: 'health-check',
        data: { test: true, timestamp: new Date().toISOString() }
      });
      return response.success;
    } catch (error) {
      console.error('❌ N8N: Connection test failed:', error);
      return false;
    }
  }
}

/**
 * Cliente No-Op para cuando n8n no está disponible
 */
class NoOpN8nClient {
  async triggerWorkflow(trigger: N8nWorkflowTrigger): Promise<N8nWorkflowResponse> {
    console.warn(`⚠️ N8N: Client not configured, skipping workflow ${trigger.workflowId}`);
    return { success: false, error: 'N8N client not configured' };
  }
  
  async testConnection(): Promise<boolean> {
    return false;
  }
  
  // Stub methods for all workflow functions
  async processColombianPayment(): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({ workflowId: 'payment-processing-colombia', data: {} });
  }
  async generateDianInvoice(): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({ workflowId: 'dian-invoice-generation', data: {} });
  }
  async calculateAnalytics(): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({ workflowId: 'analytics-calculation', data: {} });
  }
  async triggerDailyClosure(): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({ workflowId: 'daily-closure-automation', data: {} });
  }
  async checkInventoryLevels(): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({ workflowId: 'inventory-intelligence', data: {} });
  }
  async manageEmployeeShift(): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({ workflowId: 'employee-shift-management', data: {} });
  }
  async trackExpense(): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({ workflowId: 'expense-tracking', data: {} });
  }
  async integrateSupplier(): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({ workflowId: 'supplier-integration', data: {} });
  }
  async updateDashboard(): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({ workflowId: 'realtime-dashboard-update', data: {} });
  }
  async triggerChefBot(): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({ workflowId: 'chefbot-ai-integration', data: {} });
  }
  async analyzePeakHours(): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({ workflowId: 'peak-hours-analysis', data: {} });
  }
  async monitorPerformance(): Promise<N8nWorkflowResponse> {
    return this.triggerWorkflow({ workflowId: 'performance-monitoring', data: {} });
  }
}

// Lazy singleton instance
let n8nClientInstance: N8nClient | NoOpN8nClient | null = null;

/**
 * Obtener cliente n8n (lazy initialization)
 */
export function getN8nClient(): N8nClient | NoOpN8nClient {
  if (n8nClientInstance) {
    return n8nClientInstance;
  }

  const baseUrl = process.env.N8N_ORDER_BASE_URL;
  
  if (!baseUrl) {
    console.warn('⚠️ N8N: N8N_ORDER_BASE_URL not configured, using No-Op client');
    n8nClientInstance = new NoOpN8nClient();
    return n8nClientInstance;
  }

  try {
    n8nClientInstance = new N8nClient({
      baseUrl,
      apiKey: process.env.N8N_API_KEY,
      hmacSecret: process.env.N8N_HMAC_SECRET,
      timeout: 45000, // 45 seconds for complex workflows
      mode: process.env.NODE_ENV === 'production' ? 'production' : 'test'
    });
    
    console.log('✅ N8N: Client initialized successfully');
    return n8nClientInstance;
  } catch (error) {
    console.error('❌ N8N: Failed to initialize client:', error);
    n8nClientInstance = new NoOpN8nClient();
    return n8nClientInstance;
  }
}

/**
 * Health check de n8n al startup (non-fatal)
 */
export async function checkN8nHealth(): Promise<boolean> {
  try {
    const client = getN8nClient();
    const isHealthy = await client.testConnection();
    
    if (isHealthy) {
      console.log('🟢 N8N: Health check passed - workflows available');
    } else {
      console.warn('🟡 N8N: Health check failed - workflows may be limited');
    }
    
    return isHealthy;
  } catch (error) {
    console.warn('🟡 N8N: Health check error (non-fatal):', error);
    return false;
  }
}