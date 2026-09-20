(function () {
  var USERS_PAGE_SIZE = 5;
  var usersPage = 1;

  function populateUserRoleFilterOptions() {
    var select = document.getElementById("userRoleFilter");
    var currentValue = select.value;
    var roles = AppStorage.getRoles();
    select.innerHTML = '<option value="">All Roles</option>' + roles.map(function (r) {
      return '<option value="' + r.id + '">' + Utils.escapeHtml(r.name) + '</option>';
    }).join("");
    select.value = currentValue;
  }

  function getFilteredUsers() {
    var searchTerm = document.getElementById("userSearchInput").value.trim().toLowerCase();
    var roleFilter = document.getElementById("userRoleFilter").value;

    return AppStorage.getUsers().filter(function (u) {
      var matchesSearch = !searchTerm ||
        u.username.toLowerCase().indexOf(searchTerm) !== -1 ||
        (u.name || "").toLowerCase().indexOf(searchTerm) !== -1 ||
        (u.email || "").toLowerCase().indexOf(searchTerm) !== -1;
      var matchesRole = !roleFilter || u.roleId === roleFilter;
      return matchesSearch && matchesRole;
    });
  }

  function renderUsers() {
    populateUserRoleFilterOptions();

    var allUsers = AppStorage.getUsers();
    var filtered = getFilteredUsers();
    var wrap = document.getElementById("userTableWrap");
    var canDeleteUser = Auth.hasPermission("users", "delete");
    var currentSession = Auth.getSession();

    if (allUsers.length === 0) {
      wrap.innerHTML = '<div class="empty-state">No users yet. Add one above.</div>';
      document.getElementById("userPagination").innerHTML = "";
      return;
    }

    if (filtered.length === 0) {
      wrap.innerHTML = '<div class="empty-state">No users match your filters.</div>';
      document.getElementById("userPagination").innerHTML = "";
      return;
    }

    var totalPages = Math.max(1, Math.ceil(filtered.length / USERS_PAGE_SIZE));
    if (usersPage > totalPages) usersPage = totalPages;
    var pageItems = filtered.slice((usersPage - 1) * USERS_PAGE_SIZE, usersPage * USERS_PAGE_SIZE);

    var canEditUser = Auth.hasPermission("users", "update");

    var rows = pageItems.map(function (u) {
      var role = AppStorage.getRole(u.roleId);
      var isSelf = currentSession && currentSession.userId === u.id;
      var actions = [];
      if (canEditUser) actions.push('<button class="btn btn-sm" data-edit-user="' + u.id + '">Edit</button>');
      if (isSelf) {
        actions.push('<span class="text-muted-sm">You</span>');
      } else if (canDeleteUser) {
        actions.push('<button class="btn btn-sm btn-danger" data-delete-user="' + u.id + '">Delete</button>');
      }
      return '<tr>' +
        '<td>' + Utils.escapeHtml(u.username) + '</td>' +
        '<td>' + Utils.escapeHtml(u.name || "—") + '</td>' +
        '<td>' + Utils.escapeHtml(u.email || "—") + '</td>' +
        '<td>' + (role ? '<span class="badge badge-mqtt">' + Utils.escapeHtml(role.name) + '</span>' : '<span class="text-muted-sm">No role</span>') + '</td>' +
        '<td><div class="flex gap-sm">' + actions.join("") + '</div></td>' +
        '</tr>';
    }).join("");

    wrap.innerHTML = '<table><thead><tr>' +
      '<th>Username</th><th>Name</th><th>Email</th><th>Role</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';

    Utils.renderPagination("userPagination", filtered.length, USERS_PAGE_SIZE, usersPage, function (newPage) {
      usersPage = newPage;
      renderUsers();
    });

    pageItems.forEach(function (u) {
      var editBtn = document.querySelector('[data-edit-user="' + u.id + '"]');
      if (editBtn) {
        editBtn.addEventListener("click", function () {
          openUserModal(u);
        });
      }

      var btn = document.querySelector('[data-delete-user="' + u.id + '"]');
      if (btn) {
        btn.addEventListener("click", function () {
          if (confirm('Delete user "' + u.username + '"?')) {
            AppStorage.deleteUser(u.id);
            renderUsers();
          }
        });
      }
    });
  }

  document.getElementById("userSearchInput").addEventListener("input", function () {
    usersPage = 1;
    renderUsers();
  });

  document.getElementById("userRoleFilter").addEventListener("change", function () {
    usersPage = 1;
    renderUsers();
  });

  var userModalOverlay = document.getElementById("userModalOverlay");
  var editingUserId = null;

  function populateUserRoleSelect() {
    var select = document.getElementById("userRole");
    var roles = AppStorage.getRoles();
    select.innerHTML = roles.map(function (r) {
      return '<option value="' + r.id + '">' + Utils.escapeHtml(r.name) + '</option>';
    }).join("");
  }

  function openUserModal(user) {
    editingUserId = user ? user.id : null;
    document.getElementById("userFormError").textContent = "";
    populateUserRoleSelect();
    document.getElementById("newUserForm").reset();

    if (user) {
      document.getElementById("userModalTitle").innerHTML = '<span class="card-title-icon">&#9999;&#65039;</span> Edit User';
      document.getElementById("userSubmitBtn").textContent = "Save Changes";
      document.getElementById("userPasswordLabel").textContent = "Password";
      document.getElementById("userPassword").placeholder = "Leave blank to keep current password";
      document.getElementById("userUsername").value = user.username;
      document.getElementById("userName").value = user.name || "";
      document.getElementById("userEmail").value = user.email || "";
      document.getElementById("userRole").value = user.roleId;
    } else {
      document.getElementById("userModalTitle").innerHTML = '<span class="card-title-icon">&#128100;</span> Add New User';
      document.getElementById("userSubmitBtn").textContent = "+ Add User";
      document.getElementById("userPasswordLabel").textContent = "Password *";
      document.getElementById("userPassword").placeholder = "Set a password";
    }

    userModalOverlay.classList.add("open");
    document.getElementById("userUsername").focus();
  }

  function closeUserModal() {
    userModalOverlay.classList.remove("open");
    editingUserId = null;
  }

  document.getElementById("openCreateUserBtn").addEventListener("click", function () {
    openUserModal(null);
  });
  document.getElementById("closeCreateUserBtn").addEventListener("click", closeUserModal);

  userModalOverlay.addEventListener("click", function (event) {
    if (event.target === userModalOverlay) closeUserModal();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && userModalOverlay.classList.contains("open")) closeUserModal();
  });

  document.getElementById("newUserForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var form = this;
    var errorEl = document.getElementById("userFormError");

    var username = document.getElementById("userUsername").value.trim();
    var name = document.getElementById("userName").value.trim();
    var password = document.getElementById("userPassword").value.trim();
    var roleId = document.getElementById("userRole").value;

    if (editingUserId) {
      if (!username || !name || !roleId) {
        errorEl.textContent = "Please fill in username, name, and role.";
        return;
      }

      var updated = AppStorage.updateUser(editingUserId, {
        username: username,
        name: name,
        email: document.getElementById("userEmail").value.trim(),
        password: password,
        roleId: roleId
      });

      if (!updated) {
        errorEl.textContent = 'Username "' + username + '" is already taken.';
        return;
      }

      errorEl.textContent = "";
      form.reset();
      closeUserModal();
      renderUsers();
      return;
    }

    if (!username || !name || !password || !roleId) {
      errorEl.textContent = "Please fill in username, name, password, and role.";
      return;
    }

    var user = AppStorage.createUser({
      username: username,
      name: name,
      email: document.getElementById("userEmail").value.trim(),
      password: password,
      roleId: roleId
    });

    if (!user) {
      errorEl.textContent = 'Username "' + username + '" is already taken.';
      return;
    }

    errorEl.textContent = "";
    form.reset();
    closeUserModal();
    usersPage = Math.max(1, Math.ceil(AppStorage.getUsers().length / USERS_PAGE_SIZE));
    renderUsers();
  });

  document.getElementById("openCreateUserBtn").classList.toggle("hidden", !Auth.hasPermission("users", "create"));

  renderUsers();
})();
