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
    <div className="flex flex-col gap-3 p-6">
      <h2 className="text-xl font-bold text-foreground mb-4">Categorías</h2>
      {categories.map((category) => {
        const IconComponent = iconMap[category.icon as keyof typeof iconMap] || ChefHat;
        const isSelected = selectedCategoryId === category.id;

        return (
          <Button
            key={category.id}
            variant={isSelected ? "default" : "ghost"}
            className={`justify-start h-14 gap-4 rounded-xl transition-all duration-300 ${
              isSelected 
                ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg scale-105" 
                : "hover:bg-muted/50 hover:scale-105"
            }`}
            onClick={() => onCategorySelect(category.id)}
            data-testid={`button-category-${category.id}`}
          >
            <IconComponent className={`w-6 h-6 ${isSelected ? "text-primary-foreground" : "text-muted-foreground"}`} />
            <span className={`font-semibold text-base ${isSelected ? "text-primary-foreground" : "text-foreground"}`}>
              {category.name}
            </span>
          </Button>
        );
      })}
    </div>
  );
}