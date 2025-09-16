import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Product } from "@shared/schema";
import { formatColombianPrice } from "@/lib/utils";

interface ProductGridProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
}

export default function ProductGrid({ products, onProductSelect }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Selecciona una categoría para ver los productos</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {products.map((product) => (
        <Card
          key={product.id}
          className="hover-elevate cursor-pointer transition-all duration-300 h-36 rounded-2xl shadow-lg hover:shadow-2xl border border-border/20 bg-gradient-to-br from-white/90 to-blue-50/30 backdrop-blur-sm hover:scale-105"
          onClick={() => onProductSelect(product)}
          data-testid={`card-product-${product.id}`}
        >
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex-1 flex flex-col justify-center">
              <h3 className="font-bold text-card-foreground mb-4 text-lg leading-tight text-center line-clamp-2">
                {product.name}
              </h3>
            </div>
            <div className="mt-auto">
              <div className="w-full bg-gradient-to-r from-primary via-blue-600 to-blue-700 text-white rounded-xl py-3 px-4 font-bold text-lg text-center shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-102">
                {formatColombianPrice(product.price)}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}