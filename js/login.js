(function () {
  Auth.redirectIfLoggedIn();

  var form = document.getElementById("loginForm");
  var errorEl = document.getElementById("loginError");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var username = document.getElementById("username").value.trim();
    var password = document.getElementById("password").value.trim();

    if (!username || !password) {
      errorEl.textContent = "Please enter a username and password.";
      return;
    }

    errorEl.textContent = "";
    Auth.login(username);
    window.location.href = "dashboard.html";
  });
})();
