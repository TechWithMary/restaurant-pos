import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, DollarSign, Calculator, Gift, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { OrderItemWithProduct } from "@shared/schema";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: number;
  orderItems: OrderItemWithProduct[];
  subtotal: number;
  tax: number;
  total: number;
  onPaymentComplete: () => void;
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
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [tip, setTip] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [processing, setProcessing] = useState(false);

  // Calculate final amounts with tip and discount
  const discountAmount = discountType === "percentage" 
    ? (subtotal * discount) / 100 
    : discount;
  const finalSubtotal = Math.max(0, subtotal - discountAmount);
  const finalTax = finalSubtotal * 0.08; // 8% Impoconsumo Colombia
  const finalTotal = finalSubtotal + finalTax + tip;
  const change = paymentMethod === "cash" ? Math.max(0, parseFloat(cashReceived) - finalTotal) : 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  // Payment completion mutation
  const completePaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      return await apiRequest('POST', '/api/complete-payment', paymentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tables'] });
      queryClient.invalidateQueries({ queryKey: ['/api/order-items', tableId] });
      toast({
        title: "Pago completado",
        description: "Mesa liberada exitosamente",
      });
      onPaymentComplete();
      onClose();
    },
    onError: (error) => {
      console.error('Payment error:', error);
      toast({
        title: "Error en el pago",
        description: "No se pudo completar el pago. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  });

  const handleCashPayment = async () => {
    if (parseFloat(cashReceived) < finalTotal) {
      toast({
        title: "Efectivo insuficiente",
        description: `Se requieren ${formatPrice(finalTotal)}`,
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      await completePaymentMutation.mutateAsync({
        tableId,
        paymentMethod: "cash",
        cashReceived: parseFloat(cashReceived),
        tip,
        discount,
        discountType,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    if (!stripe || !elements) {
      toast({
        title: "Error",
        description: "Sistema de pagos no disponible",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      // Create payment intent with server-calculated totals
      const paymentIntentResponse = await apiRequest('POST', '/api/create-payment-intent', {
        tableId,
        tip,
        discount,
        discountType,
      });

      const { clientSecret, paymentIntentId, calculatedTotals } = paymentIntentResponse as unknown as {
        clientSecret: string;
        paymentIntentId: string;
        calculatedTotals: {
          subtotal: number;
          discount: number;
          tax: number;
          tip: number;
          total: number;
        };
      };

      // Confirm payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        }
      });

      if (result.error) {
        toast({
          title: "Error en el pago",
          description: result.error.message,
          variant: "destructive"
        });
      } else {
        // Payment successful, complete the order
        await completePaymentMutation.mutateAsync({
          tableId,
          paymentMethod: "card",
          paymentIntentId: result.paymentIntent.id,
          tip,
          discount,
          discountType,
        });
      }
    } catch (error) {
      console.error('Card payment error:', error);
      toast({
        title: "Error en el pago",
        description: "No se pudo procesar el pago con tarjeta",
        variant: "destructive"
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="payment-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Procesar Pago - Mesa {tableId}
          </DialogTitle>
          <DialogDescription>
            Gestiona el pago y finaliza la orden
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
                        {formatPrice(parseFloat(item.product.price))} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">{formatPrice(item.subtotal)}</p>
                  </div>
                ))}
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento:</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>Impoconsumo (8%):</span>
                    <span>{formatPrice(finalTax)}</span>
                  </div>
                  
                  {tip > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Propina:</span>
                      <span>{formatPrice(tip)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total:</span>
                    <span>{formatPrice(finalTotal)}</span>
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
                    <Label htmlFor="custom-tip">Propina personalizada</Label>
                    <Input
                      id="custom-tip"
                      type="number"
                      step="0.01"
                      min="0"
                      value={tip}
                      onChange={(e) => setTip(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
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
                      €
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
                    Descuento aplicado: {formatPrice(discountAmount)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Payment Methods */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Método de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "cash" | "card")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="cash" data-testid="tab-cash">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Efectivo
                    </TabsTrigger>
                    <TabsTrigger value="card" data-testid="tab-card">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Tarjeta
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="cash" className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="cash-received">Efectivo recibido</Label>
                        <Input
                          id="cash-received"
                          type="number"
                          step="0.01"
                          min="0"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder={formatPrice(finalTotal)}
                          data-testid="input-cash-received"
                        />
                      </div>
                      
                      {cashReceived && parseFloat(cashReceived) >= finalTotal && (
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                            Cambio: {formatPrice(change)}
                          </p>
                        </div>
                      )}
                      
                      <Button
                        onClick={handleCashPayment}
                        disabled={!cashReceived || parseFloat(cashReceived) < finalTotal || processing}
                        className="w-full"
                        size="lg"
                        data-testid="button-complete-cash-payment"
                      >
                        {processing ? "Procesando..." : "Completar Pago en Efectivo"}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="card" className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-4 border rounded-lg">
                        <CardElement
                          options={{
                            style: {
                              base: {
                                fontSize: '16px',
                                color: '#424770',
                                '::placeholder': {
                                  color: '#aab7c4',
                                },
                              },
                            },
                          }}
                        />
                      </div>
                      
                      <Button
                        onClick={handleCardPayment}
                        disabled={!stripe || processing}
                        className="w-full"
                        size="lg"
                        data-testid="button-complete-card-payment"
                      >
                        {processing ? "Procesando..." : `Pagar ${formatPrice(finalTotal)} con Tarjeta`}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
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