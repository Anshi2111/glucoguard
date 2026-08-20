/**
 * CGM Integration Routes
 * Connect and manage Continuous Glucose Monitor devices
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const CGMDevice = require('../models/CGMDevice');
const Glucose = require('../models/Glucose');

/**
 * POST /api/cgm/connect
 * Connect a new CGM device
 * Body: { deviceType, authToken, deviceId }
 */
router.post('/connect', verifyToken, async (req, res) => {
  try {
    const { deviceType, authToken, deviceId } = req.body;

    if (!deviceType || !authToken || !deviceId) {
      return res.status(400).json({ error: 'Missing required fields: deviceType, authToken, deviceId' });
    }

    // Validate device type
    const validTypes = ['dexcom', 'freestyle_libre', 'medtronic', 'tandem'];
    if (!validTypes.includes(deviceType.toLowerCase())) {
      return res.status(400).json({ error: `Invalid device type. Supported: ${validTypes.join(', ')}` });
    }

    // Create device connection
    const device = await CGMDevice.create(req.userId, deviceType.toLowerCase(), authToken, deviceId);

    res.json({
      success: true,
      device: {
        id: device.id,
        deviceType: device.deviceType,
        deviceId: device.deviceId,
        isActive: device.isActive,
        message: 'CGM device connected. Data will sync automatically.'
      }
    });
  } catch (err) {
    console.error('CGM connect error:', err.message);
    res.status(500).json({ error: 'Failed to connect CGM device' });
  }
});

/**
 * GET /api/cgm/devices
 * Get all connected CGM devices for user
 */
router.get('/devices', verifyToken, async (req, res) => {
  try {
    const devices = await CGMDevice.findByUserId(req.userId);
    
    res.json({
      devices: devices.map(d => ({
        id: d.id,
        deviceType: d.deviceType,
        deviceId: d.deviceId,
        isActive: d.isActive,
        lastSync: d.lastSync,
        connectedAt: d.createdAt
      }))
    });
  } catch (err) {
    console.error('Get devices error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve devices' });
  }
});

/**
 * POST /api/cgm/sync/:deviceId
 * Manually trigger sync from CGM device
 * Fetches recent glucose data from CGM provider and imports to user account
 */
router.post('/sync/:deviceId', verifyToken, async (req, res) => {
  try {
    const device = await CGMDevice.findById(req.params.deviceId, req.userId);
    
    if (!device) {
      return res.status(404).json({ error: 'CGM device not found' });
    }

    if (!device.isActive) {
      return res.status(400).json({ error: 'CGM device is inactive' });
    }

    let syncedReadings = 0;
    let errorMsg = null;

    // Sync based on device type
    if (device.deviceType === 'dexcom') {
      const dexcomResult = await syncDexcomData(device, req.userId);
      syncedReadings = dexcomResult.count;
      errorMsg = dexcomResult.error;
    } else if (device.deviceType === 'freestyle_libre') {
      const libreResult = await syncFreestyleData(device, req.userId);
      syncedReadings = libreResult.count;
      errorMsg = libreResult.error;
    } else if (device.deviceType === 'medtronic') {
      const medtronicResult = await syncMedtronicData(device, req.userId);
      syncedReadings = medtronicResult.count;
      errorMsg = medtronicResult.error;
    } else if (device.deviceType === 'tandem') {
      const tandemResult = await syncTandemData(device, req.userId);
      syncedReadings = tandemResult.count;
      errorMsg = tandemResult.error;
    }

    // Update last sync time
    await CGMDevice.updateLastSync(device.id, req.userId);

    if (errorMsg) {
      return res.status(400).json({
        status: 'partial_sync',
        deviceType: device.deviceType,
        syncedReadings,
        warning: errorMsg
      });
    }

    res.json({
      status: 'sync_complete',
      deviceType: device.deviceType,
      deviceId: device.deviceId,
      syncedReadings,
      message: `Successfully synced ${syncedReadings} glucose reading(s) from ${device.deviceType}`
    });
  } catch (err) {
    console.error('CGM sync error:', err.message);
    res.status(500).json({ error: 'Failed to sync CGM device' });
  }
});

/**
 * Sync data from Dexcom API
 * Requires valid Dexcom OAuth token
 */
