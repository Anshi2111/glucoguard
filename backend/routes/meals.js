const express = require('express');
const { verifyToken } = require('../middleware/auth');
const Meal = require('../models/Meal');

const router = express.Router();

// POST /api/meals - Add meal
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, estimatedCarbs, timestamp, notes } = req.body;

    if (!name || !timestamp) {
      return res.status(400).json({ error: 'Name and timestamp are required' });
    }

    const meal = await Meal.create(req.userId, name, estimatedCarbs || 0, timestamp, notes || null, null);
    res.status(201).json({
      id: meal.id,
      name: meal.name,
      estimatedCarbs: meal.estimated_carbs,
      timestamp: meal.timestamp,
      notes: meal.notes
    });
  } catch (err) {
    console.error('Add meal error:', err.message);
    res.status(500).json({ error: 'Failed to add meal' });
  }
});

// GET /api/meals - Get user's meals
router.get('/', verifyToken, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    let meals;
    if (days > 0) {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      meals = await Meal.findByUserIdAndDateRange(req.userId, startDate.toISOString(), endDate.toISOString());
    } else {
      meals = await Meal.findByUserId(req.userId, limit);
    }

    // Format response
    const formatted = meals.map(m => ({
      id: m.id,
      name: m.name,
      estimatedCarbs: m.estimated_carbs,
      timestamp: m.timestamp,
      notes: m.notes,
      createdAt: m.created_at
    }));

    res.json({ meals: formatted });
  } catch (err) {
    console.error('Get meals error:', err.message);
    res.status(500).json({ error: 'Failed to get meals' });
  }
});

// DELETE /api/meals/:id - Delete meal
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const result = await Meal.deleteById(req.params.id, req.userId);
    if (!result) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    res.json({ message: 'Meal deleted', id: req.params.id });
  } catch (err) {
    console.error('Delete meal error:', err.message);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

module.exports = router;
