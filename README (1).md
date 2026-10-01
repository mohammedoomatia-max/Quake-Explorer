# Quake Explorer

A small web app that makes the USGS earthquake feed easier to question than the raw GeoJSON. Data source: the [USGS Earthquake Hazards Program summary feeds](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php) (public, no API key).

## Questions it lets you answer
- Which earthquakes were strongest in the last day, week or month?
- Which regions appear most often in the feed, and how strong was the largest event there?
- What was reported near a place I care about? (Filter by place text such as "Japan" or "Alaska".)
- Is a given magnitude automatic or human-reviewed, and how deep was it?

The raw feed is one long list sorted by time. Here, minimum magnitude, place text and region filters combine, and the region summary shows where events cluster.

## Run it locally
No build step and no dependencies.

```bash
git clone <this-repo-url>
cd quake-explorer
python3 -m http.server 8000
```
Then open http://localhost:8000. Opening `index.html` directly also works. An internet connection is required because data is fetched live from USGS.

## Slow and failing responses
- After **4 seconds** the loading message changes to say the feed is slower than usual.
- After **20 seconds** the request is cancelled and an error says nothing arrived, with a **Try again** button.
- HTTP errors, network failures and a response in an unexpected format each get their own message.
- Changing the time window cancels the previous request, so late responses never overwrite newer ones.
- A successful response with no earthquakes, or filters that match nothing, is shown as a result, not as an error.

**To test without editing code:** open "Reviewer: test a slow or failing source" and choose *Slow* (adds an 8 second delay, so the slow message appears) or *Failing* (sends the request to an unreachable host, so the error appears).

## What the data supports, and what it does not
It supports: seeing what USGS has detected and published recently, comparing strength and depth, and finding events near a named place.

It does **not** support:
- **Predicting earthquakes or judging risk.** The feed is a record of past events only.
- **Comparing how active regions are.** Detection is better where seismic networks are dense (for example the US). Small events elsewhere are often missing, so counts reflect monitoring coverage as well as activity.
- **Comparing counts across time windows.** The three windows use different minimum magnitudes, so their counts cannot be compared.
- **Spotting trends.** One day to 30 days is too short to say anything about long-term change.
- **Final magnitudes.** "Automatic" entries can be revised after review.
- **Exact regions.** Regions are parsed from USGS place text (usually the part after the last comma), so naming is inconsistent: "CA" and "California" may appear separately.

## Files
`index.html` (structure), `style.css` (styles), `app.js` (fetching, states, filtering).
