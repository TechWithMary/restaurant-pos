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
    <div className="flex flex-col gap-4 p-6">
      <h2 className="text-xl font-bold text-foreground mb-4 drop-shadow-sm">📋 Categorías</h2>
      {categories.map((category) => {
        const IconComponent = iconMap[category.icon as keyof typeof iconMap] || ChefHat;
        const isSelected = selectedCategoryId === category.id;

        return (
          <Button
            key={category.id}
            variant={isSelected ? "default" : "ghost"}
            className={`justify-start h-14 gap-4 rounded-2xl transition-all duration-300 border ${
              isSelected 
                ? "bg-gradient-to-r from-primary via-blue-600 to-blue-700 text-white shadow-xl scale-105 border-primary/20" 
                : "hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/30 hover:scale-102 border-border/20 bg-white/60 backdrop-blur-sm"
            }`}
            onClick={() => onCategorySelect(category.id)}
            data-testid={`button-category-${category.id}`}
          >
            <IconComponent className={`w-6 h-6 ${isSelected ? "text-white" : "text-primary"}`} />
            <span className={`font-semibold text-base ${isSelected ? "text-white" : "text-foreground"}`}>
              {category.name}
            </span>
          </Button>
        );
      })}
    </div>
  );
}