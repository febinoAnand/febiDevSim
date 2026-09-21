(function () {
  var ROLES_PAGE_SIZE = 5;
  var rolesPage = 1;

  var MODULE_LABELS = { projects: "Projects", devices: "Virtual Devices", users: "Users", roles: "Roles" };

  function permMatrixReadOnlyRows(permissions) {
    return AppStorage.PERMISSION_MODULES.map(function (mod) {
      var p = permissions[mod] || {};
      var cells = AppStorage.PERMISSION_ACTIONS.map(function (act) {
        return '<td>' + (p[act]
          ? '<span class="perm-dot perm-yes" title="Yes">&#10003;</span>'
          : '<span class="perm-dot perm-no" title="No">&#10005;</span>') + '</td>';
      }).join("");
      return '<tr><td>' + MODULE_LABELS[mod] + '</td>' + cells + '</tr>';
    }).join("");
  }

  function renderRoleCard(role, canEditRole, canDeleteRole) {
    var actions = [];
    if (canEditRole) actions.push('<button class="btn btn-sm" data-edit-role="' + role.id + '">Edit</button>');
    if (canDeleteRole) actions.push('<button class="btn btn-sm btn-danger" data-delete-role="' + role.id + '">Delete</button>');
    return '<div class="card">' +
      '<div class="card-header">' +
        '<h3>' + Utils.escapeHtml(role.name) + '</h3>' +
        '<span class="flex gap-sm">' + actions.join("") + '</span>' +
      '</div>' +
      '<div style="overflow-x: auto;">' +
        '<table class="perm-matrix">' +
          '<thead><tr><th>Section</th><th>Create</th><th>Read</th><th>Update</th><th>Delete</th></tr></thead>' +
          '<tbody>' + permMatrixReadOnlyRows(role.permissions) + '</tbody>' +
        '</table>' +
      '</div>' +
      '</div>';
  }

  function renderRoles() {
    var allRoles = AppStorage.getRoles();
    var wrap = document.getElementById("roleTableWrap");
    var canEditRole = Auth.hasPermission("roles", "update");
    var canDeleteRole = Auth.hasPermission("roles", "delete");

    if (allRoles.length === 0) {
      wrap.innerHTML = '<div class="empty-state">No roles yet. Add one above.</div>';
      document.getElementById("rolePagination").innerHTML = "";
      return;
    }

    var totalPages = Math.max(1, Math.ceil(allRoles.length / ROLES_PAGE_SIZE));
    if (rolesPage > totalPages) rolesPage = totalPages;
    var pageItems = allRoles.slice((rolesPage - 1) * ROLES_PAGE_SIZE, rolesPage * ROLES_PAGE_SIZE);

    wrap.innerHTML = pageItems.map(function (r) { return renderRoleCard(r, canEditRole, canDeleteRole); }).join("");

    Utils.renderPagination("rolePagination", allRoles.length, ROLES_PAGE_SIZE, rolesPage, function (newPage) {
      rolesPage = newPage;
      renderRoles();
    });

    pageItems.forEach(function (r) {
      var editBtn = document.querySelector('[data-edit-role="' + r.id + '"]');
      if (editBtn) {
        editBtn.addEventListener("click", function () {
          openRoleModal(r);
        });
      }

      var btn = document.querySelector('[data-delete-role="' + r.id + '"]');
      if (btn) {
        btn.addEventListener("click", function () {
          if (AppStorage.isRoleInUse(r.id)) {
            alert('Role "' + r.name + '" is still assigned to one or more users. Reassign them to a different role first.');
            return;
          }
          if (confirm('Delete role "' + r.name + '"?')) {
            AppStorage.deleteRole(r.id);
            renderRoles();
          }
        });
      }
    });
  }

  function renderPermMatrixInputs(existingPermissions) {
    var tbody = document.querySelector("#rolePermMatrix tbody");
    tbody.innerHTML = AppStorage.PERMISSION_MODULES.map(function (mod) {
      var existing = existingPermissions && existingPermissions[mod];
      var cells = AppStorage.PERMISSION_ACTIONS.map(function (act) {
        var checked = existing && existing[act] ? " checked" : "";
        return '<td><label class="toggle-switch">' +
          '<input type="checkbox" data-module="' + mod + '" data-action="' + act + '"' + checked + ' />' +
          '<span class="toggle-slider"></span>' +
          '</label></td>';
      }).join("");
      return '<tr><td>' + MODULE_LABELS[mod] + '</td>' + cells + '</tr>';
    }).join("");
  }

  var roleModalOverlay = document.getElementById("roleModalOverlay");
  var editingRoleId = null;

  function openRoleModal(role) {
    editingRoleId = role ? role.id : null;
    document.getElementById("roleFormError").textContent = "";
    document.getElementById("newRoleForm").reset();
    renderPermMatrixInputs(role ? role.permissions : null);

    if (role) {
      document.getElementById("roleModalTitle").innerHTML = '<span class="card-title-icon">&#9999;&#65039;</span> Edit Role';
      document.getElementById("roleSubmitBtn").textContent = "Save Changes";
      document.getElementById("roleName").value = role.name;
    } else {
      document.getElementById("roleModalTitle").innerHTML = '<span class="card-title-icon">&#128274;</span> Add New Role';
      document.getElementById("roleSubmitBtn").textContent = "+ Add Role";
    }

    roleModalOverlay.classList.add("open");
    document.getElementById("roleName").focus();
  }

  function closeRoleModal() {
    roleModalOverlay.classList.remove("open");
    editingRoleId = null;
  }

  document.getElementById("openCreateRoleBtn").addEventListener("click", function () {
    openRoleModal(null);
  });
  document.getElementById("closeCreateRoleBtn").addEventListener("click", closeRoleModal);

  roleModalOverlay.addEventListener("click", function (event) {
    if (event.target === roleModalOverlay) closeRoleModal();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && roleModalOverlay.classList.contains("open")) closeRoleModal();
  });

  document.getElementById("newRoleForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var form = this;
    var errorEl = document.getElementById("roleFormError");
    var name = document.getElementById("roleName").value.trim();

    if (!name) {
      errorEl.textContent = "Please enter a role name.";
      return;
    }

    var permissions = {};
    document.querySelectorAll('#rolePermMatrix input[type="checkbox"]').forEach(function (cb) {
      var mod = cb.getAttribute("data-module");
      var act = cb.getAttribute("data-action");
      if (!permissions[mod]) permissions[mod] = {};
      permissions[mod][act] = cb.checked;
    });

    if (editingRoleId) {
      AppStorage.updateRole(editingRoleId, { name: name, permissions: permissions });
    } else {
      AppStorage.createRole({ name: name, permissions: permissions });
    }

    errorEl.textContent = "";
    form.reset();
    closeRoleModal();
    renderRoles();
  });

  document.getElementById("openCreateRoleBtn").classList.toggle("hidden", !Auth.hasPermission("roles", "create"));

  renderRoles();
})();
