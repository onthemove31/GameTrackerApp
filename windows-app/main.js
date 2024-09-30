const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const { Client } = require('pg');
const dotenv = require('dotenv');
const insights = require('./insights');

// Load environment variables
dotenv.config();

// Initialize the PostgreSQL client
const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Connect to the database
client.connect();

// Create the database structure if it doesn't exist
async function initializeDatabase() {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        name TEXT,
        exe_path TEXT
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        game_id INTEGER,
        game_name TEXT,
        exe_path TEXT,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        duration INTEGER
      )
    `);
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
}

initializeDatabase();

// Function to log the start of a game session
async function logGameStart(gameId) {
  const startTime = new Date().toISOString();

  try {
    // Get game details (name and exe_path) from the games table
    const gameResult = await client.query("SELECT * FROM games WHERE id = $1", [gameId]);
    const game = gameResult.rows[0];

    if (!game) {
      console.error(`No game found with id: ${gameId}`);
      return;
    }

    // Check if there is already an open session (end_time is NULL) for this game
    const sessionResult = await client.query("SELECT * FROM sessions WHERE game_id = $1 AND end_time IS NULL", [gameId]);

    // If there is no open session, create a new one with game details
    if (sessionResult.rows.length === 0) {
      const insertResult = await client.query(
        `INSERT INTO sessions (game_id, game_name, exe_path, start_time) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (id) DO NOTHING 
         RETURNING id`,
        [game.id, game.name, game.exe_path, startTime]
      );
      
      if (insertResult.rows.length > 0) {
        console.log(`Game session started and logged with ID: ${insertResult.rows[0].id}`);
      } else {
        console.log("Failed to insert new session. It may already exist.");
      }
    } else {
      console.log("A session for this game is already running.");
    }
  } catch (err) {
    console.error("Error logging game start:", err);
    console.error("Error details:", err.stack);
  }
}

// Function to log the end of a game session
async function logGameStart(gameId) {
  const startTime = new Date().toISOString();

  try {
    // Get game details (name and exe_path) from the games table
    const gameResult = await client.query("SELECT * FROM games WHERE id = $1", [gameId]);
    const game = gameResult.rows[0];

    if (!game) {
      console.error(`No game found with id: ${gameId}`);
      return;
    }

    // Check if there is already an open session (end_time is NULL) for this game
    const sessionResult = await client.query("SELECT * FROM sessions WHERE game_id = $1 AND end_time IS NULL", [gameId]);

    // If there is no open session, create a new one with game details
    if (sessionResult.rows.length === 0) {
      const insertResult = await client.query(
        `INSERT INTO sessions (game_id, game_name, exe_path, start_time) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (id) DO UPDATE 
         SET game_id = EXCLUDED.game_id, 
             game_name = EXCLUDED.game_name, 
             exe_path = EXCLUDED.exe_path, 
             start_time = EXCLUDED.start_time
         RETURNING id`,
        [game.id, game.name, game.exe_path, startTime]
      );
      
      console.log(`Game session started and logged with ID: ${insertResult.rows[0].id}`);
    } else {
      console.log("A session for this game is already running.");
    }
  } catch (err) {
    console.error("Error logging game start:", err);
    console.error("Error details:", err.stack);
  }
}

async function logGameEnd(gameId) {
  const endTime = new Date().toISOString();

  try {
    // Find the open session for this game
    const sessionResult = await client.query(
      "SELECT * FROM sessions WHERE game_id = $1 AND end_time IS NULL",
      [gameId]
    );

    if (sessionResult.rows.length === 0) {
      console.log(`No open session found for game with id: ${gameId}`);
      return;
    }

    const session = sessionResult.rows[0];

    // Calculate duration in minutes
    const startTime = new Date(session.start_time);
    const duration = Math.round((new Date(endTime) - startTime) / 60000);

    // Update the session with end time and duration
    const updateResult = await client.query(
      `UPDATE sessions 
       SET end_time = $1, duration = $2 
       WHERE id = $3 
       RETURNING id`,
      [endTime, duration, session.id]
    );

    console.log(`Game session ended and logged with ID: ${updateResult.rows[0].id}`);
  } catch (err) {
    console.error("Error logging game end:", err);
    console.error("Error details:", err.stack);
  }
}

// Function to retrieve all games from the database
async function getGames() {
  try {
    const result = await client.query("SELECT * FROM games");
    return result.rows;
  } catch (err) {
    console.error("Error fetching games from the database:", err);
    return [];
  }
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
  try {
    const psList = await import('ps-list');
    const processes = await psList.default();

    const games = await getGames();
    for (const game of games) {
      const isGameRunning = processes.some((p) => p.name.toLowerCase() === path.basename(game.exe_path).toLowerCase());

      if (isGameRunning && !gameStatus[game.id]) {
        gameStatus[game.id] = true;
        await onGameStart(game);
      } else if (!isGameRunning && gameStatus[game.id]) {
        gameStatus[game.id] = false;
        await onGameStop(game);
      }
    }
  } catch (error) {
    console.error("Error in checkForRunningGames:", error);
  }
}

// Set an interval to check for running games every 5 seconds
setInterval(checkForRunningGames, 5000);

let mainWindow;
let gameStatus = {};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    icon: path.join(__dirname, 'assets', 'icons', 'app-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

// Handle the 'get-insights' event from the renderer
ipcMain.handle('get-insights', async (event) => {
  try {
    const sessionData = await insights.loadSessionData();
    const calculatedInsights = insights.calculateInsights(sessionData);
    const feedback = insights.createFeedback(calculatedInsights);
    return feedback;
  } catch (error) {
    console.error("Error getting insights:", error);
    throw error;
  }
});

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
ipcMain.on('add-game', async (event, game) => {
  try {
    // Ensure the query does not include the id column
    await client.query("INSERT INTO games (name, exe_path) VALUES ($1, $2)", [game.name, game.exePath]);
    console.log(`Game added: ${game.name}`);
  } catch (err) {
    console.error("Error adding game:", err);
    event.reply('add-game-response', { success: false, error: err.message });
  }
});

// Function to get all games from the database
ipcMain.handle('get-games', async () => {
  try {
    const result = await client.query("SELECT * FROM games");
    return result.rows;
  } catch (err) {
    console.error("Error fetching games:", err);
    throw err;
  }
});

// Function to retrieve session history
ipcMain.handle('get-session-history', async (event, { gameName, startDate, endDate }) => {
  try {
    let query = `
      SELECT game_name, start_time, end_time, duration
      FROM sessions
      WHERE 1=1
    `;
    const params = [];

    if (gameName) {
      query += ` AND game_name LIKE $${params.length + 1}`;
      params.push(`%${gameName}%`);
    }
    if (startDate) {
      query += ` AND date(start_time) >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND date(start_time) <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY start_time DESC`;

    const result = await client.query(query, params);
    return result.rows.map(row => ({
      ...row,
      duration: row.duration !== null ? Number(row.duration) : null
    }));
  } catch (err) {
    console.error("Error fetching session history:", err);
    throw err;
  }
});

// Function to retrieve total time played per game
ipcMain.handle('get-total-time-per-game', async () => {
  try {
    const query = `
      SELECT game_name, SUM(duration) as total_duration
      FROM sessions
      WHERE duration IS NOT NULL
      GROUP BY game_name
    `;
    const result = await client.query(query);
    return result.rows;
  } catch (err) {
    console.error("Error calculating total time per game:", err);
    throw err;
  }
});

async function getLastSessionDuration(gameId) {
  try {
    const query = `
      SELECT duration FROM sessions
      WHERE game_id = $1
      ORDER BY end_time DESC
      LIMIT 1
    `;
    const result = await client.query(query, [gameId]);
    return result.rows[0] ? result.rows[0].duration : 0;
  } catch (err) {
    console.error("Error fetching last session duration:", err);
    return 0;
  }
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
  console.log('Game Started:', game);
  const now = new Date();
  await logGameStart(game.id, game.name);
  startLiveSessionTimer(game.id, now);
  
  mainWindow.webContents.send('game-status-update', {
    gameId: game.id,
    gameName: game.name,
    status: 'Running',
    lastSessionDuration: await getLastSessionDuration(game.id)
  });
}

async function onGameStop(game) {
  console.log('Game Stopped:', game);
  await logGameEnd(game.id); 
  stopLiveSessionTimer(game.id);
  
  mainWindow.webContents.send('game-status-update', {
    gameId: game.id,
    gameName: game.name,
    status: 'Stopped',
    lastSessionDuration: await getLastSessionDuration(game.id)
  });
}

ipcMain.handle('get-unique-game-names', async () => {
  try {
    const query = `
      SELECT DISTINCT game_name FROM sessions
      ORDER BY game_name
    `;
    const result = await client.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error fetching unique game names:', err);
    throw err;
  }
});

// Queries for Statistics

function addFiltersToQuery(query, filters = {}) {
  const conditions = [];
  const params = [];

  console.log('Adding filters:', JSON.stringify(filters, null, 2));

  if (filters.gameName && filters.gameName !== '') {
    conditions.push('game_name = $' + (params.length + 1));
    params.push(filters.gameName);
  }
  if (filters.startDate && filters.startDate !== '') {
    conditions.push('date(start_time) >= date($' + (params.length + 1) + ')');
    params.push(filters.startDate);
  }
  if (filters.endDate && filters.endDate !== '') {
    conditions.push('date(start_time) <= date($' + (params.length + 1) + ')');
    params.push(filters.endDate);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  console.log('Final query before GROUP BY:', query);
  console.log('Final parameters:', params);

  return { query, params };
}

ipcMain.handle('get-total-playtime-per-game', async (event, filters) => {
  console.log('Received filters for total playtime:', JSON.stringify(filters, null, 2));
  try {
    let query = `
      SELECT game_name, SUM(duration) as total_playtime
      FROM sessions
    `;

    const { query: filteredQuery, params } = addFiltersToQuery(query, filters);
    query = filteredQuery + ' GROUP BY game_name ORDER BY total_playtime DESC';

    console.log('Total playtime query:', query);
    console.log('Query parameters:', params);

    const result = await client.query(query, params);
    console.log('Total playtime results:', result.rows);
    return result.rows;
  } catch (err) {
    console.error('Error fetching total playtime per game:', err);
    throw err;
  }
});

ipcMain.handle('get-average-session-duration-per-game', async (event, filters) => {
  console.log('Received filters for average session duration:', JSON.stringify(filters, null, 2));
  try {
    let query = `
      SELECT game_name, AVG(duration) as avg_session_duration
      FROM sessions
    `;

    const { query: filteredQuery, params } = addFiltersToQuery(query, filters);
    query = filteredQuery + ' GROUP BY game_name ORDER BY avg_session_duration DESC';

    console.log('Average session duration query:', query);
    console.log('Query parameters:', params);

    const result = await client.query(query, params);
    console.log('Average session duration results:', result.rows);
    return result.rows;
  } catch (err) {
    console.error('Error fetching average session duration per game:', err);
    throw err;
  }
});

ipcMain.handle('get-longest-play-session-per-game', async (event, filters) => {
  console.log('Received filters for longest play session:', JSON.stringify(filters, null, 2));
  try {
    let query = `
      SELECT game_name, MAX(duration) as longest_session
      FROM sessions
    `;

    const { query: filteredQuery, params } = addFiltersToQuery(query, filters);
    query = filteredQuery + ' GROUP BY game_name ORDER BY longest_session DESC';

    console.log('Longest play session query:', query);
    console.log('Query parameters:', params);

    const result = await client.query(query, params);
    console.log('Longest play session results:', result.rows);
    return result.rows;
  } catch (err) {
    console.error('Error fetching longest session per game:', err);
    throw err;
  }
});

ipcMain.handle('get-playtime-over-time', async (event, filters) => {
  console.log('Received filters for playtime over time:', JSON.stringify(filters, null, 2));
  try {
    // Create a date range for the last 30 days
    const dateRangeQuery = `
      SELECT generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day'::interval) AS play_date
    `;

    let query = `
      SELECT date(start_time) as play_date, SUM(duration) as total_playtime
      FROM sessions
    `;

    const { query: filteredQuery, params } = addFiltersToQuery(query, filters);
    query = filteredQuery + ' GROUP BY play_date';

    const result = await client.query(query, params);
    
    // Get the date range results
    const dateRangeResult = await client.query(dateRangeQuery);
    const dateRange = dateRangeResult.rows.map(row => row.play_date);

    // Combine results with date range, defaulting to 0 for missing days
    const playtimeByDate = dateRange.map(date => {
      const found = result.rows.find(row => row.play_date.toISOString().split('T')[0] === date.toISOString().split('T')[0]);
      return {
        play_date: date,
        total_playtime: found ? parseFloat(found.total_playtime) : 0
      };
    });

    console.log('Playtime over time results:', playtimeByDate);
    return playtimeByDate;
  } catch (err) {
    console.error('Error fetching playtime over time:', err);
    throw err;
  }
});

ipcMain.handle('get-sessions-per-game', async (event, filters) => {
  console.log('Received filters for sessions per game:', JSON.stringify(filters, null, 2));
  try {
    let query = `
      SELECT game_name, COUNT(*) as session_count
      FROM sessions
    `;

    const { query: filteredQuery, params } = addFiltersToQuery(query, filters);
    query = filteredQuery + ' GROUP BY game_name ORDER BY session_count DESC';

    console.log('Sessions per game query:', query);
    console.log('Query parameters:', params);

    const result = await client.query(query, params);
    console.log('Sessions per game results:', result.rows);
    return result.rows;
  } catch (err) {
    console.error('Error fetching sessions per game:', err);
    throw err;
  }
});

ipcMain.handle('get-time-played-per-day', async (event, filters) => {
  console.log('Received filters for time played per day:', JSON.stringify(filters, null, 2));
  try {
    let query = `
      SELECT start_time, SUM(duration) as total_playtime
      FROM sessions
    `;

    const { query: filteredQuery, params } = addFiltersToQuery(query, filters);
    query = filteredQuery + ' GROUP BY start_time';

    console.log('Time played per day query:', query);
    console.log('Query parameters:', params);

    const result = await client.query(query, params);
    
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const playtimeByDay = [0, 0, 0, 0, 0, 0, 0];

    result.rows.forEach(row => {
      const date = new Date(row.start_time);
      const dayIndex = date.getDay();
      playtimeByDay[dayIndex] += parseFloat(row.total_playtime);
    });

    const processedResult = playtimeByDay.map((playtime, index) => ({
      day_of_week: daysOfWeek[index],
      total_playtime: playtime
    }));

    console.log('Time played per day results:', processedResult);
    return processedResult;
  } catch (err) {
    console.error('Error fetching time played per day:', err);
    throw err;
  }
});

ipcMain.handle('get-playtime-by-time-of-day', async (event, filters) => {
  console.log('Received filters for playtime by time of day:', JSON.stringify(filters, null, 2));
  try {
    let query = `
      SELECT game_name, start_time, SUM(duration) as total_playtime
      FROM sessions
    `;

    const { query: filteredQuery, params } = addFiltersToQuery(query, filters);
    query = filteredQuery + ' GROUP BY game_name, start_time';

    console.log('Playtime by time of day query:', query);
    console.log('Query parameters:', params);

    const result = await client.query(query, params);
    
    const playtimeByTimeOfDay = {};

    result.rows.forEach(row => {
      const date = new Date(row.start_time);
      const hour = date.getHours();
      let timeOfDay;

      if (hour >= 0 && hour < 6) timeOfDay = 'Night (12AM-6AM)';
      else if (hour >= 6 && hour < 12) timeOfDay = 'Morning (6AM-12PM)';
      else if (hour >= 12 && hour < 18) timeOfDay = 'Afternoon (12PM-6PM)';
      else timeOfDay = 'Evening (6PM-12AM)';

      if (!playtimeByTimeOfDay[row.game_name]) {
        playtimeByTimeOfDay[row.game_name] = {
          'Night (12AM-6AM)': 0,
          'Morning (6AM-12PM)': 0,
          'Afternoon (12PM-6PM)': 0,
          'Evening (6PM-12AM)': 0
        };
      }

      playtimeByTimeOfDay[row.game_name][timeOfDay] += parseFloat(row.total_playtime);
    });

    const processedResult = Object.entries(playtimeByTimeOfDay).flatMap(([game_name, timesOfDay]) =>
      Object.entries(timesOfDay).map(([time_of_day, total_playtime]) => ({
        game_name,
        time_of_day,
        total_playtime
      }))
    );

    console.log('Playtime by time of day results:', processedResult);
    return processedResult;
  } catch (err) {
    console.error('Error fetching playtime by time of day:', err);
    throw err;
  }
});

// Handle the 'open-about' event from the renderer
ipcMain.on('open-about', (event) => {
  mainWindow.loadFile('about.html'); // Load the About page
});

// Close the database connection when the app is about to quit
app.on('will-quit', () => {
  client.end();
});