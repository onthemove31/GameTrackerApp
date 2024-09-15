const path = require('path');

// Example of how to load the preload script correctly
mainWindow = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    preload: path.join(__dirname, 'renderer.js'), // Ensure correct path using __dirname
    nodeIntegration: false,
    contextIsolation: true
  }
});

// Correctly load the index.html
mainWindow.loadFile(path.join(__dirname, 'index.html'));
