/*! SaaSNa.me analytics tracker.
 *
 *  <script defer data-site="<uuid>" src="https://www.saasna.me/js/s.js"></script>
 *
 *  Attributes:
 *    data-site     required. The site id from your dashboard.
 *    data-host     override the collection origin (proxy past blockers).
 *    data-domains  comma-separated hostname allowlist.
 *    data-dnt      "true" to honour navigator.doNotTrack. Off by default.
 *
 *  Kill switch for your own visits: localStorage.setItem('sn_ignore', '1')
 *
 *  Two pipelines live in this one file, deliberately kept independent:
 *
 *  1. The legacy pageview beacon (unchanged from earlier versions), posted to
 *     /api/webstats/event. Cookieless — identity is a server-derived,
 *     daily-rotating salted hash of IP + user agent + domain. This is what
 *     powers the existing dashboard, and nothing below touches it.
 *
 *  2. The identity pipeline: a real first-party visitor_id cookie, rolling
 *     30-minute sessions, identify()/reset()/setConsent() and custom
 *     events, posted to /api/webstats/collect. Exposed as
 *     window.saasname(...) for the legacy one-arg shorthand, and as
 *     window.saasname.track/identify/reset/setConsent/page/getVisitorId/
 *     getSessionId.
 *
 *  Served static and unminified on purpose for now: it is small, it is read
 *  by the people installing it, and a build step is not yet worth its weight.
 */
