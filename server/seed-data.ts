import { DbStorage } from "./db-storage";

export async function seedDatabase() {
  const dbStorage = new DbStorage();
  
  try {
    // Verificar si ya hay datos
    const existingCategories = await dbStorage.getCategories();
    if (existingCategories.length > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }

    console.log("Seeding database with real restaurant data...");

    // Crear categorías
    const categoryPlatos = await dbStorage.createCategory({
      name: "Platos Principales", 
      icon: "ChefHat"
    });
    
    const categoryBebidas = await dbStorage.createCategory({
      name: "Bebidas", 
      icon: "Coffee"
    });
    
    const categoryPostres = await dbStorage.createCategory({
      name: "Postres", 
      icon: "Cake"
    });

    const categoryEntrantes = await dbStorage.createCategory({
      name: "Entrantes", 
      icon: "Utensils"
    });

    console.log("Categories created:", { categoryPlatos, categoryBebidas, categoryPostres, categoryEntrantes });

    // Crear productos - Entrantes
    await dbStorage.createProduct({
      name: "Croquetas de Jamón Ibérico",
      description: "6 unidades de croquetas cremosas de jamón ibérico caseras",
      price: "12.50",
      categoryId: categoryEntrantes.id
    });

    await dbStorage.createProduct({
      name: "Ensalada César",
      description: "Lechuga romana, pollo a la plancha, parmesano y salsa césar",
      price: "14.90",
      categoryId: categoryEntrantes.id
    });

    await dbStorage.createProduct({
      name: "Tabla de Quesos Artesanos",
      description: "Selección de quesos nacionales con miel y frutos secos",
      price: "18.50",
      categoryId: categoryEntrantes.id
    });

    // Crear productos - Platos Principales
    await dbStorage.createProduct({
      name: "Solomillo de Ternera a la Pimienta",
      description: "Solomillo de ternera nacional con salsa de pimienta verde y patatas confitadas",
      price: "28.50",
      categoryId: categoryPlatos.id
    });

    await dbStorage.createProduct({
      name: "Paella Valenciana",
      description: "Arroz bomba, pollo de corral, conejo, judías verdes y azafrán",
      price: "24.00",
      categoryId: categoryPlatos.id
    });

    await dbStorage.createProduct({
      name: "Lubina a la Sal",
      description: "Lubina fresca del Mediterráneo cocinada a la sal con verduras",
      price: "26.80",
      categoryId: categoryPlatos.id
    });

    await dbStorage.createProduct({
      name: "Cordero Lechal Asado",
      description: "Pierna de cordero lechal asado con hierbas aromáticas",
      price: "32.00",
      categoryId: categoryPlatos.id
    });

    await dbStorage.createProduct({
      name: "Risotto de Setas y Trufa",
      description: "Arroz arborio con setas variadas y aceite de trufa negra",
      price: "22.50",
      categoryId: categoryPlatos.id
    });

    // Crear productos - Bebidas
    await dbStorage.createProduct({
      name: "Agua Mineral San Pellegrino",
      description: "Agua mineral italiana con gas, botella 750ml",
      price: "3.50",
      categoryId: categoryBebidas.id
    });

    await dbStorage.createProduct({
      name: "Vino Tinto Reserva",
      description: "Tempranillo D.O. Rioja Reserva, copa 175ml",
      price: "6.50",
      categoryId: categoryBebidas.id
    });

    await dbStorage.createProduct({
      name: "Cerveza Estrella Galicia",
      description: "Cerveza rubia gallega, botella 330ml",
      price: "4.20",
      categoryId: categoryBebidas.id
    });

    await dbStorage.createProduct({
      name: "Café Espresso",
      description: "Café expreso de tueste natural, origen Brasil",
      price: "2.80",
      categoryId: categoryBebidas.id
    });

    await dbStorage.createProduct({
      name: "Zumo Natural de Naranja",
      description: "Zumo recién exprimido de naranjas valencianas",
      price: "4.50",
      categoryId: categoryBebidas.id
    });

    // Crear productos - Postres
    await dbStorage.createProduct({
      name: "Tiramisú de la Casa",
      description: "Tiramisú tradicional con mascarpone, café y cacao",
      price: "7.50",
      categoryId: categoryPostres.id
    });

    await dbStorage.createProduct({
      name: "Crema Catalana",
      description: "Crema catalana tradicional con azúcar caramelizado",
      price: "6.80",
      categoryId: categoryPostres.id
    });

    await dbStorage.createProduct({
      name: "Tarta de Queso con Frutos Rojos",
      description: "Tarta cremosa de queso philadelphia con mermelada casera",
      price: "8.20",
      categoryId: categoryPostres.id
    });

    await dbStorage.createProduct({
      name: "Sorbete de Limón",
      description: "Sorbete artesanal de limón siciliano",
      price: "5.50",
      categoryId: categoryPostres.id
    });

    console.log("Database seeded successfully with real restaurant data!");
    
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}