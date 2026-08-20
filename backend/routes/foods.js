const express = require('express');
const IndianFood = require('../models/IndianFood');

const router = express.Router();

// GET /api/foods - List all foods with optional search/filter
router.get('/', async (req, res) => {
  try {
    const search = req.query.search;
    const region = req.query.region;
    const category = req.query.category;
    const limit = Math.min(Math.max(1, parseInt(req.query.limit || '50')), 100);

    let foods = [];

    if (search && String(search).trim().length > 0) {
      foods = await IndianFood.search(String(search), parseInt(limit));
    } else if (region && String(region).trim().length > 0) {
      foods = await IndianFood.findByRegion(String(region), parseInt(limit));
    } else if (category && String(category).trim().length > 0) {
      foods = await IndianFood.findByCategory(String(category), parseInt(limit));
    } else {
      foods = await IndianFood.findAll(parseInt(limit));
    }

    res.json({
      count: foods.length,
      foods: foods.map(f => ({
        id: f.id,
        name: f.name,
        region: f.region,
        category: f.category,
        servingSize: f.serving_size,
        carbsPerServing: f.carbs_per_serving,
        source: f.source
      }))
    });
  } catch (err) {
    console.error('List foods error:', err.message);
    res.status(500).json({ error: 'Failed to list foods' });
  }
});

// GET /api/foods/:id - Get single food details
router.get('/:id', async (req, res) => {
  try {
    const food = await IndianFood.findById(req.params.id);
    if (!food) {
      return res.status(404).json({ error: 'Food not found' });
    }

    res.json({
      id: food.id,
      name: food.name,
      region: food.region,
      category: food.category,
      servingSize: food.serving_size,
      carbsPerServing: food.carbs_per_serving,
      source: food.source
    });
  } catch (err) {
    console.error('Get food error:', err.message);
    res.status(500).json({ error: 'Failed to get food' });
  }
});

module.exports = router;
