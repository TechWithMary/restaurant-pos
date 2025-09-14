import { ChefHat, Coffee, Cake } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Category } from "@shared/schema";

interface CategoryListProps {
  categories: Category[];
  selectedCategoryId?: string;
  onCategorySelect: (categoryId: string) => void;
}

const iconMap = {
  ChefHat: ChefHat,
  Coffee: Coffee,
  Cake: Cake,
};

export default function CategoryList({
  categories,
  selectedCategoryId,
  onCategorySelect,
}: CategoryListProps) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <h2 className="text-lg font-semibold text-foreground mb-2">Categorías</h2>
      {categories.map((category) => {
        const IconComponent = iconMap[category.icon as keyof typeof iconMap] || ChefHat;
        const isSelected = selectedCategoryId === category.id;

        return (
          <Button
            key={category.id}
            variant={isSelected ? "default" : "ghost"}
            className={`justify-start h-12 gap-3 ${
              isSelected ? "bg-primary text-primary-foreground" : ""
            }`}
            onClick={() => onCategorySelect(category.id)}
            data-testid={`button-category-${category.id}`}
          >
            <IconComponent className="w-5 h-5" />
            <span className="font-medium">{category.name}</span>
          </Button>
        );
      })}
    </div>
  );
}