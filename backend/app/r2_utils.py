import boto3
from datetime import datetime, timezone
import os
import io
import requests
import json
from app import db_utils, models
import gzip
import msgpack

def load_env_file(filepath=".env"):
    with open(filepath) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if '=' not in line:
                continue
            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ[key] = value

# Only load environment variables if they're not already set
required_env_vars = ['UPLOAD_ENDPOINT_URL', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'DEV_URL']
if not all(var in os.environ for var in required_env_vars):
    load_env_file()

session = boto3.session.Session()

region_name = 'auto'
endpoint_url = os.environ['UPLOAD_ENDPOINT_URL']
aws_access_key_id = os.environ['AWS_ACCESS_KEY_ID']
aws_secret_access_key = os.environ['AWS_SECRET_ACCESS_KEY']
dev_url = os.environ['DEV_URL']

def write_to_r2(data, relative_path, use_gzip=False):
    client = session.client(
        's3',
        region_name='auto',
        endpoint_url=endpoint_url,
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key
    )

    if not use_gzip:
        json_bytes = io.BytesIO(json.dumps(data).encode('utf-8'))
        client.upload_fileobj(json_bytes, 'rshf', relative_path)
        return dev_url + '/' + relative_path


    buf = io.BytesIO()
    with gzip.GzipFile(fileobj=buf, mode="w") as gz:
        gz.write(json.dumps(data, separators=(",", ":")).encode("utf-8"))
    buf.seek(0) 
    
    client.upload_fileobj(
        buf,
        'rshf',
        relative_path,
        ExtraArgs={           # Helps R2 know what it’s getting
            "ContentType":     "application/json",
            # "ContentEncoding": "gzip"
        }
    )
    return f"{dev_url}/{relative_path}"


def read_from_r2(relative_path):
    resp = requests.get(
        f"{dev_url}/{relative_path}",
        headers={"Accept-Encoding": "identity"},
        timeout=30,
    )
    resp.raise_for_status()

    raw = resp.content
    header_enc = resp.headers.get("Content-Encoding", "").lower()
    looks_gzipped = (
        "gzip" in header_enc
        or (len(raw) >= 2 and raw[0] == 0x1F and raw[1] == 0x8B)
    )

    if looks_gzipped:
        try:
            raw = gzip.decompress(raw)
        except OSError:
            # Not actually gzipped (e.g. already decompressed). Fall through.
            pass

    return json.loads(raw.decode("utf-8"))
    
def write_extension_data_to_r2(db):
    group_memberships = db.query(models.GroupMembership).all()
    accepted_reports = db.query(models.Report).filter(models.Report.accepted == True and models.Report.respondent_role_after == "kicked").all()
    db.close()
    data = dict()

    for obj in group_memberships:
        store_data = [
            obj.cf_handle,
            obj.user_group_rating,
            obj.user_group_max_rating
        ]
        if obj.group_id not in data:
            data[obj.group_id] = dict()
    
        data[obj.group_id][obj.user_id] = store_data
    
    res = {
        'timestamp': datetime.utcnow().replace(tzinfo=timezone.utc).isoformat(),
        'data': data,
        'data_format': [
            'cf_handle', 'user_group_rating', 'user_group_max_rating'
        ],
    }
    
    extension_data_link = write_to_r2(res, 'extension_data', use_gzip=True)
    timestamp_link = write_to_r2(
        {'timestamp':datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()},
        'timestamp'
    )
    print(f"Finished writing {len(group_memberships)} entries to r2")
    return extension_data_link, timestamp_link

def read_extension_data_from_r2():
    return read_from_r2('extension_data')
    