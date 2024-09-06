const { ipcRenderer } = require('electron');
const path = require('path');

const gameNameInput = document.getElementById('game-name');
const exePathInput = document.getElementById('exe-path');
const browseBtn = document.getElementById('browse-btn');
const addGameBtn = document.getElementById('add-game-btn');
const gamesList = document.getElementById('games-list');
const gameStatusList = document.getElementById('game-status-list');

let currentStatsFilters = {
  gameName: '',
  startDate: '',
  endDate: ''
};

function initializeFilters() {
  // Populate game name dropdown
  populateStatsGameNameDropdown();

  // Set default date range (e.g., last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

  document.getElementById('stats-filter-start-date').valueAsDate = thirtyDaysAgo;
  document.getElementById('stats-filter-end-date').valueAsDate = today;

  // Update currentStatsFilters
  currentStatsFilters.startDate = thirtyDaysAgo.toISOString().split('T')[0];
  currentStatsFilters.endDate = today.toISOString().split('T')[0];
}

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

// Load Game Statistics
async function loadStatistics() {
    try {
        // Total Playtime Per Game
        console.log('Sending filters for total playtime:', JSON.stringify(currentStatsFilters, null, 2));
        let totalPlaytimeData = await ipcRenderer.invoke('get-total-playtime-per-game', currentStatsFilters);
        console.log('Received total playtime data:', totalPlaytimeData);
        createChart('total-playtime-chart', 'Total Playtime (hours)', totalPlaytimeData, 'bar', 'total_playtime');

        // Average Session Duration Per Game
        console.log('Sending filters for average session duration:', JSON.stringify(currentStatsFilters, null, 2));
        let avgSessionData = await ipcRenderer.invoke('get-average-session-duration-per-game', currentStatsFilters);
        console.log('Received average session duration data:', avgSessionData);
        createChart('avg-session-duration-chart', 'Average Session Duration (hours)', avgSessionData, 'bar', 'avg_session_duration');

        // Longest Play Session Per Game
        console.log('Sending filters for longest play session:', JSON.stringify(currentStatsFilters, null, 2));
        let longestSessionData = await ipcRenderer.invoke('get-longest-play-session-per-game', currentStatsFilters);
        console.log('Received longest play session data:', longestSessionData);
        createChart('longest-session-chart', 'Longest Play Session (hours)', longestSessionData, 'bar', 'longest_session');

        // Playtime Over Time (Daily)
        console.log('Sending filters for playtime over time:', JSON.stringify(currentStatsFilters, null, 2));
        let playtimeOverTimeData = await ipcRenderer.invoke('get-playtime-over-time', currentStatsFilters);
        console.log('Received playtime over time data:', playtimeOverTimeData);
        createTimeSeriesChart('playtime-over-time-chart', 'Daily Playtime', playtimeOverTimeData);

        // Number of Sessions Per Game
        console.log('Sending filters for sessions per game:', JSON.stringify(currentStatsFilters, null, 2));
        let sessionsPerGameData = await ipcRenderer.invoke('get-sessions-per-game', currentStatsFilters);
        console.log('Received sessions per game data:', sessionsPerGameData);
        createChart('session-count-chart', 'Number of Sessions', sessionsPerGameData, 'bar', 'session_count');

        // Time Played Per Day
        console.log('Sending filters for time played per day:', JSON.stringify(currentStatsFilters, null, 2));
        let timePlayedPerDayData = await ipcRenderer.invoke('get-time-played-per-day', currentStatsFilters);
        console.log('Received time played per day data:', timePlayedPerDayData);
        createChart('time-played-per-day-chart', 'Total Playtime (hours)', timePlayedPerDayData, 'bar', 'total_playtime', 'day_of_week');

        // Playtime Distribution By Time of Day
        console.log('Sending filters for playtime by time of day:', JSON.stringify(currentStatsFilters, null, 2));
        let timeOfDayData = await ipcRenderer.invoke('get-playtime-by-time-of-day', currentStatsFilters);
        console.log('Received playtime by time of day data:', timeOfDayData);
        createStackedHorizontalBarChart('playtime-by-time-of-day-chart', 'Playtime Distribution By Time of Day', timeOfDayData);
    } catch (error) {
        console.error('Error loading statistics:', error);
        // Optionally, display an error message to the user
    }
}

