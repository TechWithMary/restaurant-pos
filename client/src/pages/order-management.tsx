import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Users, Receipt, CreditCard, Loader2, Trash2, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import PaymentModal from "@/components/PaymentModal";
import type { OrderItemWithProduct, Table } from "@shared/schema";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

export default function OrderManagement() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const { auth } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const tableId = params.tableId ? parseInt(params.tableId) : null;
  const mesaId = auth.mesa_id || tableId;
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInvoiceFinalized, setIsInvoiceFinalized] = useState(false);
  const [finalizedOrderData, setFinalizedOrderData] = useState<{
    items: OrderItemWithProduct[];
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    timestamp: string;
    tableId: number;
  } | null>(null);

  // Redirect if not authenticated or not cashier
  useEffect(() => {
    if (!auth.isAuthenticated || auth.role !== "cajero" || !tableId) {
      setLocation('/login');
      return;
    }
  }, [auth.isAuthenticated, auth.role, tableId, setLocation]);

  const handleBackToTableMap = () => {
    setLocation('/table-map');
  };

  // Fetch table information
  const { data: table } = useQuery<Table>({
    queryKey: ['/api/tables', tableId],
    queryFn: async () => {
      console.log('Fetching table info for table:', tableId);
      const response = await fetch(`/api/tables/${tableId}`);
      if (!response.ok) throw new Error('Failed to fetch table');
      return response.json();
    },
    enabled: !!tableId,
  });

  // Fetch existing order items for this table with auto-refresh for real-time updates
  const { data: orderItems = [], isLoading: orderItemsLoading } = useQuery<OrderItemWithProduct[]>({
    queryKey: ['/api/order-items', mesaId],
    queryFn: async () => {
      console.log('Fetching order items for mesa_id:', mesaId);
      const response = await fetch(`/api/order-items?mesa_id=${mesaId}`);
      if (!response.ok) throw new Error('Failed to fetch order items');
      const data = await response.json();
      console.log('Order items fetched:', data);
      return data;
    },
    enabled: !!mesaId,
    // Auto-refresh every 15 seconds for real-time order updates
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  });

  // Delete order item mutation
  const deleteOrderItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest('DELETE', `/api/order-items/${itemId}?mesa_id=${mesaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/order-items', mesaId] });
      toast({
        title: "Producto eliminado",
        description: "El producto se eliminó del pedido",
      });
    },
    onError: (error) => {
      console.error('Delete item error:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive"
      });
    }
  });

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.08; // 8% Impoconsumo Colombia
  const total = subtotal + tax;

  const handleDeleteItem = (itemId: string) => {
    deleteOrderItemMutation.mutate(itemId);
  };

  const handlePrintReceipt = () => {
    // Create a printable receipt
    const receiptContent = `
      <div style="max-width: 300px; margin: 0 auto; font-family: monospace; padding: 20px;">
        <h2 style="text-align: center; margin-bottom: 20px;">RESTAURANTE POS</h2>
        <p style="text-align: center; margin-bottom: 20px;">Mesa ${tableId}</p>
        <hr>
        ${orderItems.map(item => `
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>${item.product.name} x${item.quantity}</span>
            <span>${formatPrice(item.subtotal)}</span>
          </div>
        `).join('')}
        <hr>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>Subtotal:</span>
          <span>${formatPrice(subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>Impoconsumo (8%):</span>
          <span>${formatPrice(tax)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 10px 0; font-weight: bold; font-size: 1.2em;">
          <span>TOTAL:</span>
          <span>${formatPrice(total)}</span>
        </div>
        <hr>
        <p style="text-align: center; margin-top: 20px; font-size: 0.8em;">
          Fecha: ${new Date().toLocaleDateString('es-ES')}<br>
          Hora: ${new Date().toLocaleTimeString('es-ES')}<br>
          Cajero: ${auth.mesero_id}
        </p>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Factura Mesa ${tableId}</title>
            <style>
              body { margin: 0; padding: 0; }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${receiptContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  const handlePaymentComplete = (paymentData: {
    items: OrderItemWithProduct[];
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    timestamp: string;
    tableId: number;
  }) => {
    // FIXED: Use received data from PaymentModal (no race condition)
    setFinalizedOrderData(paymentData);
    setIsPaymentModalOpen(false);
    setIsInvoiceFinalized(true); // Mostrar pantalla de finalización
  };

  // Re-imprimir factura con datos finalizados
  const handleReprintInvoice = () => {
    if (!finalizedOrderData) return;
    
    const receiptContent = `
      <div style="max-width: 300px; margin: 0 auto; font-family: monospace; padding: 20px;">
        <h2 style="text-align: center; margin-bottom: 20px;">SumaPOS Colombia</h2>
        <p style="text-align: center; margin-bottom: 20px;">Mesa ${tableId}</p>
        <p style="text-align: center; margin-bottom: 10px;"><strong>*** FACTURA FINALIZADA ***</strong></p>
        <hr>
        ${finalizedOrderData.items.map(item => `
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>${item.product.name} x${item.quantity}</span>
            <span>${formatPrice(item.subtotal)}</span>
          </div>
        `).join('')}
        <hr>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>Subtotal:</span>
          <span>${formatPrice(finalizedOrderData.subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 5px 0;">
          <span>Impoconsumo (8%):</span>
          <span>${formatPrice(finalizedOrderData.tax)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 10px 0; font-weight: bold; font-size: 1.2em;">
          <span>TOTAL PAGADO:</span>
          <span>${formatPrice(finalizedOrderData.total)}</span>
        </div>
        <hr>
        <p style="text-align: center; margin: 10px 0;">
          <strong>Método de Pago: ${finalizedOrderData.paymentMethod}</strong>
        </p>
        <p style="text-align: center; margin-top: 20px; font-size: 0.8em;">
          Fecha: ${new Date(finalizedOrderData.timestamp).toLocaleDateString('es-CO')}<br>
          Hora: ${new Date(finalizedOrderData.timestamp).toLocaleTimeString('es-CO')}<br>
          Cajero: ${auth.mesero_id}<br>
          Estado: FACTURA CERRADA
        </p>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Factura Finalizada Mesa ${tableId}</title>
            <style>
              body { margin: 0; padding: 0; }
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${receiptContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  // Enviar factura DIAN usando n8n
  const handleSendDianInvoice = async () => {
    if (!finalizedOrderData) return;
    
    try {
      const response = await apiRequest('POST', '/api/n8n/send-dian-invoice', {
        mesa_id: tableId,
        cajero_id: auth.mesero_id,
        items: finalizedOrderData.items,
        total: finalizedOrderData.total,
        paymentMethod: finalizedOrderData.paymentMethod,
        timestamp: finalizedOrderData.timestamp,
      });

      toast({
        title: "Factura DIAN Enviada",
        description: "La factura electrónica ha sido enviada a DIAN exitosamente",
      });
    } catch (error) {
      console.error('Error sending DIAN invoice:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar la factura a DIAN. Intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  // Cerrar definitivamente y volver al mapa
  const handleFinalizeAndClose = () => {
    setIsInvoiceFinalized(false);
    setFinalizedOrderData(null);
    setLocation('/table-map');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  if (!auth.isAuthenticated || auth.role !== "cajero") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBackToTableMap}
              className="hover-elevate active-elevate-2"
              data-testid="button-back-table-map"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Mapa
            </Button>
            <h1 className="text-3xl font-bold text-primary">
              Gestión de Pedido - Mesa {tableId}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Cajero ID: {auth.mesero_id}</p>
          </div>
        </div>

        {/* Table Information */}
        {table && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Información de la Mesa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Número de Mesa</p>
                  <p className="text-2xl font-bold text-primary">{table.number}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Capacidad</p>
                  <p className="text-2xl font-bold">{table.capacity} personas</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge 
                    variant={table.status === "occupied" ? "destructive" : "secondary"}
                    className="text-sm"
                  >
                    {table.status === "occupied" ? "Ocupada" : table.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Detalles del Consumo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orderItemsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
                <span className="text-lg text-muted-foreground">Cargando pedido...</span>
              </div>
            ) : orderItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-3">🍽️</div>
                <h3 className="text-lg font-semibold mb-2">No hay pedidos en esta mesa</h3>
                <p className="text-muted-foreground">
                  La mesa no tiene productos ordenados actualmente.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Order Items List */}
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg group"
                      data-testid={`order-item-${item.id}`}
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{item.product.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.product.description}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Precio unitario: {formatPrice(parseFloat(item.product.price))}
                        </p>
                      </div>
                      <div className="text-center min-w-16">
                        <p className="text-sm text-muted-foreground">Cantidad</p>
                        <p className="text-2xl font-bold">{item.quantity}</p>
                      </div>
                      <div className="text-right min-w-24">
                        <p className="text-sm text-muted-foreground">Subtotal</p>
                        <p className="text-xl font-bold text-primary">
                          {formatPrice(item.subtotal)}
                        </p>
                      </div>
                      <div className="ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deleteOrderItemMutation.isPending}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                          data-testid={`delete-item-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg">Subtotal:</span>
                    <span className="text-lg font-semibold">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg">Impoconsumo (8%):</span>
                    <span className="text-lg font-semibold">{formatPrice(tax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold">Total:</span>
                    <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {orderItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              size="lg" 
              variant="outline"
              onClick={handlePrintReceipt}
              className="h-16 text-lg hover-elevate active-elevate-2"
              data-testid="button-print-receipt"
            >
              <Receipt className="w-6 h-6 mr-3" />
              Imprimir Factura
            </Button>
            <Button 
              size="lg"
              onClick={() => setIsPaymentModalOpen(true)}
              className="h-16 text-lg hover-elevate active-elevate-2"
              data-testid="button-finalize-payment"
            >
              <CreditCard className="w-6 h-6 mr-3" />
              Finalizar y Pagar
            </Button>
          </div>
        )}

        {/* Payment Modal */}
        <Elements stripe={stripePromise}>
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            tableId={tableId!}
            orderItems={orderItems}
            subtotal={subtotal}
            tax={tax}
            total={total}
            onPaymentComplete={handlePaymentComplete}
          />
        </Elements>

        {/* PANTALLA DE FINALIZACIÓN DE FACTURA */}
        {isInvoiceFinalized && finalizedOrderData && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="text-center bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
                <CardTitle className="text-2xl font-bold flex items-center justify-center gap-3">
                  <Receipt className="w-8 h-8" />
                  ¡Factura Finalizada Exitosamente!
                </CardTitle>
                <p className="text-green-100 mt-2">Mesa {tableId} - Pago Completado</p>
              </CardHeader>
              
              <CardContent className="p-6">
                {/* Resumen del pedido */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-primary">Resumen del Pedido</h3>
                  <div className="space-y-2">
                    {finalizedOrderData.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-muted">
                        <span className="font-medium">{item.product.name} x{item.quantity}</span>
                        <span className="font-semibold">{formatPrice(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal:</span>
                      <span>{formatPrice(finalizedOrderData.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Impoconsumo (8%):</span>
                      <span>{formatPrice(finalizedOrderData.tax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-xl font-bold text-primary">
                      <span>TOTAL PAGADO:</span>
                      <span>{formatPrice(finalizedOrderData.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Información del pago */}
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Detalles del Pago</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Método:</span>
                      <p className="font-medium">{finalizedOrderData.paymentMethod}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cajero:</span>
                      <p className="font-medium">ID {auth.mesero_id}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fecha:</span>
                      <p className="font-medium">{new Date(finalizedOrderData.timestamp).toLocaleDateString('es-CO')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Hora:</span>
                      <p className="font-medium">{new Date(finalizedOrderData.timestamp).toLocaleTimeString('es-CO')}</p>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleReprintInvoice}
                    className="h-14 hover-elevate active-elevate-2"
                    data-testid="button-reprint-invoice"
                  >
                    <Receipt className="w-5 h-5 mr-2" />
                    Re-imprimir Factura
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={handleSendDianInvoice}
                    className="h-14 hover-elevate active-elevate-2"
                    data-testid="button-send-dian"
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    Enviar a DIAN
                  </Button>
                  
                  <Button
                    size="lg"
                    onClick={handleFinalizeAndClose}
                    className="h-14 hover-elevate active-elevate-2 bg-green-600 hover:bg-green-700"
                    data-testid="button-finalize-close"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Cerrar y Continuar
                  </Button>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    La mesa ha sido liberada automáticamente y está disponible para nuevos clientes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}