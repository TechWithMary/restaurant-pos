import CategoryList from '../CategoryList';
import { mockCategories } from '@/lib/mockData';

export default function CategoryListExample() {
  return (
    <div className="w-64 bg-card border border-card-border rounded-md">
      <CategoryList
        categories={mockCategories}
        selectedCategoryId="1"
        onCategorySelect={(id) => console.log('Category selected:', id)}
      />
    </div>
  );
}