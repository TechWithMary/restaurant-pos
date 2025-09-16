import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un precio en pesos colombianos (COP)
 * Convierte de euros a pesos con una tasa aproximada y aplica formato colombiano
 * @param price - Precio en euros como string o number
 * @returns String formateado como "$ 18.500" (sin decimales)
 */
export function formatColombianPrice(price: string | number): string {
  const euroPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // Conversión aproximada de euros a pesos colombianos (1 EUR = ~4700 COP)
  const copPrice = Math.round(euroPrice * 4700);
  
  // Formatear con punto como separador de miles
  const formattedPrice = copPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `$ ${formattedPrice}`;
}
