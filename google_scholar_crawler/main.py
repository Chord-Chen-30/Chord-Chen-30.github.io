from scholarly import scholarly, ProxyGenerator
import json
from datetime import datetime
import os
import sys
import time

max_attempts = 10
wait_seconds = 60

scholar_id = os.environ.get("GOOGLE_SCHOLAR_ID")
if not scholar_id:
    print(
        "ERROR: GOOGLE_SCHOLAR_ID is missing.\n"
        "Set it as a repository secret (Settings → Secrets and variables → Actions).",
        file=sys.stderr,
    )
    sys.exit(1)

author = None
last_error = None

for attempt in range(1, max_attempts + 1):
    try:
        print(f"Attempt {attempt}/{max_attempts}:")
        # Setup proxy
        pg = ProxyGenerator()
        pg.FreeProxies()  # Use free rotating proxies
        scholarly.use_proxy(pg)

        author = scholarly.search_author_id(scholar_id)
        scholarly.fill(author, sections=["basics", "indices", "counts", "publications"])
        print(f"Attempt {attempt}/{max_attempts} success")
        break
    except Exception as e:
        last_error = e
        print(f"Attempt {attempt}/{max_attempts} failed: {type(e).__name__}: {e}")
        if attempt < max_attempts:
            print(f"Waiting {wait_seconds}s before retry...")
            time.sleep(wait_seconds)
else:
    print(
        "\n"
        "ERROR: Google Scholar crawl failed after "
        f"{max_attempts} attempts (free proxies + scholarly).\n"
        f"Last error: {type(last_error).__name__}: {last_error}\n"
        "Likely cause: Google Scholar blocked the runner IP / free proxy died.\n"
        "Site will keep the previous citation JSON until a later run succeeds.\n"
        "This is expected to be occasional; re-run the workflow or wait for the next schedule.",
        file=sys.stderr,
    )
    sys.exit(1)

if not isinstance(author, dict) or "name" not in author:
    print(
        "ERROR: Crawl finished without a usable author payload "
        f"(got {type(author).__name__}).",
        file=sys.stderr,
    )
    sys.exit(1)

name = author["name"]
author["updated"] = str(datetime.now())
author["publications"] = {v["author_pub_id"]: v for v in author["publications"]}
print(json.dumps(author, indent=2))
os.makedirs("results", exist_ok=True)
with open("results/gs_data.json", "w") as outfile:
    json.dump(author, outfile, ensure_ascii=False)

shieldio_data = {
    "schemaVersion": 1,
    "label": "citations",
    "message": f"{author['citedby']}",
}
with open("results/gs_data_shieldsio.json", "w") as outfile:
    json.dump(shieldio_data, outfile, ensure_ascii=False)

print(f"Wrote citation data for {name} (citedby={author.get('citedby')})")
