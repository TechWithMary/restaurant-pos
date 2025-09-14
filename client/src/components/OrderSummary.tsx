import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2 } from "lucide-react";
import type { OrderItemWithProduct } from "@shared/schema";

interface OrderSummaryProps {
  orderItems: OrderItemWithProduct[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onSendToKitchen: () => void;
}

export default function OrderSummary({
  orderItems,
  onUpdateQuantity,
  onRemoveItem,
  onSendToKitchen,
}: OrderSummaryProps) {
  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const iva = subtotal * 0.21; // 21% IVA
  const total = subtotal + iva;

  return (
    <div className="flex flex-col h-full p-4">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumen del Pedido</CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col gap-4">
          {orderItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p className="text-center">
                El pedido está vacío.<br />
                Selecciona productos para empezar.
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 max-h-96 overflow-y-auto">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-md"
                    data-testid={`order-item-${item.id}`}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-1">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        €{parseFloat(item.product.price).toFixed(2)} c/u
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          if (item.quantity > 1) {
                            onUpdateQuantity(item.id, item.quantity - 1);
                          } else {
                            onRemoveItem(item.id);
                          }
                        }}
                        data-testid={`button-decrease-${item.id}`}
                      >
                        {item.quantity > 1 ? <Minus className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                      
                      <span className="w-8 text-center font-medium text-sm">
                        {item.quantity}
                      </span>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        data-testid={`button-increase-${item.id}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="text-right min-w-[60px]">
                      <span className="font-semibold text-sm">
                        €{item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span data-testid="text-subtotal">€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IVA (21%):</span>
                  <span data-testid="text-iva">€{iva.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span data-testid="text-total">€{total.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      <Button
        className="w-full h-14 text-lg font-semibold mt-4"
        disabled={orderItems.length === 0}
        onClick={onSendToKitchen}
        data-testid="button-send-to-kitchen"
      >
        Enviar a Cocina
      </Button>
    </div>
  );
}