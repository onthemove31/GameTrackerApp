const { ipcRenderer } = require('electron');
const path = require('path');

const gameNameInput = document.getElementById('game-name');
const exePathInput = document.getElementById('exe-path');
const browseBtn = document.getElementById('browse-btn');
const addGameBtn = document.getElementById('add-game-btn');
const gamesList = document.getElementById('games-list');
const gameStatusList = document.getElementById('game-status-list');

// Open file dialog to browse for the game executable
browseBtn.addEventListener('click', () => {
    ipcRenderer.invoke('open-file-dialog').then(result => {
        if (!result.canceled) {
            exePathInput.value = result.filePaths[0];
        }
    });
});

// Add game to the list
addGameBtn.addEventListener('click', () => {
    const gameName = gameNameInput.value;
    const exePath = exePathInput.value;

    if (gameName && exePath) {
        ipcRenderer.send('add-game', { name: gameName, exePath: exePath });
        loadGames();
    } else {
        alert('Please enter both a game name and an executable path.');
    }
});

// Load games from the database and display them
function loadGames() {
    ipcRenderer.invoke('get-games').then(games => {
        gamesList.innerHTML = '';
        gameStatusList.innerHTML = '';
        games.forEach(game => {
            // Create list item for each game
            const listItem = document.createElement('li');
            listItem.textContent = `${game.name} (${game.exe_path})`;

            // Add a "Start Game" button for each game
            const startButton = document.createElement('button');
            startButton.textContent = 'Start Game';
            startButton.id = `start-${game.id}`;
            startButton.addEventListener('click', () => {
                ipcRenderer.send('start-game', game);
                startButton.disabled = true; // Disable the button when game starts
            });

            listItem.appendChild(startButton);
            gamesList.appendChild(listItem);

            // Add the game status
            const statusItem = document.createElement('li');
            statusItem.id = `status-${game.id}`;
            statusItem.textContent = `${game.name}: Stopped`;
            gameStatusList.appendChild(statusItem);
        });
    });
}

// Update game status in the UI and re-enable the button when game stops
ipcRenderer.on('game-status-update', (event, { gameId, status }) => {
    const statusItem = document.getElementById(`status-${gameId}`);
    const startButton = document.getElementById(`start-${gameId}`);

    if (statusItem) {
        statusItem.textContent = `${statusItem.textContent.split(':')[0]}: ${status}`;
    }

    if (status === 'Stopped' && startButton) {
        startButton.disabled = false; // Re-enable the button when game stops
    }
});

loadGames();

// Tab Switching Logic
const trackingTab = document.getElementById('tracking-tab');
const historyTab = document.getElementById('history-tab');
const statsTab = document.getElementById('stats-tab');

const trackingContent = document.getElementById('tracking-content');
const historyContent = document.getElementById('history-content');
const statsContent = document.getElementById('stats-content');

function switchTab(tab, content) {
  // Hide all content
  trackingContent.classList.remove('active');
  historyContent.classList.remove('active');
  statsContent.classList.remove('active');

  // Remove active class from all tabs
  trackingTab.classList.remove('active');
  historyTab.classList.remove('active');
  statsTab.classList.remove('active');

  // Show the selected content and highlight the tab
  tab.classList.add('active');
  content.classList.add('active');
}

trackingTab.addEventListener('click', () => switchTab(trackingTab, trackingContent));
historyTab.addEventListener('click', () => switchTab(historyTab, historyContent));
statsTab.addEventListener('click', () => switchTab(statsTab, statsContent));

// Function to load session history
function loadSessionHistory() {
  ipcRenderer.invoke('get-session-history').then((sessions) => {
    const sessionTable = document.getElementById('session-history');

    sessionTable.innerHTML = `
      <tr>
        <th>Game Name</th>
        <th>Start Time</th>
        <th>End Time</th>
        <th>Duration (minutes)</th>
      </tr>
    `;

    sessions.forEach((session) => {
        const row = document.createElement('tr');
  
        const gameNameCell = document.createElement('td');
        gameNameCell.textContent = session.game_name;
  
        const startTimeCell = document.createElement('td');
        startTimeCell.textContent = new Date(session.start_time).toLocaleString();
  
        const endTimeCell = document.createElement('td');
        endTimeCell.textContent = session.end_time
          ? new Date(session.end_time).toLocaleString()
          : 'In Progress';
  
        const durationCell = document.createElement('td');
        // Only show "Calculating..." if the duration is null or undefined
        durationCell.textContent = session.duration != null ? session.duration : 'Calculating...';
  
        row.appendChild(gameNameCell);
        row.appendChild(startTimeCell);
        row.appendChild(endTimeCell);
        row.appendChild(durationCell);
  
        sessionTable.appendChild(row);
      });
    });
  }

