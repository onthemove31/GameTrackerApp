const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { execFile } = require('child_process');

// Initialize the SQLite database
const db = new sqlite3.Database('games.db');

// Create the database structure if it doesn't exist
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS games (id INTEGER PRIMARY KEY, name TEXT, exe_path TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY, game_id INTEGER, game_name TEXT, exe_path TEXT, start_time TEXT, end_time TEXT, duration INTEGER)");
});

// Function to log the start of a game session
function logGameStart(gameId) {
  const startTime = new Date().toISOString();

  // Get game details (name and exe_path) from the games table
  db.get("SELECT * FROM games WHERE id = ?", [gameId], (err, game) => {
    if (err) {
      console.error("Error querying the game:", err);
      return;
    }

    // Check if there is already an open session (end_time is NULL) for this game
    db.get("SELECT * FROM sessions WHERE game_id = ? AND end_time IS NULL", [gameId], (err, row) => {
      if (err) {
        console.error("Error querying the database:", err);
        return;
      }

      // If there is no open session, create a new one with game details
      if (!row) {
        const stmt = db.prepare("INSERT INTO sessions (game_id, game_name, exe_path, start_time) VALUES (?, ?, ?, ?)");
        stmt.run(game.id, game.name, game.exe_path, startTime);
        stmt.finalize();
        console.log(`Game started at ${startTime} for ${game.name}`);
      } else {
        console.log("A session for this game is already running.");
      }
    });
  });
}

// Function to log the end of a game session
function logGameEnd(gameId) {
  const endTime = new Date().toISOString();

  // Get the start_time to calculate the duration
  db.get("SELECT * FROM sessions WHERE game_id = ? AND end_time IS NULL", [gameId], (err, row) => {
    if (err) {
      console.error("Error querying the session:", err);
      return;
    }

    if (row) {
      const startTime = new Date(row.start_time);
      const endTimeObj = new Date(endTime);

      // Calculate the duration in minutes
      const duration = Math.floor((endTimeObj - startTime) / (1000 * 60)); // Convert milliseconds to minutes

      // Update the session to set the end time and duration
      const stmt = db.prepare("UPDATE sessions SET end_time = ?, duration = ? WHERE game_id = ? AND end_time IS NULL");
      stmt.run(endTime, duration, gameId, (err) => {
        if (err) {
          console.error("Error updating session with duration:", err);
        } else {
          console.log(`Game stopped at ${endTime}. Duration: ${duration} minutes.`);
        }
      });
      stmt.finalize();
    }
  });
}

// Function to retrieve all games from the database
function getGames(callback) {
  db.all("SELECT * FROM games", (err, rows) => {
    if (err) {
      console.error("Error fetching games from the database:", err);
      return;
    }
    callback(rows);
  });
}

// Handle starting the game via button click
ipcMain.on('start-game', (event, game) => {
  execFile(game.exe_path, (err) => {
    if (err) {
      console.error(`Error launching ${game.name}:`, err);
    } else {
      console.log(`${game.name} has started`);
      event.sender.send('game-status-update', { gameId: game.id, status: 'Running' });
    }
  });
});

// Function to check if any games are running
async function checkForRunningGames() {
  const psList = await import('ps-list'); // Dynamic import for ps-list
  const processes = await psList.default(); // Access the default export

  getGames((games) => {
    games.forEach(async (game) => {
      const isGameRunning = processes.some((p) => p.name.toLowerCase() === path.basename(game.exe_path).toLowerCase());

      if (isGameRunning && !gameStatus[game.id]) {
        gameStatus[game.id] = true;
        await onGameStart(game);
      } else if (!isGameRunning && gameStatus[game.id]) {
        gameStatus[game.id] = false;
        await onGameStop(game);
      }
    });
  });
}

// Set an interval to check for running games every 5 seconds
setInterval(checkForRunningGames, 5000);

