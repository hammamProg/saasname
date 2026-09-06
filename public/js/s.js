/*! SaaSNa.me analytics tracker — cookieless, no local storage written.
 *
 *  <script defer data-site="<uuid>" src="https://saasna.me/js/s.js"></script>
 *
 *  Attributes:
 *    data-site     required. The site id from your dashboard.
 *    data-host     override the collection origin (proxy past blockers).
 *    data-domains  comma-separated hostname allowlist.
 *    data-dnt      "true" to honour navigator.doNotTrack. Off by default.
 *
 *  Kill switch for your own visits: localStorage.setItem('sn_ignore', '1')
 *
 *  Served static and unminified on purpose for now: it is small, it is read by
 *  the people installing it, and a build step is not yet worth its weight.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var siteId = script.getAttribute("data-site");
  if (!siteId) return;

  var host =
    script.getAttribute("data-host") || new URL(script.src).origin;
  var endpoint = host.replace(/\/$/, "") + "/api/webstats/event";

  var allowed = (script.getAttribute("data-domains") || "")
    .split(",")
    .map(function (d) { return d.trim(); })
    .filter(Boolean);

  var honourDnt = script.getAttribute("data-dnt") === "true";

  /* ---------------------------------------------------------------------
   * Should we track at all?
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
    } catch (e) {
      // Storage can be blocked outright; that is not a reason to stop.
    }

    return false;
  }

  if (disabled()) return;

  /* ---------------------------------------------------------------------
   * Transport
   * ------------------------------------------------------------------- */

  function send(payload) {
    try {
      // text/plain keeps this a CORS "simple request", so the browser never
      // fires a preflight — halving the requests each pageview costs.
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: "omit",
        mode: "cors",
      }).catch(function () {});
    } catch (e) {
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

  /* ---------------------------------------------------------------------
   * Pageviews
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
  }

  /* ---------------------------------------------------------------------
   * Engagement
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
   * SPA navigation
   *
   * All four cases are handled. Competitors each miss at least one: Umami has
   * no popstate listener, so back-button navigations go untracked; Datafast
   * compares pathname only, so hash routes never fire.
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

  /* ---------------------------------------------------------------------
   * Public API — window.saasname('event-name', { key: 'value' })
   * Reserved for the custom-events phase; the server already accepts it.
   * ------------------------------------------------------------------- */

  window.saasname = function (name, data) {
    var payload = base();
    payload.t = "event";
    payload.n = name;
    if (data) payload.d = data;
    send(payload);
  };

  pageview();
})();
