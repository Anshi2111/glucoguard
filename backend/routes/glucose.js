const express = require('express');
const { verifyToken } = require('../middleware/auth');
const Glucose = require('../models/Glucose');

const router = express.Router();

// POST /api/glucose - Add glucose reading
router.post('/', verifyToken, async (req, res) => {
  try {
    const { value, unit, timestamp, notes } = req.body;

    if (!value || !timestamp) {
      return res.status(400).json({ error: 'Value and timestamp are required' });
    }

    const glucose = await Glucose.create(req.userId, value, unit || 'mg/dL', timestamp, notes || null);
    res.status(201).json({
      id: glucose.id,
      value: glucose.value,
      unit: glucose.unit,
      timestamp: glucose.timestamp,
      notes: glucose.notes
    });
  } catch (err) {
    console.error('Add glucose error:', err.message);
    res.status(500).json({ error: 'Failed to add glucose reading' });
  }
});

// GET /api/glucose - Get user's glucose readings
router.get('/', verifyToken, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    let readings;
    if (days > 0) {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      readings = await Glucose.findByUserIdAndDateRange(req.userId, startDate.toISOString(), endDate.toISOString());
    } else {
      readings = await Glucose.findByUserId(req.userId, limit);
    }

    // Format response
    const formatted = readings.map(r => ({
      id: r.id,
      value: r.value,
      unit: r.unit,
      timestamp: r.timestamp,
      notes: r.notes,
      createdAt: r.created_at
    }));

    res.json({ readings: formatted });
  } catch (err) {
    console.error('Get glucose error:', err.message);
    res.status(500).json({ error: 'Failed to get glucose readings' });
  }
});

// DELETE /api/glucose/:id - Delete glucose reading
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const result = await Glucose.deleteById(req.params.id, req.userId);
    if (!result) {
      return res.status(404).json({ error: 'Glucose reading not found' });
    }
    res.json({ message: 'Glucose reading deleted', id: req.params.id });
  } catch (err) {
    console.error('Delete glucose error:', err.message);
    res.status(500).json({ error: 'Failed to delete glucose reading' });
  }
});

module.exports = router;
