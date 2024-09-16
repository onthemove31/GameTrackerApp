const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Load session data from the database
async function loadSessionData(userId) {
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  try {
    await client.connect();
    const query = "SELECT game_name, start_time, end_time FROM sessions WHERE user_id = $1";
    const result = await client.query(query, [userId]);
    return result.rows;
  } catch (err) {
    console.error("Error executing query: ", err.message);
    throw err;
  } finally {
    await client.end();
  }
}

// Helper function to calculate variance
function calculateVariance(durations) {
  const mean = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  const variance = durations.reduce((sum, duration) => sum + Math.pow(duration - mean, 2), 0) / durations.length;
  return variance;
}

// Helper function to convert 24-hour time to 12-hour format with AM/PM
function convertTo12HourFormat(hour) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const adjustedHour = hour % 12 || 12; // Convert 0 to 12 for midnight, and adjust the hour
  return `${adjustedHour} ${period}`;
}

// Calculate all insights
function calculateInsights(sessionData) {
  const insights = {};

  let totalPlaytime = 0;
  let longestSession = 0;
  let playDurations = {};
  let daysPlayed = new Set();
  let hoursPlayed = {};
  let weekendPlaytime = 0;
  let weekdayPlaytime = 0;

  sessionData.forEach(session => {
    const startTime = new Date(session.start_time);
    const endTime = new Date(session.end_time);
    const duration = (endTime - startTime) / 1000 / 60; // Duration in minutes

    totalPlaytime += duration;
    longestSession = Math.max(longestSession, duration);

    const gameName = session.game_name;
    if (!playDurations[gameName]) {
      playDurations[gameName] = [];
    }
    playDurations[gameName].push(duration);
    daysPlayed.add(startTime.toDateString());

    // Group by hours to find peak playtime
    const hour = startTime.getHours();
    hoursPlayed[hour] = (hoursPlayed[hour] || 0) + duration;

    // Check if it's weekend or weekday
    const dayOfWeek = startTime.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendPlaytime += duration;
    } else {
      weekdayPlaytime += duration;
    }
  });

  // Calculate playtime variance for each game
  const varianceByGame = {};
  Object.keys(playDurations).forEach(gameName => {
    varianceByGame[gameName] = calculateVariance(playDurations[gameName]);
  });

  // Calculate peak playtime (hour of the day with the most playtime)
  const peakPlayHour = Object.keys(hoursPlayed).reduce((a, b) => hoursPlayed[a] > hoursPlayed[b] ? a : b);

  // Longest streak of consecutive days played
  const sortedDays = Array.from(daysPlayed).sort((a, b) => new Date(a) - new Date(b));
  let longestStreak = 0;
  let currentStreak = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const day1 = new Date(sortedDays[i - 1]);
    const day2 = new Date(sortedDays[i]);
    const diffInDays = (day2 - day1) / (1000 * 60 * 60 * 24);

    if (diffInDays === 1) {
      currentStreak++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  // Session duration trend (increasing, decreasing, or stable)
  let trend = "Stable";
  if (sessionData.length > 1) {
    const durations = sessionData.map(session => (new Date(session.end_time) - new Date(session.start_time)) / 1000 / 60);
    const totalDiff = durations.slice(1).reduce((acc, curr, idx) => acc + (curr - durations[idx]), 0);
    if (totalDiff > 0) {
      trend = "Increasing";
    } else if (totalDiff < 0) {
      trend = "Decreasing";
    }
  }

  // Simple next game prediction: Predict the most frequently played game
  const gameFrequency = {};
  sessionData.forEach(session => {
    const game = session.game_name;
    gameFrequency[game] = (gameFrequency[game] || 0) + 1;
  });
  const nextGamePrediction = Object.keys(gameFrequency).reduce((a, b) => gameFrequency[a] > gameFrequency[b] ? a : b);

  // Compile insights
  insights.totalPlaytime = totalPlaytime;
  insights.longestSession = longestSession;
  insights.averagePlaytimePerDay = totalPlaytime / daysPlayed.size;
  insights.varianceByGame = varianceByGame;
  insights.peakPlayHour = peakPlayHour;
  insights.weekendPlaytime = weekendPlaytime;
  insights.weekdayPlaytime = weekdayPlaytime;
  insights.longestStreak = longestStreak;
  insights.sessionDurationTrend = trend;
  insights.nextGamePrediction = nextGamePrediction;

  return insights;
}

// Provide meaningful feedback based on insights
function createFeedback(insights) {
  const feedback = {};

  // Total Playtime
  feedback.totalPlaytime = `You've spent a total of ${Math.round(insights.totalPlaytime / 60)} hours gaming.`;

  // Longest Session
  feedback.longestSession = `Your longest session was ${Math.round(insights.longestSession)} minutes.`;

  // Average Playtime Per Day
  feedback.avgPlaytime = `On average, you play for ${Math.round(insights.averagePlaytimePerDay)} minutes per day.`;

  // Peak Play Hour
  feedback.peakPlayHour = `You play the most during the hour of ${convertTo12HourFormat(insights.peakPlayHour)}.`;

  // Weekend vs Weekday Playtime
  feedback.weekendPlaytime = `You've spent ${Math.round(insights.weekendPlaytime / 60)} hours gaming on weekends.`;
  feedback.weekdayPlaytime = `You've spent ${Math.round(insights.weekdayPlaytime / 60)} hours gaming on weekdays.`;

  // Longest Streak
  if (insights.longestStreak >= 3) {
    feedback.longestStreak = `You're on a ${insights.longestStreak}-day streak! Make sure to take breaks between sessions to stay refreshed.`;
  } else {
    feedback.longestStreak = `You're keeping things balanced with breaks between gaming sessions. Keep it up!`;
  }

  // Session Duration Trend
  if (insights.sessionDurationTrend === "Increasing") {
    feedback.sessionTrend = `Your gaming sessions have been getting longer over time. Try setting a timer to maintain balance.`;
  } else if (insights.sessionDurationTrend === "Decreasing") {
    feedback.sessionTrend = `Your session times have been decreasing. It seems like you're managing your time well!`;
  } else {
    feedback.sessionTrend = `Your gaming session durations have remained stable. Great job maintaining consistency!`;
  }

  // Next Game Prediction
  feedback.nextGamePrediction = `Based on your past playtime, you might want to play: ${insights.nextGamePrediction}. Enjoy!`;

  return feedback;
}

module.exports = {
  loadSessionData,
  calculateInsights,
  createFeedback
};