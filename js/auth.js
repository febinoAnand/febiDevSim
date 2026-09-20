// Client-side session gating backed by the Users/Roles store in AppStorage.
// Passwords are stored in plain text in localStorage — fine for this UI demo,
// not a real security boundary.
var Auth = (function () {
  var SESSION_KEY = "ds_session";

  function authenticate(username, password) {
    var user = AppStorage.getUserByUsername(username);
    if (!user || user.password !== password) return null;
    return user;
  }

  function login(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      loggedIn: true,
      userId: user.id,
      username: user.username,
      name: user.name,
      roleId: user.roleId,
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
      return;
    }
    if (!currentRole()) {
      // Session predates the Users/Roles model, or its role no longer exists — force a clean re-login
      // rather than silently rendering a dashboard where every permission check fails.
      logout();
    }
  }

  function redirectIfLoggedIn() {
    if (isLoggedIn()) {
      window.location.href = "dashboard.html";
    }
  }

  function currentRole() {
    var session = getSession();
    if (!session) return null;
    return AppStorage.getRole(session.roleId) || null;
  }

  function hasPermission(module, action) {
    var role = currentRole();
    return !!(role && role.permissions && role.permissions[module] && role.permissions[module][action]);
  }

  return {
    authenticate: authenticate,
    login: login,
    logout: logout,
    getSession: getSession,
    isLoggedIn: isLoggedIn,
    requireAuth: requireAuth,
    redirectIfLoggedIn: redirectIfLoggedIn,
    currentRole: currentRole,
    hasPermission: hasPermission
  };
})();
