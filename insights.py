""" from datetime import datetime

# The time string you're working with
time_string = '2024-09-06T09:28:08.837Z'

# Convert the string to a datetime object
time_format = '%Y-%m-%dT%H:%M:%S.%fZ'
time_dt = datetime.strptime(time_string, time_format)

print(time_dt)
 """

from datetime import datetime

def calculate_insights(session_data):
    insights = {}

    total_playtime = 0

    for session in session_data:
        # Assuming session[1] is start_time and session[2] is end_time, both stored as strings
        start_time = session[1]
        end_time = session[2]

        # Adjust the format to match your timestamps
        time_format = '%Y-%m-%dT%H:%M:%S.%fZ'
        start_time_dt = datetime.strptime(start_time, time_format)
        end_time_dt = datetime.strptime(end_time, time_format)

        # Calculate the session duration (in minutes)
        duration = (end_time_dt - start_time_dt).total_seconds() / 60

        total_playtime += duration

    insights['totalPlaytime'] = total_playtime
    return insights

