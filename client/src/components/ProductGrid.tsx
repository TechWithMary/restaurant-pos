import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Product } from "@shared/schema";

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
          className="hover-elevate cursor-pointer transition-all duration-300 min-h-[160px] rounded-xl shadow-lg hover:shadow-xl border-0 bg-gradient-to-br from-card to-card/80"
          onClick={() => onProductSelect(product)}
          data-testid={`card-product-${product.id}`}
        >
          <CardContent className="p-6 flex flex-col h-full">
            <div className="flex-1">
              <h3 className="font-semibold text-card-foreground line-clamp-2 mb-3 text-lg">
                {product.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                {product.description}
              </p>
            </div>
            <div className="mt-auto">
              <div className="w-full bg-gradient-to-r from-accent to-accent/90 text-accent-foreground rounded-lg py-3 px-4 font-bold text-lg text-center hover:from-accent/90 hover:to-accent transition-all duration-200">
                €{parseFloat(product.price).toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}