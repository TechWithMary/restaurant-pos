import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  Calculator, 
  Gift, 
  Trash2, 
  CreditCard, 
  Banknote,
  QrCode,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import type { OrderItemWithProduct } from "@shared/schema";

// Colombian Payment Methods - SumaPOS Colombia
type ColombianPaymentMethod = "efectivo" | "datafono_debito" | "datafono_credito" | "qr_bancolombia";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: number;
  orderItems: OrderItemWithProduct[];
  subtotal: number;
  tax: number;
  total: number;
  onPaymentComplete: (paymentData: {
    items: OrderItemWithProduct[];
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    timestamp: string;
    tableId: number;
  }) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  tableId,
  orderItems,
  subtotal,
  tax,
  total,
  onPaymentComplete,
}: PaymentModalProps) {
  const { toast } = useToast();
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  // Colombian Payment State
  const [paymentMethod, setPaymentMethod] = useState<ColombianPaymentMethod>("efectivo");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [tip, setTip] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [processing, setProcessing] = useState(false);

  // Datáfono fields - SIN números de tarjeta por seguridad
  const [datafonoTransactionId, setDatafonoTransactionId] = useState<string>("");

  // QR Bancolombia field
  const [qrReference, setQrReference] = useState<string>("");

  // Calculate final amounts with tip and discount - Impoconsumo 8% Colombia
  const discountAmount = discountType === "percentage" 
    ? (subtotal * discount) / 100 
    : discount;
  const finalSubtotal = Math.max(0, subtotal - discountAmount);
  const finalImpoconsumo = finalSubtotal * 0.08; // 8% Impoconsumo Colombia
  const finalTotal = finalSubtotal + finalImpoconsumo + tip;
  const change = paymentMethod === "efectivo" ? Math.max(0, parseFloat(cashReceived) - finalTotal) : 0;

  // Colombian Price Formatting (COP)
  const formatColombianPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
    }).format(price);
  };

  // Payment completion mutation - Colombian methods
  const completePaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      return await apiRequest('POST', '/api/payments/complete-colombian', paymentData);
    },
    onSuccess: (response, paymentData) => {
      // CRITICAL: Pass complete payment data BEFORE invalidation clears cache
      const completePaymentData = {
        items: [...orderItems], // Snapshot before clearing
        subtotal: finalSubtotal,
        tax: finalImpoconsumo, 
        total: finalTotal,
        paymentMethod: paymentData.paymentMethod,
        timestamp: new Date().toISOString(),
        tableId: tableId,
      };
      
      onPaymentComplete(completePaymentData);
      
      // Clear cache AFTER callback has data
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/order-items', tableId] });
      toast({
        title: "¡Pago completado!",
        description: "Mesa liberada exitosamente - SumaPOS Colombia",
      });
      onClose();
    },
    onError: (error: any) => {
      console.error('Colombian payment error:', error);
      toast({
        title: "Error en el pago",
        description: error.message || "No se pudo completar el pago. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  });

  // Employee ID para pagos - usando UUID fijo para cajero en desarrollo
  const employeeId = auth.mesero_id ? `cajero-${auth.mesero_id}-uuid` : "cajero-1-uuid";

  // Handle Colombian Efectivo Payment
  const handleEfectivoPayment = async () => {
    if (parseFloat(cashReceived) < finalTotal) {
      toast({
        title: "Efectivo insuficiente",
        description: `Se requieren ${formatColombianPrice(finalTotal)}`,
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      await completePaymentMutation.mutateAsync({
        tableId,
        employeeId,
        paymentMethod: "efectivo",
        subtotal: finalSubtotal,
        impoconsumo: finalImpoconsumo,
        tip,
        discount: discountAmount,
        discountType,
        cashReceived: parseFloat(cashReceived)
      });
    } finally {
      setProcessing(false);
    }
  };

  // Handle Colombian Datáfono Payment
  const handleDatafonoPayment = async () => {
    if (!datafonoTransactionId.trim()) {
      toast({
        title: "ID de transacción requerido",
        description: "Ingresa el ID de transacción del datáfono",
        variant: "destructive"
      });
      return;
    }

    // Validate transaction ID format (basic)
    if (datafonoTransactionId.length < 6) {
      toast({
        title: "ID de transacción inválido",
        description: "El ID debe tener al menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      // Derive type directly from selected tab to prevent desync
      const datafonoType = paymentMethod === "datafono_credito" ? "credito" : "debito";
      
      await completePaymentMutation.mutateAsync({
        tableId,
        employeeId,
        paymentMethod: paymentMethod,
        subtotal: finalSubtotal,
        impoconsumo: finalImpoconsumo,
        tip,
        discount: discountAmount,
        discountType,
        datafonoTransactionId: datafonoTransactionId,
        datafonoType: datafonoType
      });
    } finally {
      setProcessing(false);
    }
  };

  // Handle QR Bancolombia Payment
  const handleQrBancolombiaPayment = async () => {
    if (!qrReference.trim()) {
      toast({
        title: "Referencia QR requerida",
        description: "Ingresa la referencia de pago QR Bancolombia",
        variant: "destructive"
      });
      return;
    }

    // Basic QR reference validation
    if (qrReference.length < 8) {
      toast({
        title: "Referencia QR inválida",
        description: "La referencia debe tener al menos 8 caracteres",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      await completePaymentMutation.mutateAsync({
        tableId,
        employeeId,
        paymentMethod: "qr_bancolombia",
        subtotal: finalSubtotal,
        impoconsumo: finalImpoconsumo,
        tip,
        discount: discountAmount,
        discountType,
        qrReference: qrReference
      });
    } finally {
      setProcessing(false);
    }
  };

  const setTipPercentage = (percentage: number) => {
    setTip((subtotal * percentage) / 100);
  };

  const resetDiscount = () => {
    setDiscount(0);
    setDiscountType("percentage");
  };

  const getPaymentMethodIcon = (method: ColombianPaymentMethod) => {
    switch (method) {
      case "efectivo": return <Banknote className="w-4 h-4" />;
      case "datafono_debito": return <CreditCard className="w-4 h-4" />;
      case "datafono_credito": return <CreditCard className="w-4 h-4" />;
      case "qr_bancolombia": return <QrCode className="w-4 h-4" />;
    }
  };

  const getPaymentMethodName = (method: ColombianPaymentMethod) => {
    switch (method) {
      case "efectivo": return "Efectivo";
      case "datafono_debito": return "Datáfono Débito";
      case "datafono_credito": return "Datáfono Crédito";
      case "qr_bancolombia": return "QR Bancolombia";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="payment-modal-colombia">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            SumaPOS Colombia - Mesa {tableId}
          </DialogTitle>
          <DialogDescription>
            Procesar pago con métodos colombianos - Impoconsumo 8%
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Order Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen del Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatColombianPrice(parseFloat(item.product.price))} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">{formatColombianPrice(item.subtotal)}</p>
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatColombianPrice(subtotal)}</span>
                  </div>
                  
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento:</span>
                      <span>-{formatColombianPrice(discountAmount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      Impoconsumo (8%):
                      <Badge variant="secondary" className="text-xs">Colombia</Badge>
                    </span>
                    <span>{formatColombianPrice(finalImpoconsumo)}</span>
                  </div>
                  
                  {tip > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Propina:</span>
                      <span>{formatColombianPrice(tip)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total COP:</span>
                    <span>{formatColombianPrice(finalTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tip Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  Propina
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {[10, 15, 20, 25].map((percentage) => (
                    <Button
                      key={percentage}
                      variant={Math.abs(tip - (subtotal * percentage) / 100) < 0.01 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTipPercentage(percentage)}
                      data-testid={`tip-${percentage}`}
                    >
                      {percentage}%
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="custom-tip">Propina personalizada (COP)</Label>
                    <Input
                      id="custom-tip"
                      type="number"
                      step="100" // Colombian pesos steps
                      min="0"
                      value={tip}
                      onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      data-testid="input-custom-tip"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setTip(0)}
                      data-testid="button-clear-tip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Discount Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Descuentos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="discount">Descuento</Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      data-testid="input-discount"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      variant={discountType === "percentage" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDiscountType("percentage")}
                      data-testid="button-discount-percentage"
                    >
                      %
                    </Button>
                    <Button
                      variant={discountType === "fixed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDiscountType("fixed")}
                      data-testid="button-discount-fixed"
                    >
                      COP
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={resetDiscount}
                      data-testid="button-clear-discount"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {discountAmount > 0 && (
                  <p className="text-sm text-green-600">
                    Descuento aplicado: {formatColombianPrice(discountAmount)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Colombian Payment Methods */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Métodos de Pago Colombia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as ColombianPaymentMethod)}>
                  <TabsList className="grid w-full grid-cols-4 h-auto">
                    <TabsTrigger value="efectivo" data-testid="tab-efectivo" className="flex flex-col h-16">
                      <Banknote className="w-4 h-4 mb-1" />
                      <span className="text-xs">Efectivo</span>
                    </TabsTrigger>
                    <TabsTrigger value="datafono_debito" data-testid="tab-datafono-debito" className="flex flex-col h-16">
                      <CreditCard className="w-4 h-4 mb-1" />
                      <span className="text-xs">D. Débito</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="datafono_credito" 
                      data-testid="tab-datafono-credito"
                      className="flex flex-col h-16"
                    >
                      <CreditCard className="w-4 h-4 mb-1" />
                      <span className="text-xs">D. Crédito</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="qr_bancolombia" 
                      data-testid="tab-qr-bancolombia"
                      className="flex flex-col h-16"
                    >
                      <QrCode className="w-4 h-4 mb-1" />
                      <span className="text-xs">QR Banco</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Efectivo Tab */}
                  <TabsContent value="efectivo" className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="cash-received">Efectivo recibido (COP)</Label>
                        <Input
                          id="cash-received"
                          type="number"
                          step="500" // Colombian peso steps
                          min="0"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder={formatColombianPrice(finalTotal)}
                          data-testid="input-cash-received"
                        />
                      </div>
                      
                      {cashReceived && parseFloat(cashReceived) >= finalTotal && (
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                            Cambio: {formatColombianPrice(change)}
                          </p>
                        </div>
                      )}
                      
                      <Button
                        onClick={handleEfectivoPayment}
                        disabled={!cashReceived || parseFloat(cashReceived) < finalTotal || processing}
                        className="w-full"
                        size="lg"
                        data-testid="button-complete-efectivo-payment"
                      >
                        {processing ? "Procesando..." : "Completar Pago Efectivo"}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Datáfono Débito Tab */}
                  <TabsContent value="datafono_debito" className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>Datáfono Débito</strong><br />
                            Solo ingresa el ID de transacción. SumaPOS Colombia protege datos de tarjeta.
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="datafono-transaction-id">ID de Transacción</Label>
                        <Input
                          id="datafono-transaction-id"
                          type="text"
                          value={datafonoTransactionId}
                          onChange={(e) => setDatafonoTransactionId(e.target.value)}
                          placeholder="Ej: TRX123456789"
                          data-testid="input-datafono-transaction-id"
                        />
                      </div>
                      
                      <Button
                        onClick={handleDatafonoPayment}
                        disabled={!datafonoTransactionId.trim() || processing}
                        className="w-full"
                        size="lg"
                        data-testid="button-complete-datafono-debito-payment"
                      >
                        {processing ? "Procesando..." : `Pagar ${formatColombianPrice(finalTotal)} - Débito`}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Datáfono Crédito Tab */}
                  <TabsContent value="datafono_credito" className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-purple-600 mt-0.5" />
                          <div className="text-sm text-purple-700 dark:text-purple-300">
                            <strong>Datáfono Crédito</strong><br />
                            Solo ingresa el ID de transacción. Sin números de tarjeta por seguridad.
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="datafono-transaction-id-credit">ID de Transacción</Label>
                        <Input
                          id="datafono-transaction-id-credit"
                          type="text"
                          value={datafonoTransactionId}
                          onChange={(e) => setDatafonoTransactionId(e.target.value)}
                          placeholder="Ej: TRX987654321"
                          data-testid="input-datafono-transaction-id-credit"
                        />
                      </div>
                      
                      <Button
                        onClick={handleDatafonoPayment}
                        disabled={!datafonoTransactionId.trim() || processing}
                        className="w-full"
                        size="lg"
                        data-testid="button-complete-datafono-credito-payment"
                      >
                        {processing ? "Procesando..." : `Pagar ${formatColombianPrice(finalTotal)} - Crédito`}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* QR Bancolombia Tab */}
                  <TabsContent value="qr_bancolombia" className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                        <div className="flex items-start gap-2">
                          <QrCode className="w-4 h-4 text-yellow-600 mt-0.5" />
                          <div className="text-sm text-yellow-700 dark:text-yellow-300">
                            <strong>QR Bancolombia Negro Interoperable</strong><br />
                            Ingresa la referencia de pago generada por la app Bancolombia.
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="qr-reference">Referencia de Pago QR</Label>
                        <Input
                          id="qr-reference"
                          type="text"
                          value={qrReference}
                          onChange={(e) => setQrReference(e.target.value)}
                          placeholder="Ej: QR123456789ABC"
                          data-testid="input-qr-reference"
                        />
                      </div>
                      
                      <Button
                        onClick={handleQrBancolombiaPayment}
                        disabled={!qrReference.trim() || processing}
                        className="w-full"
                        size="lg"
                        data-testid="button-complete-qr-payment"
                      >
                        {processing ? "Procesando..." : `Pagar ${formatColombianPrice(finalTotal)} - QR`}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Payment Summary Card */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  {getPaymentMethodIcon(paymentMethod)}
                  {getPaymentMethodName(paymentMethod)} Seleccionado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total a Pagar:</span>
                  <span className="text-green-600">{formatColombianPrice(finalTotal)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Incluye Impoconsumo 8% colombiano
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={processing}
            className="flex-1"
            data-testid="button-cancel-payment"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}