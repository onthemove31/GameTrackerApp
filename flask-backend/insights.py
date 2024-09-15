def calculate_insights(session_data):
    insights = {}

    # Your insights calculation logic here
    total_playtime = sum([(session[2] - session[1]).total_seconds() / 60 for session in session_data])
    
    insights['totalPlaytime'] = total_playtime
    insights['averagePlaytimePerDay'] = total_playtime / len(set([session[1].date() for session in session_data]))
    # Add other insights

    return insights
