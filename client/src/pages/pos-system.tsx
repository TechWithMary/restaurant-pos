import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import CategoryList from "@/components/CategoryList";
import ProductGrid from "@/components/ProductGrid";
import OrderSummary from "@/components/OrderSummary";
import type { Category, Product, OrderItemWithProduct } from "@shared/schema";

export default function POSSystem() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Fetch products by category
  const { data: filteredProducts = [] } = useQuery<Product[]>({
    queryKey: ['/api/products', selectedCategoryId],
    queryFn: async () => {
      const response = await fetch(`/api/products?categoryId=${selectedCategoryId}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    enabled: !!selectedCategoryId,
  });

  // Fetch current order items
  const { data: orderItems = [] } = useQuery<OrderItemWithProduct[]>({
    queryKey: ['/api/order-items'],
  });

  // Add item to order mutation
  const addItemMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch('/api/order-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 })
      });
      if (!response.ok) throw new Error('Failed to add item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/order-items'] });
    },
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const response = await fetch(`/api/order-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      if (!response.ok) throw new Error('Failed to update quantity');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/order-items'] });
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/order-items/${itemId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to remove item');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/order-items'] });
    },
  });

  // Send to kitchen mutation
  const sendToKitchenMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/orders/send-to-kitchen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to send to kitchen');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/order-items'] });
    },
  });

  // Set initial category selection
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const handleCategorySelect = (categoryId: string) => {
    console.log(`Category selected: ${categoryId}`);
    setSelectedCategoryId(categoryId);
  };

  const handleProductSelect = (product: Product) => {
    console.log(`Product added: ${product.name}`);
    
    // Check if product already exists in order
    const existingItem = orderItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      // Update quantity if product exists
      updateQuantityMutation.mutate({ 
        itemId: existingItem.id, 
        quantity: existingItem.quantity + 1 
      });
    } else {
      // Add new item to order
      addItemMutation.mutate(product.id);
    }
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    console.log(`Quantity updated for item ${itemId}: ${quantity}`);
    updateQuantityMutation.mutate({ itemId, quantity });
  };

  const handleRemoveItem = (itemId: string) => {
    console.log(`Item removed: ${itemId}`);
    removeItemMutation.mutate(itemId);
  };

  const handleSendToKitchen = () => {
    console.log("Order sent to kitchen:", orderItems);
    sendToKitchenMutation.mutate(undefined, {
      onSuccess: () => {
        alert("¡Pedido enviado a cocina!");
      },
      onError: () => {
        alert("Error al enviar el pedido. Intenta de nuevo.");
      },
    });
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-background via-blue-50/30 to-purple-50/20 overflow-hidden">
      {/* Left Column - Categories */}
      <div className="w-72 bg-gradient-to-b from-white/95 to-blue-50/50 border-r border-border/30 flex-shrink-0 shadow-xl backdrop-blur-sm">
        <CategoryList
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategorySelect={handleCategorySelect}
        />
      </div>

      {/* Center Column - Products */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 border-b border-border/30 bg-gradient-to-r from-white/80 via-blue-50/30 to-purple-50/20 backdrop-blur-sm">
          <h1 className="text-3xl font-bold text-foreground mb-2 drop-shadow-sm">
            🍽️ Sistema POS - Restaurante
          </h1>
          <p className="text-muted-foreground text-lg">
            {selectedCategoryId ? 
              `${categories.find(c => c.id === selectedCategoryId)?.name || 'Categoría'} • ${filteredProducts.length} productos disponibles` :
              'Selecciona una categoría para comenzar'
            }
          </p>
        </div>
        <ProductGrid
          products={filteredProducts}
          onProductSelect={handleProductSelect}
        />
      </div>

      {/* Right Column - Order Summary */}
      <div className="w-96 bg-gradient-to-b from-white/95 to-green-50/50 border-l border-border/30 flex-shrink-0 shadow-xl backdrop-blur-sm">
        <OrderSummary
          orderItems={orderItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onSendToKitchen={handleSendToKitchen}
        />
      </div>
    </div>
  );
}