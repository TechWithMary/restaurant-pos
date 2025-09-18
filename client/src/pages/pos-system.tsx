import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSimpleToast } from "@/components/SimpleToast";
import CategoryList from "@/components/CategoryList";
import ProductGrid from "@/components/ProductGrid";
import OrderSummary from "@/components/OrderSummary";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Category, Product, OrderItemWithProduct } from "@shared/schema";

export default function POSSystem() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const params = useParams();
  const [, setLocation] = useLocation();
  const { auth, clearTable } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { showToast } = useSimpleToast();
  
  const tableId = params.tableId ? parseInt(params.tableId) : null;
  
  // Check if we're loading an existing order
  const urlParams = new URLSearchParams(window.location.search);
  const isExistingOrder = urlParams.get('existing') === 'true';
  
  // Redirect if no table selected or not authenticated
  useEffect(() => {
    if (!auth.isAuthenticated || !tableId) {
      setLocation('/login');
      return;
    }
  }, [auth.isAuthenticated, tableId, setLocation]);


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

  // Fetch existing order from n8n if this is an occupied table
  const { data: existingOrderData, isLoading: existingOrderLoading } = useQuery({
    queryKey: ['/api/pedido/mesa', tableId],
    queryFn: async () => {
      console.log(`Fetching existing order from n8n for mesa ${tableId}`);
      const response = await fetch(`/api/pedido/mesa/${tableId}`);
      if (!response.ok) throw new Error('Failed to fetch existing order');
      const data = await response.json();
      console.log('Existing order data from n8n:', data);
      return data;
    },
    enabled: !!tableId && isExistingOrder, // Solo ejecutar cuando venga de mesa ocupada
  });

  // Fetch current order items - mesa-scoped usando el mesa_id del contexto
  const mesaId = auth.mesa_id || tableId; // Usar mesa_id del contexto o tableId como fallback
  const { data: orderItems = [] } = useQuery<OrderItemWithProduct[]>({
    queryKey: ['/api/order-items', mesaId],
    queryFn: async () => {
      console.log('Fetching order items for mesa_id:', mesaId);
      const response = await fetch(`/api/order-items?mesa_id=${mesaId}`);
      if (!response.ok) throw new Error('Failed to fetch order items');
      return response.json();
    },
    enabled: !!mesaId, // Solo ejecutar cuando tengamos un mesa_id válido
  });

  // Add item to order mutation
  const addItemMutation = useMutation({
    mutationFn: async (productId: string) => {
      console.log('Adding item to mesa_id:', mesaId);
      const response = await fetch('/api/order-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1, mesaId })
      });
      if (!response.ok) throw new Error('Failed to add item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/order-items', mesaId] });
    },
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      console.log('Updating quantity for mesa_id:', mesaId);
      const response = await fetch(`/api/order-items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, mesa_id: mesaId })
      });
      if (!response.ok) throw new Error('Failed to update quantity');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/order-items', mesaId] });
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      console.log('Removing item from mesa_id:', mesaId);
      const response = await fetch(`/api/order-items/${itemId}?mesa_id=${mesaId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to remove item');
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/order-items', mesaId] });
    },
  });

  // Send to kitchen mutation
  const sendToKitchenMutation = useMutation({
    mutationFn: async () => {
      // Usar los valores reales del contexto de autenticación
      const finalMesaId = mesaId;
      const finalMeseroId = auth.mesero_id || 1; // Fallback a 1 si no está definido
      
      console.log('Sending to kitchen with data:', {
        mesa_id: finalMesaId,
        mesero_id: finalMeseroId,
        numberOfPeople: auth.numberOfPeople || null
      });
      
      const response = await fetch('/api/orders/send-to-kitchen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mesa_id: finalMesaId,
          mesero_id: finalMeseroId,
          numberOfPeople: auth.numberOfPeople || null
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // If n8n returns an error, throw it to be handled in onError
        throw new Error(data.error || 'Failed to send to kitchen');
      }
      
      return data;
    },
    onSuccess: () => {
      console.log('Order sent successfully, clearing items for mesa_id:', mesaId);
      queryClient.invalidateQueries({ queryKey: ['/api/order-items', mesaId] });
    },
  });

  // Populate existing order items when loading from n8n
  useEffect(() => {
    if (isExistingOrder && existingOrderData && !existingOrderLoading) {
      console.log('Populating existing order from n8n:', existingOrderData);
      
      // Check if the response has the expected structure
      if (existingOrderData.items && Array.isArray(existingOrderData.items)) {
        console.log('Found existing order items to populate:', existingOrderData.items.length);
        
        // For each item in the existing order, add it to our local storage
        existingOrderData.items.forEach(async (item: any) => {
          try {
            // Add each item to our order
            const response = await fetch('/api/order-items', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: item.productId || item.product_id,
                quantity: item.quantity || 1,
                mesaId: mesaId
              })
            });
            
            if (response.ok) {
              console.log('Successfully added existing item:', item);
            } else {
              console.error('Failed to add existing item:', item);
            }
          } catch (error) {
            console.error('Error adding existing item:', error);
          }
        });
        
        // Refresh the order items after populating
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['/api/order-items', mesaId] });
        }, 1000);
      }
    }
  }, [isExistingOrder, existingOrderData, existingOrderLoading, mesaId, queryClient]);

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
      onSuccess: (data) => {
        console.log("Send to kitchen success:", data);
        // Show success notification (green)
        if (data.success) {
          console.log("Showing success toast:", data.message);
          showToast({
            title: "Éxito",
            message: data.message || "¡Pedido enviado a cocina!",
            type: "success",
            duration: 5000,
          });
          // Also try shadcn toast as fallback
          toast({
            title: "Éxito",
            description: data.message || "¡Pedido enviado a cocina!",
            variant: "default",
            duration: 5000,
          });
        } else {
          console.log("Showing error toast (from success):", data.error);
          showToast({
            title: "Error",
            message: data.error || "Error al enviar el pedido",
            type: "error",
            duration: 5000,
          });
          toast({
            title: "Error",
            description: data.error || "Error al enviar el pedido",
            variant: "destructive",
            duration: 5000,
          });
        }
      },
      onError: (error: any) => {
        console.error("Error sending to kitchen:", error);
        // Show error notification (red) 
        let errorMessage = "Error al enviar el pedido. Intenta de nuevo.";
        
        if (error?.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        console.log("Showing error toast (from onError):", errorMessage);
        showToast({
          title: "Error",
          message: errorMessage,
          type: "error",
          duration: 8000,
        });
        // Also try shadcn toast as fallback
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
          duration: 8000,
        });
      },
    });
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-background via-blue-50/30 to-purple-50/20 overflow-hidden">
      {/* Left Column - Categories */}
      <div className="w-72 bg-gradient-to-b from-white/95 to-blue-50/50 border-r border-border/30 flex-shrink-0 shadow-xl backdrop-blur-sm">
        {/* Header with back button */}
        <div className="p-4 border-b border-border/30 bg-gradient-to-r from-white/90 to-blue-50/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearTable();
              setLocation('/tables');
            }}
            className="mb-2 hover-elevate active-elevate-2"
            data-testid="button-back-tables"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Mesas
          </Button>
          <div className="text-sm text-muted-foreground">
            <p>Mesa: {tableId}</p>
            <p>Mesero: {auth.mesero_id}</p>
            {auth.numberOfPeople && <p>Personas: {auth.numberOfPeople}</p>}
          </div>
        </div>
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
            🍽️ Mesa {tableId} - Pedido
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