let mainWindow;
let gameStatus = {};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle file dialog for browsing executables
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Executables', extensions: ['exe'] }]
  });
  return result;
});

// Function to add a game to the database
ipcMain.on('add-game', (event, game) => {
  const stmt = db.prepare("INSERT INTO games (name, exe_path) VALUES (?, ?)");
  stmt.run(game.name, game.exePath);
  stmt.finalize();
});

// Function to get all games from the database
ipcMain.handle('get-games', async () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM games", (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

// Function to retrieve session history
ipcMain.handle('get-session-history', async (event, { gameName, startDate, endDate }) => {
  return new Promise((resolve, reject) => {
    // Prepare the base query
    let query = `
      SELECT game_name, start_time, end_time, duration
      FROM sessions
      WHERE 1=1
    `;

    const params = [];

    // Apply game name filter if provided
    if (gameName) {
      query += ` AND game_name LIKE ?`;
      params.push(`%${gameName}%`);
    }

    // Apply start date filter if provided
    if (startDate) {
      query += ` AND date(start_time) >= ?`;
      params.push(startDate);
    }

    // Apply end date filter if provided
    if (endDate) {
      query += ` AND date(start_time) <= ?`;
      params.push(endDate);
    }

    // Order by start time in descending order
    query += ` ORDER BY start_time DESC`;

    // Execute the query
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error("Error fetching session history:", err);
        reject(err);
      } else {
        const processedRows = rows.map(row => ({
          ...row,
          duration: row.duration !== null ? Number(row.duration) : null
        }));
        resolve(rows);
      }
    });
  });
});

// Function to retrieve total time played per game
ipcMain.handle('get-total-time-per-game', async () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT game_name, SUM(duration) as total_duration
      FROM sessions
      WHERE duration IS NOT NULL
      GROUP BY game_name
    `;
    db.all(query, (err, rows) => {
      if (err) {
        console.error("Error calculating total time per game:", err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

function getLastSessionDuration(gameId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT duration FROM sessions
      WHERE game_id = ?
      ORDER BY end_time DESC
      LIMIT 1
    `;
    db.get(query, [gameId], (err, row) => {
      if (err) {
        console.error("Error fetching last session duration:", err);
        reject(err);
      } else {
        resolve(row ? row.duration : 0);  // Return 0 if there's no previous session
      }
    });
  });
}

let liveSessionTimers = {};

function startLiveSessionTimer(gameId, startTime) {
  liveSessionTimers[gameId] = setInterval(() => {
    const now = new Date();
    const elapsedTime = Math.floor((now - startTime) / 1000);  // Elapsed time in seconds
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    mainWindow.webContents.send('update-live-time', {
      gameId,
      time: `${minutes}m ${seconds}s`
    });
  }, 1000);  // Update every second
}

function stopLiveSessionTimer(gameId) {
  clearInterval(liveSessionTimers[gameId]);
}

async function onGameStart(game) {
  console.log('Game Started:', game);  // Add this to check the game object
  const now = new Date();
  logGameStart(game.id, game.name);
  startLiveSessionTimer(game.id, now);
  
  mainWindow.webContents.send('game-status-update', {
    gameId: game.id,
    gameName: game.name,
    status: 'Running',
    lastSessionDuration: await getLastSessionDuration(game.id)
  });
}

async function onGameStop(game) {
  console.log('Game Stopped:', game);  // Add this to check the game object
  logGameEnd(game.id); 
  stopLiveSessionTimer(game.id);
  
  mainWindow.webContents.send('game-status-update', {
    gameId: game.id,
    gameName: game.name,
    status: 'Stopped',
    lastSessionDuration: await getLastSessionDuration(game.id)
  });
}

ipcMain.handle('get-unique-game-names', async () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT DISTINCT game_name FROM sessions
      ORDER BY game_name
    `;
    
    db.all(query, (err, rows) => {
      if (err) {
        console.error('Error fetching unique game names:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});