import ProductGrid from '../ProductGrid';
import { mockProducts } from '@/lib/mockData';

export default function ProductGridExample() {
  // Show products from "Platos Principales" category
  const platosProducts = mockProducts.filter(p => p.categoryId === '1');
  
  return (
    <div className="max-w-4xl">
      <ProductGrid
        products={platosProducts}
        onProductSelect={(product) => console.log('Product selected:', product.name)}
      />
    </div>
  );
}