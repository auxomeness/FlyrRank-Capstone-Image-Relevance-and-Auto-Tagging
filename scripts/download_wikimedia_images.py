import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "data/manifests/images.json"
IMAGE_DIR = ROOT / "data/images"
API_URL = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "FlyRankCapstoneImageRelevance/1.0 (student project)"

TARGETS = [
    ("animal-red-fox-01", "red fox", "animal", ["orange fur", "wild", "forest"], "red fox in forest photo"),
    ("animal-red-fox-02", "red fox", "animal", ["orange fur", "snow", "wild"], "red fox snow photo"),
    ("animal-red-fox-03", "red fox", "animal", ["pointed ears", "bushy tail", "grass"], "red fox grass photo"),
    ("animal-red-fox-04", "red fox", "animal", ["forest", "wild", "orange"], "red fox wildlife photo"),
    ("animal-wolf-01", "gray wolf", "animal", ["gray fur", "wild", "forest"], "gray wolf forest photo"),
    ("animal-wolf-02", "gray wolf", "animal", ["pack animal", "snow", "gray"], "gray wolf snow photo"),
    ("animal-wolf-03", "gray wolf", "animal", ["howling", "mountain", "wild"], "howling gray wolf photo"),
    ("animal-dog-01", "domestic dog", "animal", ["pet", "friendly", "home"], "domestic dog home photo"),
    ("animal-dog-02", "domestic dog", "animal", ["pet", "park", "collar"], "dog park collar photo"),
    ("animal-bear-01", "brown bear", "animal", ["large", "forest", "wild"], "brown bear forest photo"),
    ("animal-deer-01", "deer", "animal", ["antlers", "forest", "wild"], "deer antlers forest photo"),
    ("animal-bird-01", "blue bird", "animal", ["wings", "sky", "small"], "blue bird photo"),
    ("food-coffee-01", "coffee cup", "food", ["warm", "drink", "cafe"], "coffee cup cafe photo"),
    ("food-coffee-02", "coffee cup", "food", ["espresso", "mug", "morning"], "espresso mug photo"),
    ("food-salad-01", "green salad", "food", ["vegetables", "fresh", "bowl"], "green salad bowl photo"),
    ("food-pizza-01", "pizza", "food", ["cheese", "slice", "restaurant"], "pizza slice photo"),
    ("food-bread-01", "bread loaf", "food", ["bakery", "wheat", "fresh"], "bread loaf bakery photo"),
    ("food-fruit-01", "fruit basket", "food", ["apple", "orange", "fresh"], "fruit basket photo"),
    ("tech-laptop-01", "laptop computer", "technology", ["screen", "keyboard", "desk"], "laptop computer desk photo"),
    ("tech-server-01", "server rack", "technology", ["datacenter", "network", "backend"], "server rack datacenter photo"),
    ("tech-phone-01", "smartphone", "technology", ["mobile", "screen", "app"], "smartphone screen photo"),
    ("tech-camera-01", "camera", "technology", ["lens", "photo", "device"], "camera lens photo"),
    ("tech-robot-01", "robot arm", "technology", ["automation", "machine", "factory"], "robot arm factory photo"),
    ("tech-chip-01", "computer chip", "technology", ["processor", "circuit", "hardware"], "computer chip circuit photo"),
    ("nature-mountain-01", "mountain landscape", "nature", ["peaks", "sky", "trail"], "mountain landscape trail photo"),
    ("nature-forest-01", "forest path", "nature", ["trees", "trail", "green"], "forest path photo"),
    ("nature-beach-01", "beach", "nature", ["ocean", "sand", "waves"], "beach ocean waves photo"),
    ("nature-river-01", "river", "nature", ["water", "rocks", "valley"], "river rocks valley photo"),
    ("nature-desert-01", "desert dunes", "nature", ["sand", "dry", "sun"], "desert dunes photo"),
    ("nature-city-park-01", "city park", "nature", ["trees", "urban", "people"], "city park trees photo"),
    ("transport-car-01", "car", "transport", ["road", "vehicle", "travel"], "car road photo"),
    ("transport-bike-01", "bicycle", "transport", ["wheels", "street", "commute"], "bicycle street photo"),
    ("transport-train-01", "train", "transport", ["rail", "station", "travel"], "train station rail photo"),
    ("transport-plane-01", "airplane", "transport", ["flight", "sky", "airport"], "airplane sky airport photo"),
    ("people-student-01", "student studying", "people", ["books", "desk", "learning"], "student studying books photo"),
    ("people-team-01", "team meeting", "people", ["collaboration", "office", "planning"], "team meeting office photo"),
    ("people-doctor-01", "doctor", "people", ["healthcare", "clinic", "professional"], "doctor clinic photo"),
    ("people-chef-01", "chef", "people", ["kitchen", "cooking", "restaurant"], "chef cooking kitchen photo"),
    ("object-book-01", "open book", "object", ["pages", "reading", "education"], "open book pages photo"),
    ("object-clock-01", "clock", "object", ["time", "wall", "schedule"], "wall clock photo"),
]

