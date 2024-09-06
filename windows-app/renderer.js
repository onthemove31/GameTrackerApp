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

// Function to load session history
function loadSessionHistory() {
    ipcRenderer.invoke('get-session-history').then((sessions) => {
      const sessionTable = document.getElementById('session-history');
  
      // Clear existing rows except the header
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
        durationCell.textContent = session.duration || 'Calculating...';
  
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
  
      // Clear existing rows except the header
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
    loadSessionHistory();
    loadGameStats();
  });