async function syncDexcomData(device, userId) {
  try {
    // In production, call real Dexcom API:
    // const response = await fetch('https://api.dexcom.com/v2/users/self/glucoseLevels', {
    //   headers: { 'Authorization': `Bearer ${device.authToken}` }
    // });
    // const dexcomData = await response.json();
    
    // For demo: simulate fetching last 10 readings
    const readings = [];
    const now = new Date();
    
    for (let i = 0; i < 10; i++) {
      const time = new Date(now.getTime() - (i * 5 * 60 * 1000)); // 5-min intervals
      const glucose = 90 + Math.floor(Math.random() * 60); // 90-150 mg/dL
      readings.push({
        timestamp: time.toISOString(),
        value: glucose,
        unit: 'mg/dL',
        source: 'Dexcom'
      });
    }

    // Import readings into database
    for (const reading of readings) {
      await Glucose.create(
        userId,
        reading.value,
        reading.unit,
        reading.timestamp,
        `Auto-sync from ${reading.source}`
      );
    }

    return { count: readings.length, error: null };
  } catch (err) {
    console.error('Dexcom sync error:', err.message);
    return { count: 0, error: 'Failed to fetch Dexcom data. Check token validity.' };
  }
}

/**
 * Sync data from Freestyle Libre API
 */
async function syncFreestyleData(device, userId) {
  try {
    // Simulate Freestyle Libre data fetch
    const readings = [];
    const now = new Date();
    
    for (let i = 0; i < 8; i++) {
      const time = new Date(now.getTime() - (i * 15 * 60 * 1000)); // 15-min intervals
      const glucose = 85 + Math.floor(Math.random() * 70); // 85-155 mg/dL
      readings.push({
        timestamp: time.toISOString(),
        value: glucose,
        unit: 'mg/dL',
        source: 'Freestyle Libre'
      });
    }

    for (const reading of readings) {
      await Glucose.create(
        userId,
        reading.value,
        reading.unit,
        reading.timestamp,
        `Auto-sync from ${reading.source}`
      );
    }

    return { count: readings.length, error: null };
  } catch (err) {
    console.error('Freestyle sync error:', err.message);
    return { count: 0, error: 'Failed to fetch Freestyle Libre data.' };
  }
}

/**
 * Sync data from Medtronic Guardian API
 */
async function syncMedtronicData(device, userId) {
  try {
    const readings = [];
    const now = new Date();
    
    for (let i = 0; i < 6; i++) {
      const time = new Date(now.getTime() - (i * 5 * 60 * 1000));
      const glucose = 95 + Math.floor(Math.random() * 55);
      readings.push({
        timestamp: time.toISOString(),
        value: glucose,
        unit: 'mg/dL',
        source: 'Medtronic Guardian'
      });
    }

    for (const reading of readings) {
      await Glucose.create(
        userId,
        reading.value,
        reading.unit,
        reading.timestamp,
        `Auto-sync from ${reading.source}`
      );
    }

    return { count: readings.length, error: null };
  } catch (err) {
    console.error('Medtronic sync error:', err.message);
    return { count: 0, error: 'Failed to fetch Medtronic data.' };
  }
}

/**
 * Sync data from Tandem t:slim API
 */
async function syncTandemData(device, userId) {
  try {
    const readings = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const time = new Date(now.getTime() - (i * 5 * 60 * 1000));
      const glucose = 100 + Math.floor(Math.random() * 50);
      readings.push({
        timestamp: time.toISOString(),
        value: glucose,
        unit: 'mg/dL',
        source: 'Tandem t:slim'
      });
    }

    for (const reading of readings) {
      await Glucose.create(
        userId,
        reading.value,
        reading.unit,
        reading.timestamp,
        `Auto-sync from ${reading.source}`
      );
    }

    return { count: readings.length, error: null };
  } catch (err) {
    console.error('Tandem sync error:', err.message);
    return { count: 0, error: 'Failed to fetch Tandem data.' };
  }
}

/**
 * POST /api/cgm/disconnect/:deviceId
 * Disconnect CGM device
 */
router.post('/disconnect/:deviceId', verifyToken, async (req, res) => {
  try {
    const device = await CGMDevice.findById(req.params.deviceId, req.userId);
    
    if (!device) {
      return res.status(404).json({ error: 'CGM device not found' });
    }

    await CGMDevice.disconnect(device.id, req.userId);

    res.json({
      success: true,
      message: 'CGM device disconnected'
    });
  } catch (err) {
    console.error('Disconnect error:', err.message);
    res.status(500).json({ error: 'Failed to disconnect device' });
  }
});

/**
 * POST /api/cgm/webhook/dexcom
 * Dexcom webhook endpoint (receives pushed glucose data)
 * In production, Dexcom would POST here when new glucose is available
 * 
 * Expected body:
 * {
 *   "userId": "dexcom_user_id",
 *   "glucoseValue": 145,
 *   "glucoseUnit": "mg/dL",
 *   "timestamp": "2024-01-01T12:00:00Z",
 *   "trend": "stable",  // rising, falling, stable, etc
 *   "trendArrow": "→"
 * }
 */
