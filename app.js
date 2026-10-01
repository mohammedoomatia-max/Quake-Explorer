const BASE = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/";
const FEEDS = {
  "all_day": "Past 24 hours, all magnitudes",
  "2.5_week": "Past 7 days, magnitude 2.5 and up",
  "4.5_month": "Past 30 days, magnitude 4.5 and up"
};
const $ = id => document.getElementById(id);
const PAGE = 50;
let events = [], shown = PAGE, region = null, ctl = null;

function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => k in e ? (e[k] = v) : e.setAttribute(k, v));
  kids.forEach(k => e.append(k));
  return e;
}
function box(kind, title, lines, retry) {
  const b = h("div", { className: "box " + kind });
  if (kind === "error") b.setAttribute("role", "alert");
  b.append(h("h2", {}, title));
  lines.forEach(t => b.append(h("p", {}, t)));
  if (retry) b.append(h("button", { type: "button", onclick: load }, "Try again"));
  $("status").replaceChildren(b);
}
function regionOf(place) {
  const p = place || "Unknown location";
  if (p.includes(",")) return p.split(",").pop().trim();
  return p.replace(/^\d+\s*km\s+\w+\s+of\s+/i, "");
}

async function load() {
  if (ctl) ctl.abort();
  ctl = new AbortController();
  const sim = $("sim").value, feed = $("feed").value;
  $("content").hidden = true;
  box("loading", "Loading earthquakes…", ["Contacting the USGS feed."]);
  const slowHint = setTimeout(() =>
    box("loading", "Still loading…", ["The USGS feed is slower than usual. Waiting up to 20 seconds in total."]), 4000);
  const timeout = setTimeout(() => ctl.abort("timeout"), 20000);
  try {
    if (sim === "slow") await new Promise(r => setTimeout(r, 8000));
    const url = sim === "fail" ? "https://earthquake.usgs.invalid/feed.geojson" : BASE + feed + ".geojson";
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw Object.assign(new Error("http"), { status: res.status });
    const data = await res.json();
    if (!data || !Array.isArray(data.features)) throw new Error("shape");
    events = data.features.map(f => ({
      id: f.id, mag: f.properties.mag, place: f.properties.place || "Unknown location",
      time: f.properties.time, url: f.properties.url, status: f.properties.status,
      depth: f.geometry && f.geometry.coordinates ? f.geometry.coordinates[2] : null,
      region: regionOf(f.properties.place)
    })).filter(e => typeof e.mag === "number");
    region = null; shown = PAGE;
    $("status").replaceChildren();
    render();
  } catch (e) {
    clearTimeout(slowHint); clearTimeout(timeout);
    if (e.name === "AbortError" && ctl.signal.reason !== "timeout") return;
    if (ctl.signal.reason === "timeout")
      box("error", "The USGS feed did not respond in time", ["Waited 20 seconds without a reply.", "Check your connection and press Try again, or choose a smaller time window."], true);
    else if (e.status)
      box("error", "The USGS feed returned an error (" + e.status + ")", ["This is usually temporary. Press Try again in a moment."], true);
    else if (e.message === "shape")
      box("error", "The USGS feed sent data in an unexpected format", ["Nothing can be shown for now. Press Try again later."], true);
    else
      box("error", "Couldn't reach the USGS feed", ["Check your internet connection, then press Try again."], true);
    return;
  }
  clearTimeout(slowHint); clearTimeout(timeout);
}

function filtered() {
  const min = +$("min").value, q = $("q").value.trim().toLowerCase();
  const out = events.filter(e => e.mag >= min && (!q || e.place.toLowerCase().includes(q)));
  return out;
}
function render() {
  $("minv").textContent = $("min").value;
  const base = filtered();
  const list = base.filter(e => !region || e.region === region)
    .sort($("sort").value === "mag" ? (a, b) => b.mag - a.mag : (a, b) => b.time - a.time);
  $("content").hidden = false;

  if (!events.length) {
    $("summary").textContent = "The feed returned no earthquakes for this window.";
    $("regions").replaceChildren(); $("list").replaceChildren(); $("more").hidden = true; return;
  }
  const top = list.slice().sort((a, b) => b.mag - a.mag)[0];
  $("summary").textContent = list.length
    ? list.length + " of " + events.length + " earthquakes match. Strongest: M" + top.mag.toFixed(1) + ", " + top.place + "."
    : "0 of " + events.length + " earthquakes match these filters.";

  const counts = {};
  base.forEach(e => { (counts[e.region] ||= { n: 0, max: 0 }); counts[e.region].n++; counts[e.region].max = Math.max(counts[e.region].max, e.mag); });
  const rows = Object.entries(counts).sort((a, b) => b[1].n - a[1].n).slice(0, 8);
  const maxN = rows.length ? rows[0][1].n : 1;
  $("regions").replaceChildren(...rows.map(([name, c]) => {
    const b = h("button", { type: "button", "aria-pressed": String(region === name),
      onclick: () => { region = region === name ? null : name; shown = PAGE; render(); } },
      h("span", {}, name), h("span", { className: "bar", style: "width:" + Math.max(2, c.n / maxN * 100) + "%" }),
      h("span", {}, String(c.n)));
    b.title = c.n + " earthquakes, strongest M" + c.max.toFixed(1);
    return h("li", {}, b);
  }));

  if (!list.length) {
    $("list").replaceChildren(h("li", { className: "box empty" },
      h("strong", {}, "No earthquakes match."), " Lower the minimum magnitude, clear the place text, or pick a longer time window."));
    $("more").hidden = true; return;
  }
  $("list").replaceChildren(...list.slice(0, shown).map(e => h("li", {},
    h("div", { className: "mag" }, e.mag.toFixed(1)),
    h("div", {},
      h("a", { href: e.url, rel: "noopener" }, e.place), h("br"),
      h("span", { className: "meta" },
        new Date(e.time).toLocaleString() + (e.depth != null ? " · depth " + e.depth.toFixed(0) + " km" : "") +
        " · " + (e.status === "reviewed" ? "reviewed" : "automatic"))))));
  $("more").hidden = list.length <= shown;
  $("more").textContent = "Show " + Math.min(PAGE, list.length - shown) + " more";
}

Object.entries(FEEDS).forEach(([v, l]) => $("feed").append(h("option", { value: v }, l)));
$("feed").value = "2.5_week";
$("feed").onchange = $("sim").onchange = load;
["min", "q", "sort"].forEach(id => $(id).addEventListener("input", () => { shown = PAGE; if (events.length) render(); }));
$("more").onclick = () => { shown += PAGE; render(); };
load();
