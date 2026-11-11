(() => {
  "use strict";

  const DAYS = [
    "zondag", "maandag", "dinsdag", "woensdag",
    "donderdag", "vrijdag", "zaterdag",
  ];
  const MONTHS = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december",
  ];

  /** Luxe paletten: wisselen elk half uur (slot 0–47 per dag) */
  const PALETTES = [
    { name: "Midnight Gold", bg: "#0a0907", fg: "#f3e3c2", muted: "rgba(243,227,194,0.55)", accent: "#c9a227", soft: "rgba(201,162,39,0.18)", glow: "rgba(201,162,39,0.28)" },
    { name: "Emerald Night", bg: "#061210", fg: "#e8f5ee", muted: "rgba(232,245,238,0.52)", accent: "#3d9b6e", soft: "rgba(61,155,110,0.18)", glow: "rgba(61,155,110,0.28)" },
    { name: "Royal Navy", bg: "#070b14", fg: "#e8eef8", muted: "rgba(232,238,248,0.52)", accent: "#7aa2e3", soft: "rgba(122,162,227,0.16)", glow: "rgba(122,162,227,0.26)" },
    { name: "Burgundy Silk", bg: "#12080c", fg: "#f6e6e8", muted: "rgba(246,230,232,0.52)", accent: "#c45c6a", soft: "rgba(196,92,106,0.16)", glow: "rgba(196,92,106,0.26)" },
    { name: "Onyx Rose", bg: "#100c0d", fg: "#f7e8e4", muted: "rgba(247,232,228,0.55)", accent: "#d4a59a", soft: "rgba(212,165,154,0.16)", glow: "rgba(212,165,154,0.26)" },
    { name: "Arctic Platinum", bg: "#0b0e12", fg: "#eef3f8", muted: "rgba(238,243,248,0.55)", accent: "#a8b8c8", soft: "rgba(168,184,200,0.14)", glow: "rgba(168,184,200,0.22)" },
    { name: "Amber Lounge", bg: "#100c06", fg: "#ffe8c4", muted: "rgba(255,232,196,0.55)", accent: "#e0a040", soft: "rgba(224,160,64,0.18)", glow: "rgba(224,160,64,0.28)" },
    { name: "Deep Amethyst", bg: "#0c0914", fg: "#efe8fa", muted: "rgba(239,232,250,0.52)", accent: "#9b7ed9", soft: "rgba(155,126,217,0.16)", glow: "rgba(155,126,217,0.26)" },
    { name: "Champagne Noir", bg: "#0d0b08", fg: "#f8efd8", muted: "rgba(248,239,216,0.55)", accent: "#d4b978", soft: "rgba(212,185,120,0.16)", glow: "rgba(212,185,120,0.26)" },
    { name: "Teal Velvet", bg: "#061012", fg: "#e5f6f6", muted: "rgba(229,246,246,0.52)", accent: "#3eb5b0", soft: "rgba(62,181,176,0.16)", glow: "rgba(62,181,176,0.26)" },
    { name: "Copper Dusk", bg: "#120c08", fg: "#f6e7d8", muted: "rgba(246,231,216,0.55)", accent: "#c47a4a", soft: "rgba(196,122,74,0.16)", glow: "rgba(196,122,74,0.26)" },
    { name: "Ivory Ink", bg: "#0e0e10", fg: "#f2f0ea", muted: "rgba(242,240,234,0.55)", accent: "#e0d8c4", soft: "rgba(224,216,196,0.12)", glow: "rgba(224,216,196,0.2)" },
  ];

  const WMO = {
    0: ["☀️", "Helder"],
    1: ["🌤", "Overwegend helder"],
    2: ["⛅", "Half bewolkt"],
    3: ["☁️", "Bewolkt"],
    45: ["🌫", "Mist"],
    48: ["🌫", "IJsmist"],
    51: ["🌦", "Lichte motregen"],
    53: ["🌦", "Motregen"],
    55: ["🌧", "Zware motregen"],
    61: ["🌦", "Lichte regen"],
    63: ["🌧", "Regen"],
    65: ["🌧", "Zware regen"],
    71: ["🌨", "Lichte sneeuw"],
    73: ["🌨", "Sneeuw"],
    75: ["❄️", "Zware sneeuw"],
    80: ["🌦", "Lichte buien"],
    81: ["🌧", "Buien"],
    82: ["⛈", "Zware buien"],
    95: ["⛈", "Onweer"],
    96: ["⛈", "Onweer met hagel"],
    99: ["⛈", "Zwaar onweer"],
  };

  const el = {
    time: document.getElementById("time"),
    seconds: document.getElementById("seconds"),
    date: document.getElementById("date"),
    weekday: document.getElementById("weekday"),
    weather: document.getElementById("weather"),
    weatherIcon: document.getElementById("weatherIcon"),
    weatherTemp: document.getElementById("weatherTemp"),
    weatherDesc: document.getElementById("weatherDesc"),
    paletteDot: document.getElementById("paletteDot"),
    btnSettings: document.getElementById("btnSettings"),
    btnFullscreen: document.getElementById("btnFullscreen"),
    settings: document.getElementById("settings"),
    cityInput: document.getElementById("cityInput"),
    showSeconds: document.getElementById("showSeconds"),
    use24h: document.getElementById("use24h"),
    keepAwake: document.getElementById("keepAwake"),
    btnLocate: document.getElementById("btnLocate"),
  };

  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* ignore */
      }
    },
  };

  const state = {
    showSeconds: store.get("lk_showSeconds", true),
    use24h: store.get("lk_use24h", true),
    keepAwake: store.get("lk_keepAwake", true),
    city: store.get("lk_city", "Amsterdam"),
    lat: store.get("lk_lat", 52.3676),
    lon: store.get("lk_lon", 4.9041),
    wakeLock: null,
    lastPaletteSlot: -1,
    weatherTimer: null,
  };

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function halfHourSlot(d = new Date()) {
    return d.getHours() * 2 + (d.getMinutes() >= 30 ? 1 : 0);
  }

  function applyPalette(slot) {
    const p = PALETTES[slot % PALETTES.length];
    const root = document.documentElement;
    root.style.setProperty("--bg", p.bg);
    root.style.setProperty("--fg", p.fg);
    root.style.setProperty("--muted", p.muted);
    root.style.setProperty("--accent", p.accent);
    root.style.setProperty("--accent-soft", p.soft);
    root.style.setProperty("--glow", p.glow);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", root.style.getPropertyValue("--scene-bg") || p.bg);
    el.paletteDot.title = `Kleuren: ${p.name} (wisselt elk half uur)`;
  }

  function tick() {
    const now = new Date();
    const slot = halfHourSlot(now);
    if (slot !== state.lastPaletteSlot) {
      state.lastPaletteSlot = slot;
      applyPalette(slot);
    }

    let h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();

    if (!state.use24h) {
      const ap = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      el.time.textContent = `${h}:${pad(m)}`;
      el.seconds.textContent = state.showSeconds ? `${pad(s)} ${ap}` : ap;
    } else {
      el.time.textContent = `${pad(h)}:${pad(m)}`;
      el.seconds.textContent = pad(s);
    }

    el.seconds.classList.toggle("hidden", !state.showSeconds && state.use24h);
    el.date.textContent = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    el.weekday.textContent = DAYS[now.getDay()];
  }

  async function requestWakeLock() {
    if (!state.keepAwake) {
      releaseWakeLock();
      return;
    }
    if (!("wakeLock" in navigator)) return;
    try {
      state.wakeLock = await navigator.wakeLock.request("screen");
      state.wakeLock.addEventListener("release", () => {
        /* stil opnieuw proberen bij volgende touch */
      });
    } catch {
      /* Android laat wake lock soms los; touch herstelt het */
    }
  }

  async function releaseWakeLock() {
    try {
      await state.wakeLock?.release();
    } catch {
      /* ignore */
    }
    state.wakeLock = null;
  }

  function weatherFromCode(code) {
    return WMO[code] || ["🌡", "Onbekend"];
  }

  async function fetchWeather() {
    el.weatherDesc.textContent = "Weer laden…";
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${state.lat}&longitude=${state.lon}` +
        `&current=temperature_2m,weather_code` +
        `&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("netwerk");
      const data = await res.json();
      const t = Math.round(data.current.temperature_2m);
      const [icon, desc] = weatherFromCode(data.current.weather_code);
      el.weatherIcon.textContent = icon;
      el.weatherTemp.textContent = `${t}°`;
      el.weatherDesc.textContent = `${desc} · ${state.city}`;
    } catch {
      el.weatherIcon.textContent = "—";
      el.weatherTemp.textContent = "--°";
      el.weatherDesc.textContent = "Geen weer · check wifi";
    }
  }

  async function geocodeCity(name) {
    const q = encodeURIComponent(name.trim());
    if (!q) throw new Error("lege plaats");
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=nl&format=json`
    );
    if (!res.ok) throw new Error("geocode");
    const data = await res.json();
    if (!data.results?.length) throw new Error("niet gevonden");
    const r = data.results[0];
    return {
      city: r.name,
      lat: r.latitude,
      lon: r.longitude,
    };
  }

  function useLocation(lat, lon, city) {
    state.lat = lat;
    state.lon = lon;
    state.city = city;
    store.set("lk_lat", lat);
    store.set("lk_lon", lon);
    store.set("lk_city", city);
    el.cityInput.value = city;
    fetchWeather();
  }

  function locateGps() {
    if (!navigator.geolocation) {
      el.weatherDesc.textContent = "GPS niet beschikbaar";
      return;
    }
    el.weatherDesc.textContent = "Locatie ophalen…";
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let city = "Huidige locatie";
        try {
          const rev = await fetch(
            `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=nl&format=json`
          );
          // reverse endpoint may not exist on open-meteo free; fallback
          if (rev.ok) {
            const d = await rev.json();
            if (d.name) city = d.name;
          }
        } catch {
          /* keep default label */
        }
        // Better reverse via bigdatacloud free or just coords label
        try {
          const r2 = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=nl`
          );
          if (r2.ok) {
            const d2 = await r2.json();
            city = d2.city || d2.locality || d2.principalSubdivision || city;
          }
        } catch {
          /* ignore */
        }
        useLocation(latitude, longitude, city);
      },
      () => {
        el.weatherDesc.textContent = "Locatie geweigerd · typ plaats";
      },
      { enableHighAccuracy: false, timeout: 12000 }
    );
  }

  async function enterFullscreen() {
    const node = document.documentElement;
    try {
      if (!document.fullscreenElement) {
        await node.requestFullscreen?.();
        // iOS / older Android Chrome
        if (screen.orientation?.lock) {
          try {
            await screen.orientation.lock("any");
          } catch {
            /* ignore */
          }
        }
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      /* fullscreen niet beschikbaar; PWA-startscherm werkt wel */
    }
  }

  function openSettings() {
    el.cityInput.value = state.city;
    el.showSeconds.checked = state.showSeconds;
    el.use24h.checked = state.use24h;
    el.keepAwake.checked = state.keepAwake;
    el.settings.showModal();
  }

  async function saveSettings() {
    state.showSeconds = el.showSeconds.checked;
    state.use24h = el.use24h.checked;
    state.keepAwake = el.keepAwake.checked;
    store.set("lk_showSeconds", state.showSeconds);
    store.set("lk_use24h", state.use24h);
    store.set("lk_keepAwake", state.keepAwake);

    const city = el.cityInput.value.trim();
    if (city && city !== state.city) {
      try {
        const g = await geocodeCity(city);
        useLocation(g.lat, g.lon, g.city);
      } catch {
        el.weatherDesc.textContent = "Plaats niet gevonden";
      }
    }

    if (state.keepAwake) requestWakeLock();
    else releaseWakeLock();
    tick();
  }

  function bind() {
    el.btnSettings.addEventListener("click", openSettings);
    el.btnFullscreen.addEventListener("click", enterFullscreen);
    el.weather.addEventListener("click", fetchWeather);
    el.btnLocate.addEventListener("click", (e) => {
      e.preventDefault();
      locateGps();
    });

    el.settings.addEventListener("close", () => {
      // only persist when closed via form submit or backdrop on some browsers
      saveSettings();
    });

    // Heractiveer wake lock na tab terug / scherm aan
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && state.keepAwake) {
        requestWakeLock();
      }
    });

    // Tik ergens = wake lock opnieuw (Android lost 'm soms)
    document.addEventListener("pointerdown", () => {
      if (state.keepAwake && !state.wakeLock) requestWakeLock();
    }, { passive: true });

    // Voorkom onbedoelde pull-to-refresh storend in PWA
    document.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1 && !el.settings.open) {
        // allow inside dialog only; main is no-scroll already
      }
    }, { passive: true });
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./sw.js?v=2.0.2", {scope: "./", updateViaCache: "none"}).catch(() => {
      /* offline install optioneel */
    });
  }

  function init() {
    el.cityInput.value = state.city;
    el.showSeconds.checked = state.showSeconds;
    el.use24h.checked = state.use24h;
    el.keepAwake.checked = state.keepAwake;

    bind();
    tick();
    setInterval(tick, 250);
    fetchWeather();
    // Weer elk 20 min
    state.weatherTimer = setInterval(fetchWeather, 20 * 60 * 1000);
    requestWakeLock();
    registerSW();
  }

  init();
})();