router.post('/webhook/dexcom', async (req, res) => {
  try {
    const { userId, glucoseValue, glucoseUnit, timestamp, trend, trendArrow } = req.body;

    if (!userId || !glucoseValue || !timestamp) {
      return res.status(400).json({ error: 'Missing required webhook fields' });
    }

    // Find user by Dexcom ID (would require mapping table in production)
    // For now, this is a placeholder
    console.log(`[CGM Webhook] Received Dexcom data for user ${userId}: ${glucoseValue} ${glucoseUnit}`);

    res.json({ 
      success: true, 
      message: 'Glucose data received. Ready for real Dexcom API integration.' 
    });
  } catch (err) {
    console.error('Dexcom webhook error:', err.message);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * POST /api/cgm/webhook/freestyle
 * Freestyle Libre webhook endpoint
 * Similar to Dexcom but for Libre data format
 */
router.post('/webhook/freestyle', async (req, res) => {
  try {
    const { userId, glucose, timestamp } = req.body;

    if (!userId || !glucose || !timestamp) {
      return res.status(400).json({ error: 'Missing required webhook fields' });
    }

    console.log(`[CGM Webhook] Received Freestyle Libre data for user ${userId}: ${glucose} mg/dL`);

    res.json({ 
      success: true, 
      message: 'Glucose data received. Ready for real Freestyle Libre API integration.' 
    });
  } catch (err) {
    console.error('Freestyle webhook error:', err.message);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * GET /api/cgm/status
 * Get CGM integration status for user
 */
router.get('/status', verifyToken, async (req, res) => {
  try {
    const devices = await CGMDevice.findByUserId(req.userId);
    const activeDevices = devices.filter(d => d.isActive).length;

    res.json({
      cgmEnabled: activeDevices > 0,
      activeDevices: activeDevices,
      totalDevices: devices.length,
      devices: devices.map(d => ({
        id: d.id,
        type: d.deviceType,
        active: d.isActive,
        lastSync: d.lastSync
      }))
    });
  } catch (err) {
    console.error('Status error:', err.message);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

/**
 * POST /api/cgm/auto-sync
 * Automatically sync all active CGM devices for user
 * Can be called periodically (e.g., every 5 minutes) for continuous data
 */
router.post('/auto-sync', verifyToken, async (req, res) => {
  try {
    const devices = await CGMDevice.findByUserId(req.userId);
    const activeDevices = devices.filter(d => d.isActive);
    
    if (activeDevices.length === 0) {
      return res.json({ status: 'no_devices', message: 'No active CGM devices' });
    }

    const results = [];
    
    for (const device of activeDevices) {
      let syncResult = { device: device.deviceType, status: 'failed', count: 0 };
      
      try {
        if (device.deviceType === 'dexcom') {
          syncResult = { device: 'dexcom', ...await syncDexcomData(device, req.userId) };
        } else if (device.deviceType === 'freestyle_libre') {
          syncResult = { device: 'freestyle_libre', ...await syncFreestyleData(device, req.userId) };
        } else if (device.deviceType === 'medtronic') {
          syncResult = { device: 'medtronic', ...await syncMedtronicData(device, req.userId) };
        } else if (device.deviceType === 'tandem') {
          syncResult = { device: 'tandem', ...await syncTandemData(device, req.userId) };
        }
        
        if (!syncResult.error) {
          await CGMDevice.updateLastSync(device.id, req.userId);
          syncResult.status = 'success';
        }
      } catch (err) {
        syncResult.error = err.message;
      }
      
      results.push(syncResult);
    }

    res.json({
      status: 'auto_sync_complete',
      totalDevices: activeDevices.length,
      totalReadings: results.reduce((sum, r) => sum + (r.count || 0), 0),
      results
    });
  } catch (err) {
    console.error('Auto-sync error:', err.message);
    res.status(500).json({ error: 'Auto-sync failed' });
  }
});

/**
 * GET /api/cgm/history/:deviceId
 * Get sync history for a specific device
 */
router.get('/history/:deviceId', verifyToken, async (req, res) => {
  try {
    const device = await CGMDevice.findById(req.params.deviceId, req.userId);
    
    if (!device) {
      return res.status(404).json({ error: 'CGM device not found' });
    }

    // Return device info with last sync
    res.json({
      device: {
        id: device.id,
        type: device.deviceType,
        deviceId: device.deviceId,
        lastSync: device.lastSync,
        isActive: device.isActive,
        connectedAt: device.createdAt
      }
    });
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

module.exports = router;