// Function to load game statistics (total time played per game)
function loadGameStats() {
  ipcRenderer.invoke('get-total-time-per-game').then((totals) => {
    const statsTable = document.getElementById('game-stats');

    statsTable.innerHTML = `
      <tr>
        <th>Game Name</th>
        <th>Total Time Played (minutes)</th>
      </tr>
    `;

    totals.forEach((game) => {
      const row = document.createElement('tr');

      const gameNameCell = document.createElement('td');
      gameNameCell.textContent = game.game_name;

      const totalTimeCell = document.createElement('td');
      totalTimeCell.textContent = game.total_duration || 0;

      row.appendChild(gameNameCell);
      row.appendChild(totalTimeCell);

      statsTable.appendChild(row);
    });
  });
}

// Call these functions when the app loads
loadSessionHistory();
loadGameStats();

// Refresh the data when game status updates
ipcRenderer.on('game-status-update', (event, data) => {
    const gameStatusList = document.getElementById('game-status-list');
  
    // Create or update the game status item
    let listItem = document.getElementById(`game-status-${data.gameId}`);
    if (!listItem) {
      listItem = document.createElement('li');
      listItem.id = `game-status-${data.gameId}`;
      gameStatusList.appendChild(listItem);
    }
  
    // Display the game name, status, last session duration, and live time (if running)
    listItem.innerHTML = `
      <strong>Game:</strong> ${data.gameName || 'N/A'} <br>
      <strong>Status:</strong> ${data.status || 'N/A'} <br>
      <strong>Last Session Duration:</strong> ${data.lastSessionDuration ? `${data.lastSessionDuration} minutes` : 'N/A'} <br>
      <strong>Live Session Time:</strong> <span id="live-time-${data.gameId}">N/A</span>
    `;
  });
  
  // Update live session time in real-time
  ipcRenderer.on('update-live-time', (event, { gameId, time }) => {
    const liveTimeElement = document.getElementById(`live-time-${gameId}`);
    if (liveTimeElement) {
      liveTimeElement.textContent = time;
    }
  });

  ipcRenderer.on('refresh-session-history', () => {
    loadSessionHistory();  // Reload session history when a game session ends
  });
  
 // Function to populate the game name dropdown with unique game names
function populateGameNameDropdown() {
    ipcRenderer.invoke('get-unique-game-names').then((gameNames) => {
      const gameNameDropdown = document.getElementById('filter-game-name');
  
      // Clear existing options
      gameNameDropdown.innerHTML = '<option value="">All Games</option>';
  
      // Add the unique game names as options
      gameNames.forEach((game) => {
        const option = document.createElement('option');
        option.value = game.game_name;
        option.textContent = game.game_name;
        gameNameDropdown.appendChild(option);
      });
      gameNameDropdown.addEventListener('change', () => {
        const selectedGameName = gameNameDropdown.value;
        loadSessionHistory(selectedGameName);  // Pass the selected game name to loadSessionHistory
      });
    });
  }
  
  // Function to load session history from the database, with optional filters
  function loadSessionHistory(gameName = '', startDate = '', endDate = '') {
    ipcRenderer.invoke('get-session-history', { gameName, startDate, endDate }).then((sessions) => {
      const sessionTable = document.getElementById('session-history');
  
      // Clear existing session history
      sessionTable.innerHTML = `
        <tr>
          <th>Game Name</th>
          <th>Start Time</th>
          <th>End Time</th>
          <th>Duration (minutes)</th>
        </tr>
      `;
  
      sessions.forEach((session) => {
        const row = document.createElement('tr');
  
        const gameNameCell = document.createElement('td');
        gameNameCell.textContent = session.game_name;
  
        const startTimeCell = document.createElement('td');
        startTimeCell.textContent = new Date(session.start_time).toLocaleString();
  
        const endTimeCell = document.createElement('td');
        endTimeCell.textContent = session.end_time
          ? new Date(session.end_time).toLocaleString()
          : 'In Progress';
  
        const durationCell = document.createElement('td');
        durationCell.textContent = session.duration !== null && !isNaN(session.duration) 
        ? session.duration 
        : (session.end_time ? 'Calculating...' : 'In Progress');
  
        row.appendChild(gameNameCell);
        row.appendChild(startTimeCell);
        row.appendChild(endTimeCell);
        row.appendChild(durationCell);
  
        sessionTable.appendChild(row);
      });
    });
  }
  
  // Event listener for the Refresh button
  document.getElementById('refresh-btn').addEventListener('click', () => {
    // Call loadSessionHistory with no filters to refresh the full table
    loadSessionHistory();
  });
  
  // Event listener for the Apply Filters button
  document.getElementById('apply-filters-btn').addEventListener('click', () => {
    const gameName = document.getElementById('filter-game-name').value;
    const startDate = document.getElementById('filter-start-date').value;
    const endDate = document.getElementById('filter-end-date').value;
  
    // Call loadSessionHistory with the filters applied
    loadSessionHistory(gameName, startDate, endDate);
  });
  
  // Populate the game name dropdown on app start
  populateGameNameDropdown();
  
  // Load session history on app start
  loadSessionHistory();
  