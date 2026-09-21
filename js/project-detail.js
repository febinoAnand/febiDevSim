(function () {
  Auth.requireAuth();
  AppStorage.init();

  if (!Auth.hasPermission("projects", "read")) {
    window.location.href = "dashboard.html";
    return;
  }

  var content = document.getElementById("projectContent");

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  var STATUS_LABELS = {
    planning: "Planning",
    active: "Active",
    "on-hold": "On Hold",
    completed: "Completed"
  };

  var params = new URLSearchParams(window.location.search);
  var projectId = params.get("id");

  function render() {
    var project = projectId ? AppStorage.getProject(projectId) : null;

    if (!project) {
      content.innerHTML = '<div class="card"><div class="empty-state">' +
        'Project not found. <a href="projects.html">Return to Projects</a>.' +
        '</div></div>';
      return;
    }

    var canEdit = Auth.hasPermission("projects", "update");
    var canDelete = Auth.hasPermission("projects", "delete");

    var status = project.status || "planning";
    var devices = project.deviceIds
      .map(function (id) { return AppStorage.getDevice(id); })
      .filter(Boolean);

    var tagChips = (project.tags || []).length
      ? '<div class="tag-list">' + project.tags.map(function (t) {
          return '<span class="tag">#' + escapeHtml(t) + '</span>';
        }).join("") + '</div>'
      : "";

    var metaItems = [
      '<div class="meta-item"><div class="meta-label">Client</div><div class="meta-value">' + escapeHtml(project.owner || "—") + '</div></div>',
      '<div class="meta-item"><div class="meta-label">Start Date</div><div class="meta-value">' + escapeHtml(project.startDate || "—") + '</div></div>',
      '<div class="meta-item"><div class="meta-label">Created</div><div class="meta-value">' + new Date(project.createdAt).toLocaleDateString() + '</div></div>',
      '<div class="meta-item"><div class="meta-label">Devices</div><div class="meta-value">' + devices.length + '</div></div>'
    ];

    var deviceRows = devices.length
      ? devices.map(function (d) {
          var removeBtn = canEdit ? '<button class="btn btn-sm btn-danger" data-remove-device="' + d.id + '">Remove</button>' : "";
          return '<tr>' +
            '<td><a class="device-link" href="device-detail.html?id=' + encodeURIComponent(d.id) + '">' + escapeHtml(d.name) + '</a></td>' +
            '<td>' + escapeHtml(d.location || "—") + '</td>' +
            '<td>' + escapeHtml(d.serialNo || "—") + '</td>' +
            '<td>' + escapeHtml(d.type || "—") + '</td>' +
            '<td><span class="badge badge-' + d.status + '">' + escapeHtml(d.status) + '</span></td>' +
            '<td><span class="badge badge-' + (d.protocol === "HTTP" ? "http" : "mqtt") + '">' + escapeHtml(d.protocol) + '</span></td>' +
            '<td>' + removeBtn + '</td>' +
            '</tr>';
        }).join("")
      : "";

    var deviceTable = devices.length
      ? '<div style="overflow-x: auto;"><table><thead><tr>' +
          '<th>Name</th><th>Location</th><th>Serial No.</th><th>Type</th><th>Status</th><th>Protocol</th><th></th>' +
        '</tr></thead><tbody>' + deviceRows + '</tbody></table></div>'
      : '<div class="empty-state">No devices assigned to this project yet.</div>';

    var addRow = "";
    if (canEdit) {
      var available = AppStorage.getAvailableDevicesForProject(project.id);
      if (available.length === 0) {
        addRow = '<div class="text-muted-sm" style="margin-top: 12px;">All devices have already been added to this project.</div>';
      } else {
        var options = available.map(function (d) {
          return '<option value="' + d.id + '">' + escapeHtml(d.name) + ' (' + escapeHtml(d.serialNo || "n/a") + ')</option>';
        }).join("");
        addRow = '<div class="add-device-row" style="margin-top: 16px;">' +
          '<select id="projectAddDeviceSelect">' + options + '</select>' +
          '<button class="btn btn-sm" id="projectAddDeviceBtn">Add Device</button>' +
          '</div>';
      }
    }

    content.innerHTML =
      '<div class="card project-card">' +
        '<div class="project-card-accent status-' + status + '"></div>' +
        '<div class="card-header">' +
          '<h3>' + escapeHtml(project.name) + '</h3>' +
          (canDelete ? '<button class="btn btn-sm btn-danger" id="deleteProjectBtn">Delete Project</button>' : "") +
        '</div>' +
        '<div class="badge-row">' +
          '<span class="badge badge-status-' + status + '">' + STATUS_LABELS[status] + '</span>' +
        '</div>' +
        (project.description ? '<p class="project-description">' + escapeHtml(project.description) + '</p>' : "") +
        '<div class="device-meta project-meta">' + metaItems.join("") + '</div>' +
        tagChips +
      '</div>' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<h3>Assigned Devices</h3>' +
        '</div>' +
        deviceTable +
        addRow +
      '</div>';

    var deleteBtn = document.getElementById("deleteProjectBtn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", function () {
        if (confirm('Delete project "' + project.name + '"?')) {
          AppStorage.deleteProject(project.id);
          window.location.href = "projects.html";
        }
      });
    }

    var addBtn = document.getElementById("projectAddDeviceBtn");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        var select = document.getElementById("projectAddDeviceSelect");
        if (select && select.value) {
          AppStorage.addDeviceToProject(project.id, select.value);
          render();
        }
      });
    }

    devices.forEach(function (d) {
      var removeBtn = document.querySelector('[data-remove-device="' + d.id + '"]');
      if (removeBtn) {
        removeBtn.addEventListener("click", function () {
          AppStorage.removeDeviceFromProject(project.id, d.id);
          render();
        });
      }
    });
  }

  render();
})();
