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

## Installation

1. Clone the repository:
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
