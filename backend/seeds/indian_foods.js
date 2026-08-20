const pool = require('../config/database');

const indianFoods = [
  // North Indian - Breads
  { name: 'Roti (Wheat)', region: 'North', category: 'Bread', serving_size: '1 roti (30g)', carbs_per_serving: 15, source: 'USDA' },
  { name: 'Naan (Plain)', region: 'North', category: 'Bread', serving_size: '1 naan (90g)', carbs_per_serving: 37, source: 'USDA' },
  { name: 'Paratha (Plain)', region: 'North', category: 'Bread', serving_size: '1 paratha (60g)', carbs_per_serving: 20, source: 'USDA' },
  { name: 'Kulcha', region: 'North', category: 'Bread', serving_size: '1 kulcha (100g)', carbs_per_serving: 45, source: 'USDA' },
  { name: 'Bhatura', region: 'North', category: 'Bread', serving_size: '1 piece (150g)', carbs_per_serving: 60, source: 'USDA' },

  // North Indian - Rice
  { name: 'Basmati Rice (Cooked)', region: 'North', category: 'Rice', serving_size: '1 cup (160g)', carbs_per_serving: 45, source: 'USDA' },
  { name: 'Biryani Rice', region: 'North', category: 'Rice', serving_size: '1 cup (180g)', carbs_per_serving: 55, source: 'USDA' },
  { name: 'Pilaf (Plain)', region: 'North', category: 'Rice', serving_size: '1 cup (150g)', carbs_per_serving: 40, source: 'USDA' },

  // North Indian - Curries
  { name: 'Butter Chicken', region: 'North', category: 'Curry', serving_size: '1 cup (240ml)', carbs_per_serving: 8, source: 'USDA' },
  { name: 'Paneer Tikka Masala', region: 'North', category: 'Curry', serving_size: '1 cup (240ml)', carbs_per_serving: 10, source: 'USDA' },
  { name: 'Dal Makhani', region: 'North', category: 'Curry', serving_size: '1 cup (240ml)', carbs_per_serving: 25, source: 'USDA' },
  { name: 'Aloo Gobi', region: 'North', category: 'Curry', serving_size: '1 cup (200g)', carbs_per_serving: 20, source: 'USDA' },
  { name: 'Rogan Josh', region: 'North', category: 'Curry', serving_size: '1 cup (240ml)', carbs_per_serving: 12, source: 'USDA' },

  // South Indian - Rice
  { name: 'Rice (White Cooked)', region: 'South', category: 'Rice', serving_size: '1 cup (150g)', carbs_per_serving: 43, source: 'USDA' },
  { name: 'Idli (2 pieces)', region: 'South', category: 'Bread', serving_size: '2 idlis (100g)', carbs_per_serving: 18, source: 'USDA' },
  { name: 'Dosa (Plain)', region: 'South', category: 'Bread', serving_size: '1 dosa (100g)', carbs_per_serving: 20, source: 'USDA' },
  { name: 'Uttapam (Vegetable)', region: 'South', category: 'Bread', serving_size: '1 uttapam (120g)', carbs_per_serving: 25, source: 'USDA' },

  // South Indian - Curries
  { name: 'Sambar', region: 'South', category: 'Curry', serving_size: '1 cup (240ml)', carbs_per_serving: 15, source: 'USDA' },
  { name: 'Rasam (Tomato)', region: 'South', category: 'Curry', serving_size: '1 cup (240ml)', carbs_per_serving: 8, source: 'USDA' },
  { name: 'Curd Rice', region: 'South', category: 'Rice', serving_size: '1 cup (180g)', carbs_per_serving: 25, source: 'USDA' },
  { name: 'Tamarind Rice', region: 'South', category: 'Rice', serving_size: '1 cup (150g)', carbs_per_serving: 38, source: 'USDA' },
  { name: 'Lemon Rice', region: 'South', category: 'Rice', serving_size: '1 cup (150g)', carbs_per_serving: 40, source: 'USDA' },

  // East Indian
  { name: 'Luchi (Fried Bread)', region: 'East', category: 'Bread', serving_size: '2 luches (80g)', carbs_per_serving: 28, source: 'USDA' },
  { name: 'Aloo Dum', region: 'East', category: 'Curry', serving_size: '1 cup (200g)', carbs_per_serving: 22, source: 'USDA' },
  { name: 'Hilsa Curry', region: 'East', category: 'Curry', serving_size: '1 cup (240ml)', carbs_per_serving: 5, source: 'USDA' },
  { name: 'Sandesh (Sweet)', region: 'East', category: 'Dessert', serving_size: '1 piece (50g)', carbs_per_serving: 30, source: 'USDA' },

  // West Indian
  { name: 'Dhokla (Steamed)', region: 'West', category: 'Snack', serving_size: '4 pieces (120g)', carbs_per_serving: 20, source: 'USDA' },
  { name: 'Fafda (Fried)', region: 'West', category: 'Snack', serving_size: '1 cup (100g)', carbs_per_serving: 35, source: 'USDA' },
  { name: 'Undhiyu', region: 'West', category: 'Curry', serving_size: '1 cup (200g)', carbs_per_serving: 28, source: 'USDA' },
  { name: 'Gujarati Khichdi', region: 'West', category: 'Rice', serving_size: '1 cup (150g)', carbs_per_serving: 35, source: 'USDA' },
  { name: 'Poha (Flattened Rice)', region: 'West', category: 'Breakfast', serving_size: '1 cup (100g)', carbs_per_serving: 32, source: 'USDA' },

  // Common Snacks (All Regions)
  { name: 'Samosa', region: 'North', category: 'Snack', serving_size: '1 samosa (50g)', carbs_per_serving: 18, source: 'USDA' },
  { name: 'Pakora (Vegetable)', region: 'North', category: 'Snack', serving_size: '1 cup (100g)', carbs_per_serving: 25, source: 'USDA' },
  { name: 'Chikhalwali (Chickpea Snack)', region: 'West', category: 'Snack', serving_size: '1 cup (80g)', carbs_per_serving: 20, source: 'USDA' },
  { name: 'Namkeen Mix', region: 'North', category: 'Snack', serving_size: '1 cup (100g)', carbs_per_serving: 35, source: 'USDA' },

  // Pulses & Legumes
  { name: 'Dal Tadka (Cooked)', region: 'North', category: 'Curry', serving_size: '1 cup (240ml)', carbs_per_serving: 30, source: 'USDA' },
  { name: 'Chole (Chickpea Curry)', region: 'North', category: 'Curry', serving_size: '1 cup (240ml)', carbs_per_serving: 35, source: 'USDA' },
  { name: 'Rajma (Kidney Beans)', region: 'North', category: 'Curry', serving_size: '1 cup (240ml)', carbs_per_serving: 40, source: 'USDA' },
  { name: 'Moong Dal Soup', region: 'North', category: 'Curry', serving_size: '1 cup (240ml)', carbs_per_serving: 28, source: 'USDA' },

  // Breakfast Items
  { name: 'Upma (Semolina)', region: 'South', category: 'Breakfast', serving_size: '1 cup (150g)', carbs_per_serving: 32, source: 'USDA' },
  { name: 'Pesarattu', region: 'South', category: 'Breakfast', serving_size: '1 crepe (80g)', carbs_per_serving: 15, source: 'USDA' },
  { name: 'Puri (Fried Bread)', region: 'North', category: 'Bread', serving_size: '2 puris (60g)', carbs_per_serving: 22, source: 'USDA' },
  { name: 'Halwa (Semolina)', region: 'North', category: 'Dessert', serving_size: '1 cup (150g)', carbs_per_serving: 50, source: 'USDA' },

  // Additional Regional
  { name: 'Chaat (Papri)', region: 'North', category: 'Snack', serving_size: '1 cup (100g)', carbs_per_serving: 28, source: 'USDA' },
  { name: 'Gup Chup (Pani Puri)', region: 'North', category: 'Snack', serving_size: '5 pieces (80g)', carbs_per_serving: 22, source: 'USDA' },
  { name: 'Jalebi', region: 'North', category: 'Dessert', serving_size: '4 pieces (100g)', carbs_per_serving: 65, source: 'USDA' },
  { name: 'Gulab Jamun', region: 'North', category: 'Dessert', serving_size: '2 pieces (80g)', carbs_per_serving: 48, source: 'USDA' },
  { name: 'Barfi (Milk Fudge)', region: 'North', category: 'Dessert', serving_size: '1 piece (30g)', carbs_per_serving: 22, source: 'USDA' },

  // Vegetables (Cooked)
  { name: 'Bhindi Fry', region: 'North', category: 'Curry', serving_size: '1 cup (150g)', carbs_per_serving: 12, source: 'USDA' },
  { name: 'Baingan Bharta', region: 'East', category: 'Curry', serving_size: '1 cup (150g)', carbs_per_serving: 10, source: 'USDA' },
  { name: 'Spinach Curry', region: 'North', category: 'Curry', serving_size: '1 cup (150g)', carbs_per_serving: 8, source: 'USDA' },
  { name: 'Mixed Vegetable Curry', region: 'North', category: 'Curry', serving_size: '1 cup (200g)', carbs_per_serving: 18, source: 'USDA' },

  // Meat Curries
  { name: 'Chicken Tikka', region: 'North', category: 'Curry', serving_size: '4 pieces (150g)', carbs_per_serving: 3, source: 'USDA' },
  { name: 'Mutton Curry', region: 'North', category: 'Curry', serving_size: '1 cup (240ml)', carbs_per_serving: 5, source: 'USDA' },
  { name: 'Nihari (Meat Stew)', region: 'North', category: 'Curry', serving_size: '1 cup (240ml)', carbs_per_serving: 8, source: 'USDA' },
  { name: 'Fish Curry', region: 'South', category: 'Curry', serving_size: '1 cup (240ml)', carbs_per_serving: 6, source: 'USDA' },
  { name: 'Tandoori Chicken', region: 'North', category: 'Curry', serving_size: '1/4 chicken (150g)', carbs_per_serving: 2, source: 'USDA' }
];

async function seedIndianFoods() {
  const connection = await pool.getConnection();
  try {
    for (const food of indianFoods) {
      const query = `
        INSERT INTO indian_foods (name, region, category, serving_size, carbs_per_serving, source)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      await connection.execute(query, [
        food.name,
        food.region,
        food.category,
        food.serving_size,
        food.carbs_per_serving,
        food.source
      ]);
    }
    console.log(`✓ Seeded ${indianFoods.length} Indian foods`);
  } catch (err) {
    console.error('✗ Seed failed:', err.message);
  } finally {
    connection.release();
  }
}

module.exports = seedIndianFoods;
