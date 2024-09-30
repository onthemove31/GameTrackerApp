<<<<<<< HEAD
# GameTrackerApp

GameTrackerApp is an Electron-based desktop application designed to help gamers track their gaming sessions and analyze their playtime statistics.

## Features

- Track gaming sessions automatically
- View detailed statistics about your gaming habits
- Analyze playtime by game, day of the week, and time of day
- User-friendly interface for easy navigation and data visualization

## Technologies Used

- Electron
- Node.js
- PostgreSQL
- HTML/CSS/JavaScript
=======
# Game Tracker

## Description
Game Tracker is an Electron-based application that allows users to track their gaming sessions, log game statistics, and analyze playtime data. The application provides insights into gaming habits, including total playtime, average session duration, and more.

## Features
- Add and manage games.
- Track game sessions with start and end times.
- View session history and statistics.
- Visualize data with charts and graphs.
- Insights into gaming habits and trends.
>>>>>>> main

## Installation

1. Clone the repository:
<<<<<<< HEAD
   ```
   git clone https://github.com/onthemove31/GameTrackerApp.git
   ```

2. Navigate to the project directory:
   ```
   cd GameTrackerApp/windows-app
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Set up your PostgreSQL database and update the `.env` file with your database credentials.

5. Run the application:
   ```
   npm start
   ```

## Database Setup

The application uses a PostgreSQL database. Make sure you have PostgreSQL installed and running. Create a new database for the application and update the `.env` file with the appropriate credentials.

## Project Structure

- `main.js`: The main Electron process file
- `renderer.js`: Handles the renderer process and UI interactions
- `index.html`: The main application window
- `about.html`: The about page
- `insights.js`: Handles data processing for insights
- `assets/`: Contains images and icons used in the application

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)

## Contact

For any queries or suggestions, please open an issue on this repository.
=======
   ```bash
   git clone https://github.com/onthemove31/GameTrackerApp.git
   cd GameTracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

## Usage
- **Add a Game**: Enter the game name and executable path, then click "Add Game".
- **Track Sessions**: Start and stop games to log sessions.
- **View Statistics**: Navigate to the Statistics tab to view charts and insights.
- **Session History**: Check the Session History tab for detailed logs of past sessions.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments
- [Electron](https://www.electronjs.org/) for building cross-platform desktop applications.
- [Chart.js](https://www.chartjs.org/) for data visualization.
- [SQLite](https://www.sqlite.org/) for lightweight database management.
>>>>>>> main
