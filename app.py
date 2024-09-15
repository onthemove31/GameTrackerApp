from flask import Flask, render_template, jsonify
from flask_sqlalchemy import SQLAlchemy
import os

app = Flask(__name__)

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL')  # Use the environment variable for your database URL

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Define a model for sessions
class GameSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    game_name = db.Column(db.String(50), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/insights')
def insights():
    # Fetch session data and calculate insights
    sessions = GameSession.query.all()
    session_data = [(s.game_name, s.start_time, s.end_time) for s in sessions]
    insights = calculate_insights(session_data)  # assuming you have the `calculate_insights` function

    return jsonify(insights)

if __name__ == '__main__':
    app.run(debug=True)
