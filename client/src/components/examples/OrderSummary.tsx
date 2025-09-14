import OrderSummary from '../OrderSummary';
import { mockProducts } from '@/lib/mockData';
import type { OrderItemWithProduct } from '@shared/schema';

export default function OrderSummaryExample() {
  // Sample order items
  const sampleOrderItems: OrderItemWithProduct[] = [
    {
      id: '1',
      productId: '1',
      quantity: 2,
      orderId: null,
      product: mockProducts[0], // Solomillo a la Pimienta
      subtotal: parseFloat(mockProducts[0].price) * 2,
    },
    {
      id: '2',
      productId: '4',
      quantity: 1,
      orderId: null,
      product: mockProducts[3], // Agua Mineral
      subtotal: parseFloat(mockProducts[3].price) * 1,
    },
  ];

  return (
    <div className="w-80 h-96 bg-card border border-card-border rounded-md">
      <OrderSummary
        orderItems={sampleOrderItems}
        onUpdateQuantity={(id, quantity) => console.log(`Update quantity for ${id}:`, quantity)}
        onRemoveItem={(id) => console.log('Remove item:', id)}
        onSendToKitchen={() => console.log('Send to kitchen clicked')}
      />
    </div>
  );
}