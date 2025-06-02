import sys
import json
import requests
import gzip

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python run.py <output_json_file>")
        sys.exit(1)

    url = "https://pub-e98285daadd4482fb56021ad394144c1.r2.dev/extension_data"
    output_file = sys.argv[1]

    # Download the gzipped JSON file from the hardcoded public R2 URL
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    raw = resp.content

    # Try to decompress as gzip, fallback to raw if not gzipped
    try:
        raw = gzip.decompress(raw)
    except OSError:
        pass

    data = json.loads(raw.decode("utf-8"))
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Downloaded and extracted JSON saved to {output_file}")
