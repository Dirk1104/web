#!/usr/bin/env python3
"""
Daily Energy Data Updater for Energetic Management Consulting website.
Fetches energy market prices and news headlines, then updates index.html.

Sources:
  - Energy prices: ICE Endex (TTF Gas) & EEX (Belgian Power) via web scraping
  - Energy news: EnergyMarketPrice.com

Schedule: Daily at 10:00 AM CET via cron
Usage:   python3 update-energy-data.py
"""

import json
import os
import re
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from html import escape

# --- Configuration ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_HTML = os.path.join(SCRIPT_DIR, "index.html")
DATA_FILE = os.path.join(SCRIPT_DIR, "energy-data.json")

CET = timezone(timedelta(hours=1))

# News categories and their icons
NEWS_ICONS = {
    "gas": '<i class="fas fa-fire"></i> Gas',
    "power": '<i class="fas fa-bolt"></i> Power',
    "carbon": '<i class="fas fa-leaf"></i> Carbon',
    "oil": '<i class="fas fa-oil-can"></i> Oil',
    "storage": '<i class="fas fa-battery-full"></i> Storage',
    "transition": '<i class="fas fa-solar-panel"></i> Transition',
    "renewables": '<i class="fas fa-leaf"></i> Renewables',
    "nuclear": '<i class="fas fa-atom"></i> Nuclear',
    "policy": '<i class="fas fa-landmark"></i> Policy',
}

# User-agent for requests
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def fetch_url(url, timeout=30):
    """Fetch URL content with proper headers."""
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
        print(f"  [WARN] Failed to fetch {url}: {e}")
        return None


def fetch_energy_prices():
    """
    Fetch current energy prices from EnergyMarketPrice.com homepage.
    Falls back to scraping price data from available public endpoints.
    """
    prices = {
        "ttf_front_month": None,
        "ttf_front_month_label": None,
        "ttf_cal_next": None,
        "ttf_cal_next_label": None,
        "power_front_month": None,
        "power_front_month_label": None,
        "power_cal_next": None,
        "power_cal_next_label": None,
    }

    # Try EnergyMarketPrice.com for price data
    print("  Fetching prices from EnergyMarketPrice.com...")
    html = fetch_url("https://www.energymarketprice.com")
    if html:
        # Look for TTF price patterns
        ttf_match = re.search(
            r'TTF.*?(\d+[.,]\d+)\s*(?:EUR/MWh|€/MWh)', html, re.IGNORECASE | re.DOTALL
        )
        if ttf_match:
            prices["ttf_front_month"] = ttf_match.group(1).replace(",", ".")

        # Look for power price patterns
        power_match = re.search(
            r'(?:Belgian?|BE)\s*(?:Power|Baseload).*?(\d+[.,]\d+)\s*(?:EUR/MWh|€/MWh)',
            html, re.IGNORECASE | re.DOTALL
        )
        if power_match:
            prices["power_front_month"] = power_match.group(1).replace(",", ".")

    # Calculate front month label (next month)
    now = datetime.now(CET)
    next_month = (now.replace(day=1) + timedelta(days=32)).replace(day=1)
    front_month_label = next_month.strftime("%b %Y")
    cal_year = now.year + 1

    prices["ttf_front_month_label"] = front_month_label
    prices["ttf_cal_next_label"] = f"Cal {cal_year}"
    prices["power_front_month_label"] = front_month_label
    prices["power_cal_next_label"] = f"Cal {cal_year}"

    return prices


def fetch_energy_news():
    """
    Fetch latest energy news headlines from EnergyMarketPrice.com.
    Returns list of dicts with 'category', 'headline' keys.
    """
    news = []
    print("  Fetching news from EnergyMarketPrice.com...")

    html = fetch_url("https://www.energymarketprice.com/home/en/news")
    if not html:
        # Try alternative URL
        html = fetch_url("https://www.energymarketprice.com")

    if html:
        # Extract news headlines - look for common patterns
        # Try structured article elements first
        articles = re.findall(
            r'<(?:h[2-4]|a)[^>]*class="[^"]*(?:news|article|headline)[^"]*"[^>]*>'
            r'(.*?)</(?:h[2-4]|a)>',
            html, re.IGNORECASE | re.DOTALL
        )

        if not articles:
            # Try broader pattern for linked headlines
            articles = re.findall(
                r'<a[^>]*href="[^"]*news[^"]*"[^>]*>\s*(?:<[^>]*>)*\s*([^<]{20,200})',
                html, re.IGNORECASE
            )

        for headline_raw in articles[:6]:
            headline = re.sub(r'<[^>]+>', '', headline_raw).strip()
            headline = re.sub(r'\s+', ' ', headline)
            if len(headline) < 15 or len(headline) > 300:
                continue

            # Auto-categorize based on keywords
            hl = headline.lower()
            if any(w in hl for w in ["gas", "ttf", "lng", "methane"]):
                cat = "gas"
            elif any(w in hl for w in ["power", "electricity", "baseload", "grid"]):
                cat = "power"
            elif any(w in hl for w in ["carbon", "ets", "eua", "emission"]):
                cat = "carbon"
            elif any(w in hl for w in ["oil", "brent", "opec", "crude", "petroleum"]):
                cat = "oil"
            elif any(w in hl for w in ["storage", "inventory", "injection"]):
                cat = "storage"
            elif any(w in hl for w in ["solar", "wind", "renewable", "transition", "hydrogen"]):
                cat = "transition"
            elif any(w in hl for w in ["nuclear"]):
                cat = "nuclear"
            else:
                cat = "power"

            news.append({"category": cat, "headline": headline})

    return news[:6]


def format_date_display(dt):
    """Format date for display: '20 March 2026'."""
    return dt.strftime("%-d %B %Y")