(function () {
  "use strict";

  /* `document.currentScript` covers the common cases, including a tag that
   * was appended from JS — it is set during execution however the element got
   * into the document. It is null for module scripts and for anything running
   * out of a callback or eval, so a tag installed as type="module" would
   * otherwise make the tracker silently do nothing with no error to explain
   * why. Fall back to finding our own tag in the DOM. */
  var script =
    document.currentScript ||
    document.querySelector("script[data-site]") ||
    document.querySelector('script[src*="/js/s.js"]');

  if (!script) return;

  var siteId = script.getAttribute("data-site");
  if (!siteId) return;

  // script.src can be empty if the tag was found by [data-site] but carries
  // no source, so the origin lookup is guarded rather than allowed to throw
  // inside someone else's page.
  var host = script.getAttribute("data-host");
  if (!host && script.src) {
    try {
      host = new URL(script.src).origin;
    } catch {
      host = "";
    }
  }
  if (!host) return;

  var legacyEndpoint = host.replace(/\/$/, "") + "/api/webstats/event";
  var collectEndpoint = host.replace(/\/$/, "") + "/api/webstats/collect";

  var allowed = (script.getAttribute("data-domains") || "")
    .split(",")
    .map(function (d) { return d.trim(); })
    .filter(Boolean);

  var honourDnt = script.getAttribute("data-dnt") === "true";

  /* ---------------------------------------------------------------------
   * Should we track at all? Shared by both pipelines.
   * ------------------------------------------------------------------- */

  function disabled() {
    var loc = window.location;

    // Local development is not traffic. Counting it would poison a new site's
    // first numbers, which is exactly when they matter most.
    if (
      loc.protocol === "file:" ||
      loc.hostname === "localhost" ||
      loc.hostname === "127.0.0.1" ||
      loc.hostname === "[::1]" ||
      loc.hostname === "::1"
    ) {
      return true;
    }

    if (allowed.length && allowed.indexOf(loc.hostname) === -1) return true;

    // Headless browsers and automation drivers. Real visitors have none of
    // these; scrapers and CI runs have at least one.
    if (
      navigator.webdriver ||
      window._phantom ||
      window.__nightmare ||
      window.Cypress
    ) {
      return true;
    }

    if (honourDnt) {
      var dnt =
        navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
      if (dnt === "1" || dnt === 1 || dnt === "yes") return true;
    }

    try {
      if (window.localStorage.getItem("sn_ignore")) return true;
    } catch {
      // Storage can be blocked outright; that is not a reason to stop.
    }

    return false;
  }

  if (disabled()) return;

  /* ---------------------------------------------------------------------
   * Legacy transport — unchanged.
   * ------------------------------------------------------------------- */

  function send(payload) {
    try {
      // text/plain keeps this a CORS "simple request", so the browser never
      // fires a preflight — halving the requests each pageview costs.
      fetch(legacyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: "omit",
        mode: "cors",
      }).catch(function () {});
    } catch {
      // Analytics must never throw into the host page.
    }
  }

  function base() {
    return {
      s: siteId,
      u: window.location.href,
      r: document.referrer || null,
      ti: document.title || null,
      sc: window.screen.width + "x" + window.screen.height,
      l: navigator.language || null,
    };
  }

  /** The original window.saasname('event-name', data) contract, unchanged.
   *  Posted to the legacy endpoint and counted in the legacy `events` column
   *  on webstats_visit_hourly, which the existing dashboard's bounce-rate
   *  calculation reads (metrics.ts: a bounce is one pageview and zero
   *  events). Redirecting this call to the new pipeline instead would
   *  silently change bounce rate for every already-installed site the
   *  moment this file deploys — so it stays exactly as it was. */
  function legacyEvent(name, data) {
    var payload = base();
    payload.t = "event";
    payload.n = name;
    if (data) payload.d = data;
    send(payload);
  }

  /* ---------------------------------------------------------------------
   * Legacy pageviews — unchanged, except each call also drives the new
   * pipeline's page() (see identityPage() below), so both pipelines observe
   * exactly the same navigation events rather than each patching history
   * separately.
   * ------------------------------------------------------------------- */

  var lastUrl = null;

  function pageview() {
    var url = window.location.href;

    // Guards against the double-fire that pushState + popstate can produce
    // for a single navigation.
    if (url === lastUrl) return;
    lastUrl = url;

    resetEngagement();
    send(base());
    identityPage();
  }

  /* ---------------------------------------------------------------------
   * Engagement — unchanged.
   *
   * Without this, duration is last-event minus first-event, so every
   * single-page visit is exactly zero seconds and both average duration and
   * bounce rate stop meaning anything.
   * ------------------------------------------------------------------- */

  var engagedMs = 0;
  var since = Date.now();
  var visible = document.visibilityState === "visible";

  function resetEngagement() {
    engagedMs = 0;
    since = Date.now();
    visible = document.visibilityState === "visible";
  }

  function accrue() {
    if (visible) engagedMs += Date.now() - since;
    since = Date.now();
  }

  function flushEngagement() {
    accrue();
    if (engagedMs < 1000) return;

    var payload = base();
    payload.t = "engagement";
    payload.e = engagedMs;
    send(payload);
    engagedMs = 0;
  }

  document.addEventListener("visibilitychange", function () {
    accrue();
    visible = document.visibilityState === "visible";
    if (!visible) flushEngagement();
  });

  window.addEventListener("pagehide", flushEngagement);

  /* ---------------------------------------------------------------------
   * SPA navigation — unchanged. All four cases are handled: pushState,
   * replaceState, popstate (back/forward), hashchange, and bfcache restore.
   * ------------------------------------------------------------------- */

  function patch(name) {
    var original = history[name];
    if (typeof original !== "function") return;

    history[name] = function () {
      var result = original.apply(this, arguments);
      // Deferred so the framework has committed the new URL first.
      setTimeout(pageview, 0);
      return result;
    };
  }

  patch("pushState");
  patch("replaceState");

  window.addEventListener("popstate", pageview);
  window.addEventListener("hashchange", pageview);

  // Restored from the back-forward cache: a fresh view of the page, and the
  // engagement clock from before the freeze is meaningless.
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    lastUrl = null;
    pageview();
  });

  /* =======================================================================
   * Identity pipeline: visitor_id, sessions, identify/reset/setConsent,
   * custom events.
   * ===================================================================== */

  var VISITOR_COOKIE = "_sn_vid";
  var VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years, in seconds
  var SESSION_KEY = "_sn_session_" + siteId;
  var USER_KEY = "_sn_uid_" + siteId;
  var CONSENT_KEY = "_sn_consent_" + siteId;
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  function uuid() {
    if (window.crypto && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    // Fallback for browsers without crypto.randomUUID (Safari < 15.4 etc.).
    // Still cryptographically random via getRandomValues where available.
    var bytes = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (var i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    var hex = [];
    for (var j = 0; j < 256; j++) hex[j] = (j + 0x100).toString(16).substr(1);

    return (
      hex[bytes[0]] + hex[bytes[1]] + hex[bytes[2]] + hex[bytes[3]] + "-" +
      hex[bytes[4]] + hex[bytes[5]] + "-" +
      hex[bytes[6]] + hex[bytes[7]] + "-" +
      hex[bytes[8]] + hex[bytes[9]] + "-" +
      hex[bytes[10]] + hex[bytes[11]] + hex[bytes[12]] + hex[bytes[13]] + hex[bytes[14]] + hex[bytes[15]]
    );
  }

  function readCookie(name) {
    var match = document.cookie.match(
      new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)")
    );
    return match ? decodeURIComponent(match[1]) : null;
  }

  function writeCookie(name, value, maxAgeSeconds) {
    var secure = window.location.protocol === "https:" ? "; Secure" : "";
    var attrs = "; Path=/; SameSite=Lax" + secure;
    if (maxAgeSeconds <= 0) {
      document.cookie = name + "=; Max-Age=0" + attrs;
    } else {
      document.cookie =
        name + "=" + encodeURIComponent(value) + "; Max-Age=" + maxAgeSeconds + attrs;
    }
  }

  function readLocal(key) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeLocal(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be blocked (private mode, quota); the session just will
      // not survive a reload, which is a degradation, not a failure.
    }
  }

  function removeLocal(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }

  // Default on, matching most analytics SDKs — a site opts OUT by calling
  // setConsent(false), typically before showing its own consent banner, and
  // opts back IN by calling setConsent(true) once the visitor accepts. See
  // docs/ANALYTICS_IDENTITY.md for the exact behaviour this implements.
  var consentGranted = true;
  try {
    if (window.localStorage.getItem(CONSENT_KEY) === "denied") {
      consentGranted = false;
    }
  } catch {}

  var visitorId = null;
  var userId = null;
  var session = null; // { id, lastActivity, isNew }

  try {
    var storedUser = window.localStorage.getItem(USER_KEY);
    if (storedUser) userId = storedUser;
  } catch {}

  function ensureVisitorId() {
    if (!consentGranted) return null;

    var existing = readCookie(VISITOR_COOKIE);
    if (existing) {
      visitorId = existing;
      return existing;
    }

    var fresh = uuid();
    writeCookie(VISITOR_COOKIE, fresh, VISITOR_COOKIE_MAX_AGE);
    visitorId = fresh;
    return fresh;
  }

  function loadOrStartSession() {
    var stored = readLocal(SESSION_KEY);
    var now = Date.now();

    if (stored && now - stored.lastActivity < SESSION_TIMEOUT_MS) {
      stored.isNew = false;
      session = stored;
      return session;
    }

    // Thirty minutes of inactivity (or no prior session at all) starts a new
    // one. This is also where a returning visitor's new session gets its own
    // fresh source capture — see collect() below.
    session = { id: uuid(), lastActivity: now, isNew: true };
    return session;
  }

  function touchSession() {
    if (!session) return;
    session.lastActivity = Date.now();
    session.isNew = false;
    writeLocal(SESSION_KEY, session);
  }

  function sendCollect(payload) {
    var body = JSON.stringify(payload);

    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: "text/plain" });
        if (navigator.sendBeacon(collectEndpoint, blob)) return;
      }
    } catch {
      // Fall through to fetch.
    }

    try {
      fetch(collectEndpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: body,
        keepalive: true,
        credentials: "omit",
        mode: "cors",
      }).catch(function () {});
    } catch {
      // Analytics must never throw into the host page.
    }
  }

  /** type: "page" | "track" | "identify". name: event name, or null.
   *  properties: a plain object of safe values, or null/undefined. */
  function collect(type, name, properties) {
    if (!consentGranted) return;

    if (!visitorId) ensureVisitorId();
    if (!visitorId) return; // Consent denied mid-call.

    if (!session) loadOrStartSession();

    var isNewSession = !!session.isNew;

    var payload = {
      s: siteId,
      t: type,
      v: visitorId,
      ss: session.id,
      e: uuid(),
      ts: Date.now(),
      url: window.location.href,
      // Only meaningful — and only sent — on the first call of a session:
      // "on the first page of every session, collect and normalize" the
      // source. A later call in the same session must not re-derive it.
      ref: isNewSession ? document.referrer || null : null,
      "new": isNewSession,
    };
    if (name) payload.n = name;
    if (properties) payload.p = properties;
    if (userId) payload.u = userId;

    touchSession();
    sendCollect(payload);
  }

  function identityPage() {
    collect("page", null, null);
  }

  function track(name, properties) {
    if (!name) return;
    collect("track", String(name), properties || null);
  }

  function identify(id, traits) {
    if (!id) return;
    userId = String(id);
    try {
      window.localStorage.setItem(USER_KEY, userId);
    } catch {}
    collect("identify", null, traits || null);
  }

  /** Removes the current identified-user state. Also rotates the visitor
   *  cookie and session: on a shared device, the point of reset() is that
   *  whoever uses the browser next must not silently continue attaching to
   *  the identity the previous, now logged-out person was using. Historical
   *  rows already written keep whatever visitor_id/user_id they were
   *  stamped with — reset() only changes what happens next. */
  function reset() {
    userId = null;
    removeLocal(USER_KEY);

    writeCookie(VISITOR_COOKIE, "", 0);
    visitorId = null;

    session = null;
    removeLocal(SESSION_KEY);
  }

  /** setConsent(false) removes the durable visitor cookie and stops tracking
   *  entirely — no identifiers are created and no requests are sent — until
   *  setConsent(true) is called again. See docs/ANALYTICS_IDENTITY.md. */
  function setConsent(granted) {
    consentGranted = !!granted;
    try {
      window.localStorage.setItem(CONSENT_KEY, consentGranted ? "granted" : "denied");
    } catch {}

    if (!consentGranted) {
      writeCookie(VISITOR_COOKIE, "", 0);
      visitorId = null;
      session = null;
      removeLocal(SESSION_KEY);
      return;
    }

    ensureVisitorId();
    loadOrStartSession();
  }

  function getVisitorId() {
    return visitorId;
  }

  function getSessionId() {
    return session ? session.id : null;
  }

  /* ---------------------------------------------------------------------
   * Public API. window.saasname('name', props) keeps its original meaning —
   * the legacy custom event, unchanged. The new pipeline is reached through
   * window.saasname.track/identify/reset/setConsent/page/etc.
   * ------------------------------------------------------------------- */

  var api = function (name, data) {
    legacyEvent(name, data);
  };
  api.page = identityPage;
  api.track = track;
  api.identify = identify;
  api.reset = reset;
  api.setConsent = setConsent;
  api.getVisitorId = getVisitorId;
  api.getSessionId = getSessionId;

  // Drain a pre-load queue. A customer who wants calls made before this
  // script finishes loading to still be captured predefines, ahead of the
  // script tag:
  //   window.saasname = window.saasname || function () {
  //     (window.saasname.q = window.saasname.q || []).push(arguments);
  //   };
  // and calls the new pipeline as saasname('track', name, props),
  // saasname('identify', id) — method name first, same convention this stub
  // uses everywhere else. Anything queued that way is replayed here, in
  // order, before the real API takes over. A queued call whose first
  // argument is not one of those method names is treated as the legacy bare
  // form, saasname('event-name', data), unchanged.
  var queued = window.saasname && window.saasname.q;
  window.saasname = api;

  if (queued) {
    for (var qi = 0; qi < queued.length; qi++) {
      var call = queued[qi];
      var methodName = call[0];
      var isMethodCall = typeof methodName === "string" && typeof api[methodName] === "function";
      var fn = isMethodCall ? api[methodName] : legacyEvent;
      if (typeof fn === "function") {
        fn.apply(null, Array.prototype.slice.call(call, isMethodCall ? 1 : 0));
      }
    }
  }

  if (consentGranted) {
    ensureVisitorId();
    loadOrStartSession();
  }

  pageview();
})();