function populateStatsGameNameDropdown() {
    const dropdown = document.getElementById('stats-filter-game-name');
    ipcRenderer.invoke('get-unique-game-names').then((games) => {
        dropdown.innerHTML = '<option value="">All Games</option>';
        games.forEach((game) => {
            const option = document.createElement('option');
            option.value = game.game_name;
            option.textContent = game.game_name;
            dropdown.appendChild(option);
        });
    });
}

document.getElementById('stats-apply-filters-btn').addEventListener('click', () => {
  currentStatsFilters.gameName = document.getElementById('stats-filter-game-name').value;
  currentStatsFilters.startDate = document.getElementById('stats-filter-start-date').value || null;
  currentStatsFilters.endDate = document.getElementById('stats-filter-end-date').value || null;
  console.log('Applying filters:', JSON.stringify(currentStatsFilters, null, 2));
  loadStatistics();
});

// Modify the existing stats tab click event listener
document.getElementById('stats-tab').addEventListener('click', () => {
    switchTab(statsTab, statsContent);
    initializeFilters();  // Reset filters to default
    loadStatistics();     // Load all data
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
          <th>Duration (hours)</th>
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
        if (session.duration !== null && !isNaN(session.duration)) {
          const durationHours = (session.duration / 60).toFixed(2);
          durationCell.textContent = `${durationHours} hours`;
        } else {
          durationCell.textContent = session.end_time ? 'Calculating...' : 'In Progress';
        }
  
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
  
  function createChart(chartId, label, data, type, dataKey, labelKey = 'game_name') {
    if (!data || data.length === 0) {
        console.log(`No data available for chart: ${chartId}`);
        return;
    }

    const ctx = document.getElementById(chartId).getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.myCharts && window.myCharts[chartId]) {
        window.myCharts[chartId].destroy();
    }

    // Convert minutes to hours
    const hoursData = data.map(item => ({
        ...item,
        [dataKey]: item[dataKey] / 60
    }));

    // Create new chart
    window.myCharts = window.myCharts || {};
    window.myCharts[chartId] = new Chart(ctx, {
        type: type,
        data: {
            labels: hoursData.map(item => item[labelKey]),
            datasets: [{
                label: label,
                data: hoursData.map(item => item[dataKey]),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2) + ' hours';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
  }
  
  function createTimeSeriesChart(chartId, label, data) {
    const ctx = document.getElementById(chartId).getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.myCharts && window.myCharts[chartId]) {
        window.myCharts[chartId].destroy();
    }

    // Convert minutes to hours
    const hoursData = data.map(item => ({
        ...item,
        total_playtime: item.total_playtime / 60
    }));

    window.myCharts = window.myCharts || {};
    window.myCharts[chartId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hoursData.map(item => item.play_date),
            datasets: [{
                label: label,
                data: hoursData.map(item => item.total_playtime),
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MMM d'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Playtime (hours)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2) + ' hours';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
  }

  function createStackedHorizontalBarChart(chartId, label, data) {
    const ctx = document.getElementById(chartId).getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.myCharts && window.myCharts[chartId]) {
        window.myCharts[chartId].destroy();
    }
    
    // Process data and convert minutes to hours
    const games = [...new Set(data.map(item => item.game_name))];
    const timeOfDayCategories = ['Night (12AM-6AM)', 'Morning (6AM-12PM)', 'Afternoon (12PM-6PM)', 'Evening (6PM-12AM)'];
    
    const datasets = games.map(game => {
      return {
        label: game,
        data: timeOfDayCategories.map(category => {
          const item = data.find(d => d.game_name === game && d.time_of_day === category);
          return item ? item.total_playtime / 60 : 0;
        }),
        backgroundColor: getRandomColor(),
      };
    });
  
    window.myCharts = window.myCharts || {};
    window.myCharts[chartId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: timeOfDayCategories,
        datasets: datasets
      },
      options: {
        indexAxis: 'y',
        scales: {
          x: {
            stacked: true,
            title: {
              display: true,
              text: 'Total Playtime (hours)'
            }
          },
          y: {
            stacked: true
          }
        },
        plugins: {
          title: {
            display: true,
            text: label
          },
          legend: {
            position: 'right'
          },
          tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.x !== null) {
                        label += context.parsed.x.toFixed(2) + ' hours';
                    }
                    return label;
                }
            }
          }
        }
      }
    });
  }
  
  // Helper function to generate random colors for the chart
  function getRandomColor() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r}, ${g}, ${b}, 0.7)`;
  }