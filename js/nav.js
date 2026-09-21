// Shared shell behavior for every sidebar page: auth guard, per-page module
// read-permission gate, username/role label, nav link visibility, and logout.
// Runs before each page's own script.
(function () {
  Auth.requireAuth();
  AppStorage.init();

  var pageModule = document.body.getAttribute("data-page-module");
  if (pageModule && !Auth.hasPermission(pageModule, "read")) {
    window.location.href = "dashboard.html";
    return;
  }

  var session = Auth.getSession();
  var role = session ? AppStorage.getRole(session.roleId) : null;
  var usernameLabel = document.getElementById("usernameLabel");
  if (usernameLabel) {
    usernameLabel.textContent = session
      ? "Signed in as " + session.username + (role ? " (" + role.name + ")" : "")
      : "";
  }

  document.querySelectorAll(".sidebar-nav a[data-module]").forEach(function (link) {
    var mod = link.getAttribute("data-module");
    if (mod && !Auth.hasPermission(mod, "read")) {
      link.classList.add("hidden");
    }
  });

  var logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (event) {
      event.preventDefault();
      Auth.logout();
    });
  }
})();
