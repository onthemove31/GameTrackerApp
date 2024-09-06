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

/* // Update game status in the UI to show duration
ipcRenderer.on('game-status-update', (event, { gameId, status, duration }) => {
    const statusItem = document.getElementById(`status-${gameId}`);
    if (statusItem) {
        let statusText = `${statusItem.textContent.split(':')[0]}: ${status}`;
        if (status === 'Stopped' && duration) {
            statusText += ` | Duration: ${duration} minutes`;
        }
        statusItem.textContent = statusText;
    }
}); */
