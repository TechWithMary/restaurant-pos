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
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {products.map((product) => (
        <Card
          key={product.id}
          className="hover-elevate cursor-pointer transition-all duration-200 min-h-[140px]"
          onClick={() => onProductSelect(product)}
          data-testid={`card-product-${product.id}`}
        >
          <CardContent className="p-4 flex flex-col h-full">
            <div className="flex-1">
              <h3 className="font-semibold text-card-foreground line-clamp-2 mb-2">
                {product.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                {product.description}
              </p>
            </div>
            <div className="mt-auto">
              <Button
                variant="ghost"
                size="sm"
                className="w-full bg-success/10 text-success hover:bg-success/20 font-bold"
                data-testid={`button-add-${product.id}`}
              >
                €{parseFloat(product.price).toFixed(2)}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}