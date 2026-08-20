const express = require('express');
const { verifyToken } = require('../middleware/auth');
const Insulin = require('../models/Insulin');

const router = express.Router();

// POST /api/insulin - Add insulin record
router.post('/', verifyToken, async (req, res) => {
  try {
    const { type, dose, timestamp, notes } = req.body;

    if (!type || !dose || !timestamp) {
      return res.status(400).json({ error: 'Type, dose, and timestamp are required' });
    }

    const insulin = await Insulin.create(req.userId, type, dose, timestamp, notes || null);
    res.status(201).json({
      id: insulin.id,
      type: insulin.type,
      dose: insulin.dose,
      timestamp: insulin.timestamp,
      notes: insulin.notes
    });
  } catch (err) {
    console.error('Add insulin error:', err.message);
    res.status(500).json({ error: 'Failed to add insulin record' });
  }
});

// GET /api/insulin - Get user's insulin history
router.get('/', verifyToken, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    let history;
    if (days > 0) {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      history = await Insulin.findByUserIdAndDateRange(req.userId, startDate.toISOString(), endDate.toISOString());
    } else {
      history = await Insulin.findByUserId(req.userId, limit);
    }

    // Format response
    const formatted = history.map(h => ({
      id: h.id,
      type: h.type,
      dose: h.dose,
      timestamp: h.timestamp,
      notes: h.notes,
      createdAt: h.created_at
    }));

    res.json({ history: formatted });
  } catch (err) {
    console.error('Get insulin error:', err.message);
    res.status(500).json({ error: 'Failed to get insulin history' });
  }
});

// DELETE /api/insulin/:id - Delete insulin record
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const result = await Insulin.deleteById(req.params.id, req.userId);
    if (!result) {
      return res.status(404).json({ error: 'Insulin record not found' });
    }
    res.json({ message: 'Insulin record deleted', id: req.params.id });
  } catch (err) {
    console.error('Delete insulin error:', err.message);
    res.status(500).json({ error: 'Failed to delete insulin record' });
  }
});

module.exports = router;
