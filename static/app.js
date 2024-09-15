document.getElementById('view-insights-btn').addEventListener('click', async () => {
    try {
        const response = await fetch('/insights');
        const insights = await response.json();

        document.getElementById('total-playtime').innerText = `Total Playtime: ${insights.totalPlaytime} minutes`;
        document.getElementById('avg-playtime').innerText = `Average Playtime: ${insights.averagePlaytimePerDay} minutes`;
        // Add other insights

    } catch (error) {
        console.error('Error fetching insights:', error);
    }
});
