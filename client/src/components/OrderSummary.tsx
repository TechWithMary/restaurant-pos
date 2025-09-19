import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { OrderItemWithProduct } from "@shared/schema";
import { formatColombianPrice } from "@/lib/utils";

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
  const [includeTip, setIncludeTip] = useState(false);
  
  const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  const iva = subtotal * 0.08; // 8% Impoconsumo Colombia
  const tip = subtotal * 0.10; // 10% propina voluntaria
  const total = subtotal + iva + (includeTip ? tip : 0);

  return (
    <div className="flex flex-col h-full p-6">
      <Card className="flex-1 flex flex-col rounded-2xl shadow-xl border border-border/20 bg-gradient-to-br from-white/90 to-green-50/30 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-foreground drop-shadow-sm">🛒 Resumen del Pedido</CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col gap-5">
          {orderItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p className="text-center text-lg">
                El pedido está vacío.<br />
                <span className="text-sm">Selecciona productos para empezar.</span>
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-4 max-h-96 overflow-y-auto pr-2">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-muted-foreground/10 hover-elevate"
                    data-testid={`order-item-${item.id}`}
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-base line-clamp-1">
                        {item.product.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {formatColombianPrice(item.product.price)} c/u
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
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
                      
                      <span className="w-10 text-center font-bold text-base bg-accent/10 text-accent rounded-lg py-1">
                        {item.quantity}
                      </span>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-lg hover:bg-accent/10 hover:text-accent transition-colors"
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        data-testid={`button-increase-${item.id}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="text-right min-w-[70px]">
                      <span className="font-bold text-base text-accent">
                        {formatColombianPrice(item.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-muted-foreground/20 pt-5 space-y-3">
                <div className="flex justify-between text-base">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-semibold" data-testid="text-subtotal">{formatColombianPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="font-medium">Impoconsumo (8%):</span>
                  <span className="font-semibold" data-testid="text-iva">{formatColombianPrice(iva)}</span>
                </div>
                
                {/* Sección de Propina Voluntaria */}
                <div className="flex justify-between items-center text-base py-2 px-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={includeTip}
                      onCheckedChange={setIncludeTip}
                      data-testid="switch-tip"
                    />
                    <span className="font-medium">Propina Voluntaria (10%):</span>
                  </div>
                  <span className="font-semibold text-green-600" data-testid="text-tip">
                    {formatColombianPrice(tip)}
                  </span>
                </div>
                
                <div className="flex justify-between text-xl font-bold border-t border-muted-foreground/20 pt-3">
                  <span>Total:</span>
                  <span className="text-accent" data-testid="text-total">{formatColombianPrice(total)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      <Button
        className="w-full h-16 text-xl font-bold mt-6 rounded-2xl bg-gradient-to-r from-green-500 via-emerald-600 to-green-700 hover:from-green-600 hover:to-emerald-700 text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:bg-muted"
        disabled={orderItems.length === 0}
        onClick={onSendToKitchen}
        data-testid="button-send-to-kitchen"
      >
        🍽️ Enviar a Cocina
      </Button>
    </div>
  );
}