def format_date_short(dt):
    """Format date for ticker: '20 Mar 2026'."""
    return dt.strftime("%-d %b %Y")


def format_day_of_week(dt):
    """Format day of week for header."""
    return dt.strftime("%A, %-d %B %Y")


def build_ticker_html(news_items, date_short):
    """Build the news ticker slide HTML."""
    slides = []
    for i, item in enumerate(news_items):
        tag_html = NEWS_ICONS.get(item["category"], NEWS_ICONS["power"])
        headline_escaped = escape(item["headline"])
        active = ' active' if i == 0 else ''
        slides.append(
            f'                <div class="news-ticker-slide{active}">\n'
            f'                    <span class="news-ticker-tag">{tag_html}</span>\n'
            f'                    <span class="news-ticker-headline">{headline_escaped}</span>\n'
            f'                </div>'
        )
    return "\n".join(slides)


def update_index_html(prices, news_items):
    """Update index.html with fresh price and news data."""
    now = datetime.now(CET)
    date_display = format_date_display(now)
    date_short = format_date_short(now)

    with open(INDEX_HTML, "r", encoding="utf-8") as f:
        html = f.read()

    # --- Update hero card date ---
    html = re.sub(
        r'(<span class="hero-card-date"><i class="far fa-calendar-alt"></i> )[^<]+(</span>)',
        rf'\g<1>{date_display}\2',
        html
    )

    # --- Update ticker date ---
    html = re.sub(
        r'(<span class="news-ticker-date">)[^<]+(</span>)',
        rf'\g<1>{date_short}\2',
        html
    )

    # --- Update TTF prices ---
    if prices.get("ttf_front_month"):
        # Update TTF front month value
        html = re.sub(
            r'(<!-- TTF-FRONT-MONTH -->|<span class="hero-price-label">Front Month <em>\([^)]+\)</em></span>\s*<span class="hero-price-value">)\d+\.\d+',
            lambda m: m.group(0).rsplit(m.group(0).split(">")[-1], 1)[0] + prices["ttf_front_month"]
            if "TTF-FRONT-MONTH" in m.group(0) else m.group(0),
            html
        )

    if prices.get("ttf_front_month_label"):
        html = re.sub(
            r'(TTF Natural Gas</h4>.*?Front Month <em>\()([^)]+)(\)</em>)',
            rf'\g<1>{prices["ttf_front_month_label"]}\3',
            html, flags=re.DOTALL
        )

    if prices.get("power_front_month_label"):
        html = re.sub(
            r'(Belgian Power Baseload</h4>.*?Front Month <em>\()([^)]+)(\)</em>)',
            rf'\g<1>{prices["power_front_month_label"]}\3',
            html, flags=re.DOTALL
        )

    # Update Cal year labels
    if prices.get("ttf_cal_next_label"):
        html = re.sub(
            r'(TTF Natural Gas</h4>.*?<span class="hero-price-label">)Cal \d{4}',
            rf'\g<1>{prices["ttf_cal_next_label"]}',
            html, flags=re.DOTALL, count=1
        )

    if prices.get("power_cal_next_label"):
        html = re.sub(
            r'(Belgian Power Baseload</h4>.*?<span class="hero-price-label">)Cal \d{4}',
            rf'\g<1>{prices["power_cal_next_label"]}',
            html, flags=re.DOTALL, count=1
        )

    # --- Update price values if we got them ---
    # We use positional matching within the hero card groups
    price_pattern = r'(<span class="hero-price-value">)(\d+\.\d+)( <small>EUR/MWh</small></span>)'
    price_matches = list(re.finditer(price_pattern, html))

    price_values = [
        prices.get("ttf_front_month"),
        prices.get("ttf_cal_next"),
        prices.get("power_front_month"),
        prices.get("power_cal_next"),
    ]

    # Replace prices from last to first to preserve positions
    for match, value in reversed(list(zip(price_matches, price_values))):
        if value:
            html = html[:match.start(2)] + value + html[match.end(2):]

    # --- Update news ticker slides ---
    if news_items:
        ticker_html = build_ticker_html(news_items, date_short)
        html = re.sub(
            r'(<div class="news-ticker-slides" id="newsSlides">)\s*'
            r'(.*?)'
            r'(\s*</div>\s*</div>\s*<div class="news-ticker-nav">)',
            rf'\1\n{ticker_html}\n            \3',
            html, flags=re.DOTALL
        )

    with open(INDEX_HTML, "w", encoding="utf-8") as f:
        f.write(html)


def save_data_log(prices, news_items):
    """Save fetched data to JSON log for debugging/audit."""
    now = datetime.now(CET)
    data = {
        "updated_at": now.isoformat(),
        "prices": prices,
        "news": news_items,
    }
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def main():
    now = datetime.now(CET)
    print(f"=== Energy Data Update — {now.strftime('%Y-%m-%d %H:%M CET')} ===")

    if not os.path.exists(INDEX_HTML):
        print(f"ERROR: {INDEX_HTML} not found")
        sys.exit(1)

    # Fetch prices
    print("\n[1/2] Fetching energy prices...")
    prices = fetch_energy_prices()
    prices_found = sum(1 for v in prices.values() if v is not None)
    print(f"  Got {prices_found} price data points")

    # Fetch news
    print("\n[2/2] Fetching energy news...")
    news_items = fetch_energy_news()
    print(f"  Got {len(news_items)} news headlines")

    # Update HTML
    print("\n[Update] Writing to index.html...")
    update_index_html(prices, news_items)

    # Save log
    save_data_log(prices, news_items)
    print(f"  Data log saved to {DATA_FILE}")

    print("\n=== Update complete ===")


if __name__ == "__main__":
    main()
