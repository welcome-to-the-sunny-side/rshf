import sys
import json
import requests
import gzip
import app.r2_utils as r2

from datetime import datetime, timezone

if __name__ == "__main__":
    group_id = "main"
    user_data = {
        "negative-xp": ["negative-xp", 1500, 1500],
        "RoomTemperatureIQ": ["RoomTemperatureIQ", -1000000000, -1000000000]
    }

    payload = {
        'timestamp': datetime.utcnow().replace(tzinfo=timezone.utc).isoformat(),
        'data': {
            group_id: user_data
        },
        'data_format': ['cf_handle', 'user_group_rating', 'user_group_max_rating']
    }

    print(f"Preparing to write data for group '{group_id}': {user_data}")

    # Write the main extension data (gzipped)
    extension_data_url = r2.write_to_r2(payload, 'extension_data', use_gzip=True)
    print(f"Successfully wrote extension data to: {extension_data_url}")

    # Also update the simple timestamp file (not gzipped)
    # This matches the behavior of write_extension_data_to_r2
    timestamp_payload = {'timestamp': datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()}
    timestamp_url = r2.write_to_r2(timestamp_payload, 'timestamp', use_gzip=False) # Typically not gzipped
    print(f"Successfully wrote timestamp file to: {timestamp_url}")

