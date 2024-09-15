from flask import Flask, render_template, jsonify, request
from database import get_sessions
from insights import calculate_insights
import os

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/insights')
def insights():
    # Fetch session data from the database
    session_data = get_sessions()

    # Calculate insights
    insights = calculate_insights(session_data)

    return jsonify(insights)

# API to handle backup and restore functionality
@app.route('/backup', methods=['POST'])
def backup():
    # Logic to backup the SQLite database to cloud (e.g., Google Drive)
    return jsonify({'status': 'Backup successful'})

@app.route('/restore', methods=['POST'])
def restore():
    # Logic to restore the SQLite database from cloud
    return jsonify({'status': 'Restore successful'})

if __name__ == '__main__':
    app.run(debug=True)