LICENSE_ALLOWLIST = ("cc0", "public domain", "cc by", "cc-by")

PINNED_TITLES = {
    "animal-dog-01": "File:Backyard Dog, Sunny Afternoon - Flickr - sonstroem.jpg",
    "animal-bear-01": "File:Kodiak Brown Bear (8188946388).jpg",
    "food-salad-01": "File:Healthy Lentil Salad (Unsplash).jpg",
    "food-bread-01": "File:Loaf of Bread (Unsplash tm3Diid694Y).jpg",
    "nature-mountain-01": "File:Red Mountain Trail No. 159 (28775990906).jpg",
    "nature-river-01": "File:Namdae stream water reflection of colorful clouds from Wolhwagyo bridge in Gangneung South Korea.jpg",
    "nature-city-park-01": "File:Walkway in City Park, New Orleans - Fog beneath the trees, 2012.jpg",
    "transport-train-01": "File:Passenger train at Wolverhampton station - 1976 - geograph.org.uk - 3784731.jpg",
    "people-doctor-01": "File:Doctor using stethoscope to examine a woman (48545971856).jpg",
    "object-book-01": "File:Man Pointing at Open Book Page (17106225319).jpg",
}


def request_json(params):
    url = API_URL + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_error = None
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as error:
            last_error = error
            time.sleep(8 * (attempt + 1))
    raise last_error


def clean_filename(title):
    name = re.sub(r"^File:", "", title)
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", name)
    return name[:120]


def search_images(query, limit=12):
    data = request_json(
        {
            "action": "query",
            "generator": "search",
            "gsrsearch": f"{query} filetype:bitmap",
            "gsrnamespace": 6,
            "gsrlimit": limit,
            "prop": "imageinfo",
            "iiprop": "url|mime|extmetadata",
            "iiurlwidth": 900,
            "format": "json",
        }
    )
    pages = list((data.get("query", {}).get("pages", {}) or {}).values())
    return sorted(pages, key=lambda page: page.get("index", 999))


def get_image_by_title(title):
    data = request_json(
        {
            "action": "query",
            "titles": title,
            "prop": "imageinfo",
            "iiprop": "url|mime|extmetadata",
            "iiurlwidth": 900,
            "format": "json",
        }
    )
    pages = list((data.get("query", {}).get("pages", {}) or {}).values())
    if not pages:
        raise RuntimeError(f"Pinned Wikimedia image not found: {title}")
    page = pages[0]
    info = (page.get("imageinfo") or [{}])[0]
    license_name = (info.get("extmetadata", {}).get("LicenseShortName", {}) or {}).get("value", "")
    return {
        "title": page.get("title", title),
        "url": info.get("thumburl") or info.get("url", ""),
        "page_url": info.get("descriptionurl", ""),
        "license": license_name,
    }


def pick_candidate(query, used_urls):
    for page in search_images(query):
        info = (page.get("imageinfo") or [{}])[0]
        url = info.get("thumburl") or info.get("url", "")
        mime = info.get("mime", "")
        meta = info.get("extmetadata", {})
        license_name = (meta.get("LicenseShortName", {}) or {}).get("value", "")
        page_url = (meta.get("LicenseUrl", {}) or {}).get("value", "") or info.get("descriptionurl", "")
        lower_license = license_name.lower()
        if not url or url in used_urls:
            continue
        if mime not in {"image/jpeg", "image/png", "image/webp"}:
            continue
        if not any(allowed in lower_license for allowed in LICENSE_ALLOWLIST):
            continue
        return {
            "title": page.get("title", ""),
            "url": url,
            "page_url": info.get("descriptionurl", page_url),
            "license": license_name,
        }
    raise RuntimeError(f"No allowed Wikimedia image found for query: {query}")


def download(url, output_path):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_error = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                output_path.write_bytes(response.read())
                return
        except Exception as error:
            last_error = error
            time.sleep(4 * (attempt + 1))
    raise last_error


def main():
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    used_urls = set()
    manifest = []

    for image_id, subject, category, attributes, query in TARGETS:
        pinned_title = PINNED_TITLES.get(image_id)
        candidate = get_image_by_title(pinned_title) if pinned_title else pick_candidate(query, used_urls)
        used_urls.add(candidate["url"])
        suffix = Path(urllib.parse.urlparse(candidate["url"]).path).suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
            suffix = ".jpg"
        file_name = f"{image_id}{suffix}"
        output_path = IMAGE_DIR / file_name
        download(candidate["url"], output_path)

        manifest.append(
            {
                "id": image_id,
                "subject": subject,
                "category": category,
                "attributes": attributes,
                "file": file_name,
                "source_url": candidate["page_url"],
                "license": candidate["license"],
                "source_title": clean_filename(candidate["title"]),
            }
        )
        print(f"{image_id}: {candidate['title']} ({candidate['license']})")
        time.sleep(5)

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Downloaded {len(manifest)} real images and updated {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
