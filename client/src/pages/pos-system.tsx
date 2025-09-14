import { useState, useEffect } from "react";
import CategoryList from "@/components/CategoryList";
import ProductGrid from "@/components/ProductGrid";
import OrderSummary from "@/components/OrderSummary";
import { mockCategories, mockProducts } from "@/lib/mockData";
import type { Category, Product, OrderItemWithProduct } from "@shared/schema";

export default function POSSystem() {
  const [categories] = useState<Category[]>(mockCategories);
  const [products] = useState<Product[]>(mockProducts);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemWithProduct[]>([]);

  // Set initial category selection
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Filter products by selected category
  useEffect(() => {
    if (selectedCategoryId) {
      const filtered = products.filter(product => product.categoryId === selectedCategoryId);
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [selectedCategoryId, products]);

  const handleCategorySelect = (categoryId: string) => {
    console.log(`Category selected: ${categoryId}`);
    setSelectedCategoryId(categoryId);
  };

  const handleProductSelect = (product: Product) => {
    console.log(`Product added: ${product.name}`);
    
    // Check if product already exists in order
    const existingItemIndex = orderItems.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex > -1) {
      // Update quantity if product exists
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].subtotal = 
        updatedItems[existingItemIndex].quantity * parseFloat(product.price);
      setOrderItems(updatedItems);
    } else {
      // Add new item to order
      const newOrderItem: OrderItemWithProduct = {
        id: `item-${Date.now()}-${Math.random()}`,
        productId: product.id,
        quantity: 1,
        orderId: null,
        product: product,
        subtotal: parseFloat(product.price),
      };
      setOrderItems([...orderItems, newOrderItem]);
    }
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    console.log(`Quantity updated for item ${itemId}: ${quantity}`);
    const updatedItems = orderItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity,
          subtotal: quantity * parseFloat(item.product.price),
        };
      }
      return item;
    });
    setOrderItems(updatedItems);
  };

  const handleRemoveItem = (itemId: string) => {
    console.log(`Item removed: ${itemId}`);
    setOrderItems(orderItems.filter(item => item.id !== itemId));
  };

  const handleSendToKitchen = () => {
    console.log("Order sent to kitchen:", orderItems);
    // TODO: Remove mock functionality - implement real order submission
    alert("¡Pedido enviado a cocina!");
    setOrderItems([]);
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left Column - Categories */}
      <div className="w-64 bg-card border-r border-card-border flex-shrink-0">
        <CategoryList
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategorySelect={handleCategorySelect}
        />
      </div>

      {/* Center Column - Products */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">
            Sistema POS - Restaurante
          </h1>
          <p className="text-muted-foreground">
            {selectedCategoryId ? 
              `${categories.find(c => c.id === selectedCategoryId)?.name || 'Categoría'} (${filteredProducts.length} productos)` :
              'Selecciona una categoría'
            }
          </p>
        </div>
        <ProductGrid
          products={filteredProducts}
          onProductSelect={handleProductSelect}
        />
      </div>

      {/* Right Column - Order Summary */}
      <div className="w-80 bg-card border-l border-card-border flex-shrink-0">
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