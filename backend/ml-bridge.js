/**
 * ML Bridge - Connects Node.js backend to Python ML model
 * Loads trained model and makes predictions
 */

const { spawn } = require('child_process');
const path = require('path');

class MLBridge {
  constructor() {
    this.modelLoaded = false;
    this.pythonScriptPath = path.join(__dirname, '../ml/model_inference_wrapper.py');
  }

  /**
   * Make prediction using trained ML model
   * Input: Features dict from database
   * Output: Risk prediction result
   */
  async predict(features) {
    return new Promise((resolve, reject) => {
      try {
        const pythonProcess = spawn('python', [this.pythonScriptPath]);

        let output = '';
        let error = '';

        // Send features as JSON to Python
        pythonProcess.stdin.write(JSON.stringify(features));
        pythonProcess.stdin.end();

        // Capture output
        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          error += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Python process failed: ${error}`));
          } else {
            try {
              const result = JSON.parse(output);
              resolve(result);
            } catch (e) {
              reject(new Error(`Failed to parse model output: ${output}`));
            }
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Check if model files exist
   */
  modelExists() {
    const fs = require('fs');
    const modelPath = path.join(__dirname, '../ml/models');
    return fs.existsSync(path.join(modelPath, 'logistic_regression_model.pkl')) &&
           fs.existsSync(path.join(modelPath, 'scaler.pkl'));
  }
}

module.exports = new MLBridge();
