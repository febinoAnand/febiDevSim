// Simple client-side session gating (UI-only, no real credential verification).
var Auth = (function () {
  var SESSION_KEY = "ds_session";

  function login(username) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      loggedIn: true,
      username: username,
      loginAt: new Date().toISOString()
    }));
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = "index.html";
  }

  function getSession() {
    var raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function isLoggedIn() {
    var session = getSession();
    return !!(session && session.loggedIn);
  }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = "index.html";
    }
  }

  function redirectIfLoggedIn() {
    if (isLoggedIn()) {
      window.location.href = "dashboard.html";
    }
  }

  return {
    login: login,
    logout: logout,
    getSession: getSession,
    isLoggedIn: isLoggedIn,
    requireAuth: requireAuth,
    redirectIfLoggedIn: redirectIfLoggedIn
  };
})();
