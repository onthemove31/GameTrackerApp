import sqlite3

def get_sessions():
    conn = sqlite3.connect('./windows-app/games.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT game_name, start_time, end_time FROM sessions")
    sessions = cursor.fetchall()

    conn.close()
    return sessions
