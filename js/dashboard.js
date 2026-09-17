(function () {
  Auth.requireAuth();
  AppStorage.init();

  var session = Auth.getSession();
  document.getElementById("usernameLabel").textContent = session ? "Signed in as " + session.username : "";

  var navTabs = document.querySelectorAll(".sidebar-nav a[data-tab]");
  var allTabTriggers = document.querySelectorAll("[data-tab]");
  var sections = {
    dashboard: document.getElementById("tab-dashboard"),
    projects: document.getElementById("tab-projects"),
    devices: document.getElementById("tab-devices")
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderPagination(containerId, totalItems, pageSize, currentPage, onChange) {
    var container = document.getElementById(containerId);
    var totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    if (totalPages <= 1) {
      container.innerHTML = "";
      return;
    }

    var html = '<button class="page-btn" data-page="prev"' + (currentPage === 1 ? " disabled" : "") + '>&laquo;</button>';
    for (var i = 1; i <= totalPages; i++) {
      html += '<button class="page-btn' + (i === currentPage ? " active" : "") + '" data-page="' + i + '">' + i + '</button>';
    }
    html += '<button class="page-btn" data-page="next"' + (currentPage === totalPages ? " disabled" : "") + '>&raquo;</button>';
    container.innerHTML = html;

    container.querySelectorAll(".page-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        var val = btn.getAttribute("data-page");
        var newPage = val === "prev" ? currentPage - 1 : (val === "next" ? currentPage + 1 : parseInt(val, 10));
        onChange(newPage);
      });
    });
  }

  function activateTab(name) {
    if (!sections[name]) name = "dashboard";

    navTabs.forEach(function (tab) {
      var isActive = tab.getAttribute("data-tab") === name;
      tab.classList.toggle("active", isActive);
    });

    Object.keys(sections).forEach(function (key) {
      sections[key].classList.toggle("hidden", key !== name);
    });

    if (name === "dashboard") renderDashboard();
    if (name === "projects") {
      renderProjects();
      renderCreateProjectDeviceOptions();
    }
    if (name === "devices") renderDevices();
  }

  function currentTabFromHash() {
    var hash = window.location.hash.replace("#", "");
    return sections[hash] ? hash : "dashboard";
  }

  window.addEventListener("hashchange", function () {
    activateTab(currentTabFromHash());
  });

  allTabTriggers.forEach(function (tab) {
    tab.addEventListener("click", function (event) {
      event.preventDefault();
      var name = tab.getAttribute("data-tab");
      window.location.hash = name;
      activateTab(name);
    });
  });

  document.getElementById("logoutBtn").addEventListener("click", function (event) {
    event.preventDefault();
    Auth.logout();
  });

  var STATUS_LABELS = {
    planning: "Planning",
    active: "Active",
    "on-hold": "On Hold",
    completed: "Completed"
  };

  var DEVICE_STATUS_LABELS = { online: "Online", offline: "Offline", idle: "Idle" };

  // ---------- Dashboard ----------

  function renderBreakdown(counts, labels, badgeClassPrefix) {
    var total = Object.keys(counts).reduce(function (sum, key) { return sum + counts[key]; }, 0);

    return Object.keys(labels).map(function (key) {
      var count = counts[key] || 0;
      var pct = total ? Math.round((count / total) * 100) : 0;
      return '<div class="breakdown-row">' +
        '<span class="badge ' + badgeClassPrefix + key + '">' + labels[key] + '</span>' +
        '<div class="breakdown-bar-track"><div class="breakdown-bar-fill" style="width: ' + pct + '%"></div></div>' +
        '<span class="breakdown-count">' + count + '</span>' +
        '</div>';
    }).join("");
  }

  function renderDashboard() {
    var projects = AppStorage.getProjects();
    var devices = AppStorage.getDevices();

    var projectStatusCounts = { planning: 0, active: 0, "on-hold": 0, completed: 0 };
    projects.forEach(function (p) {
      var s = p.status || "planning";
      projectStatusCounts[s] = (projectStatusCounts[s] || 0) + 1;
    });

    var deviceStatusCounts = { online: 0, offline: 0, idle: 0 };
    devices.forEach(function (d) {
      var s = d.status || "offline";
      deviceStatusCounts[s] = (deviceStatusCounts[s] || 0) + 1;
    });

    var assignedDeviceIds = {};
    projects.forEach(function (p) {
      p.deviceIds.forEach(function (id) { assignedDeviceIds[id] = true; });
    });
    var unassignedDevices = devices.filter(function (d) { return !assignedDeviceIds[d.id]; });

    var stats = [
      { label: "Total Projects", value: projects.length, icon: "&#128193;" },
      { label: "Active Projects", value: projectStatusCounts.active, icon: "&#128640;" },
      { label: "Total Devices", value: devices.length, icon: "&#128225;" },
      { label: "Unassigned Devices", value: unassignedDevices.length, icon: "&#128279;" }
    ];
    document.getElementById("statGrid").innerHTML = stats.map(function (s) {
      return '<div class="stat-card">' +
        '<div class="stat-icon">' + s.icon + '</div>' +
        '<div class="stat-value">' + s.value + '</div>' +
        '<div class="stat-label">' + s.label + '</div>' +
        '</div>';
    }).join("");

    document.getElementById("projectStatusBreakdown").innerHTML =
      projects.length
        ? renderBreakdown(projectStatusCounts, STATUS_LABELS, "badge-status-")
        : '<div class="text-muted-sm">No projects yet.</div>';

    document.getElementById("deviceStatusBreakdown").innerHTML =
      devices.length
        ? renderBreakdown(deviceStatusCounts, DEVICE_STATUS_LABELS, "badge-")
        : '<div class="text-muted-sm">No devices yet.</div>';

    var recentWrap = document.getElementById("recentProjectsList");
    var recent = projects.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }).slice(0, 5);

    if (recent.length === 0) {
      recentWrap.innerHTML = '<div class="empty-state">No projects yet. Create one to get started.</div>';
    } else {
      recentWrap.innerHTML = recent.map(function (p) {
        var status = p.status || "planning";
        return '<div class="summary-row">' +
          '<div><strong>' + escapeHtml(p.name) + '</strong><div class="text-muted-sm">' + p.deviceIds.length + ' device(s)</div></div>' +
          '<span class="badge badge-status-' + status + '">' + STATUS_LABELS[status] + '</span>' +
          '</div>';
      }).join("");
    }

    var unassignedWrap = document.getElementById("unassignedDevicesList");
    if (unassignedDevices.length === 0) {
      unassignedWrap.innerHTML = '<div class="empty-state">All devices are assigned to a project.</div>';
    } else {
      unassignedWrap.innerHTML = unassignedDevices.map(function (d) {
        return '<div class="summary-row">' +
          '<div><a href="device-detail.html?id=' + encodeURIComponent(d.id) + '">' + escapeHtml(d.name) + '</a>' +
          '<div class="text-muted-sm">' + escapeHtml(d.serialNo || "n/a") + '</div></div>' +
          '<span class="badge badge-' + d.status + '">' + escapeHtml(d.status) + '</span>' +
          '</div>';
      }).join("");
    }
  }

  // ---------- Projects ----------

  var PROJECTS_PAGE_SIZE = 4;
  var projectsPage = 1;

  function getFilteredProjects() {
    var searchTerm = document.getElementById("projectSearchInput").value.trim().toLowerCase();
    var statusFilter = document.getElementById("projectStatusFilter").value;

    return AppStorage.getProjects().filter(function (p) {
      var matchesSearch = !searchTerm ||
        p.name.toLowerCase().indexOf(searchTerm) !== -1 ||
        (p.owner || "").toLowerCase().indexOf(searchTerm) !== -1;
      var matchesStatus = !statusFilter || (p.status || "planning") === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  function renderProjects() {
    var allProjects = AppStorage.getProjects();
    var filtered = getFilteredProjects();
    var wrap = document.getElementById("projectList");

    if (allProjects.length === 0) {
      wrap.innerHTML = '<div class="card grid-span-full"><div class="empty-state">No projects yet. Create one above to get started.</div></div>';
      document.getElementById("projectPagination").innerHTML = "";
      return;
    }

    if (filtered.length === 0) {
      wrap.innerHTML = '<div class="card grid-span-full"><div class="empty-state">No projects match your filters.</div></div>';
      document.getElementById("projectPagination").innerHTML = "";
      return;
    }

    var totalPages = Math.max(1, Math.ceil(filtered.length / PROJECTS_PAGE_SIZE));
    if (projectsPage > totalPages) projectsPage = totalPages;

    var pageItems = filtered.slice((projectsPage - 1) * PROJECTS_PAGE_SIZE, projectsPage * PROJECTS_PAGE_SIZE);

    wrap.innerHTML = pageItems.map(renderProjectCard).join("");

    renderPagination("projectPagination", filtered.length, PROJECTS_PAGE_SIZE, projectsPage, function (newPage) {
      projectsPage = newPage;
      renderProjects();
    });

    pageItems.forEach(function (project) {
      var addBtn = document.querySelector('[data-add-device-btn="' + project.id + '"]');
      if (addBtn) {
        addBtn.addEventListener("click", function () {
          var select = document.querySelector('[data-device-select="' + project.id + '"]');
          if (select && select.value) {
            AppStorage.addDeviceToProject(project.id, select.value);
            renderProjects();
          }
        });
      }

      var deleteBtn = document.querySelector('[data-delete-project="' + project.id + '"]');
      if (deleteBtn) {
        deleteBtn.addEventListener("click", function () {
          if (confirm('Delete project "' + project.name + '"?')) {
            AppStorage.deleteProject(project.id);
            renderProjects();
          }
        });
      }

      project.deviceIds.forEach(function (deviceId) {
        var removeBtn = document.querySelector('[data-remove-device="' + project.id + '|' + deviceId + '"]');
        if (removeBtn) {
          removeBtn.addEventListener("click", function () {
            AppStorage.removeDeviceFromProject(project.id, deviceId);
            renderProjects();
          });
        }
      });
    });
  }

  function renderProjectCard(project) {
    var devices = project.deviceIds
      .map(function (id) { return AppStorage.getDevice(id); })
      .filter(Boolean);

    var chips = devices.length
      ? devices.map(function (d) {
          return '<span class="chip">' +
            '<a href="device-detail.html?id=' + encodeURIComponent(d.id) + '">' + escapeHtml(d.name) + '</a>' +
            '<button class="chip-remove" data-remove-device="' + project.id + '|' + d.id + '" title="Remove from project">&times;</button>' +
            '</span>';
        }).join("")
      : '<span class="text-muted-sm">No devices assigned yet.</span>';

    var available = AppStorage.getAvailableDevicesForProject(project.id);
    var addRow;
    if (available.length === 0) {
      addRow = '<div class="text-muted-sm">All devices have already been added to this project.</div>';
    } else {
      var options = available.map(function (d) {
        return '<option value="' + d.id + '">' + escapeHtml(d.name) + ' (' + escapeHtml(d.serialNo || "n/a") + ')</option>';
      }).join("");
      addRow = '<div class="add-device-row">' +
        '<select data-device-select="' + project.id + '">' + options + '</select>' +
        '<button class="btn btn-sm" data-add-device-btn="' + project.id + '">Add Device</button>' +
        '</div>';
    }

    var status = project.status || "planning";

    var tagChips = (project.tags || []).length
      ? '<div class="tag-list">' + project.tags.map(function (t) {
          return '<span class="tag">#' + escapeHtml(t) + '</span>';
        }).join("") + '</div>'
      : "";

    var metaItems = [];
    if (project.owner) metaItems.push('<div class="meta-item"><div class="meta-label">Client</div><div class="meta-value">' + escapeHtml(project.owner) + '</div></div>');
    if (project.startDate) metaItems.push('<div class="meta-item"><div class="meta-label">Start Date</div><div class="meta-value">' + escapeHtml(project.startDate) + '</div></div>');
    metaItems.push('<div class="meta-item"><div class="meta-label">Devices</div><div class="meta-value">' + devices.length + '</div></div>');

    return '<div class="card project-card">' +
      '<div class="project-card-accent status-' + status + '"></div>' +
      '<div class="card-header">' +
        '<h3>' + escapeHtml(project.name) + '</h3>' +
        '<button class="btn btn-sm btn-danger" data-delete-project="' + project.id + '">Delete</button>' +
      '</div>' +
      '<div class="badge-row">' +
        '<span class="badge badge-status-' + status + '">' + STATUS_LABELS[status] + '</span>' +
      '</div>' +
      (project.description ? '<p class="project-description">' + escapeHtml(project.description) + '</p>' : "") +
      '<div class="device-meta project-meta">' + metaItems.join("") + '</div>' +
      tagChips +
      '<div class="chip-list">' + chips + '</div>' +
      addRow +
      '</div>';
  }

  document.getElementById("projectSearchInput").addEventListener("input", function () {
    projectsPage = 1;
    renderProjects();
  });

  document.getElementById("projectStatusFilter").addEventListener("change", function () {
    projectsPage = 1;
    renderProjects();
  });

  function renderCreateProjectDeviceOptions() {
    var wrap = document.getElementById("createProjectDeviceList");
    var devices = AppStorage.getDevices();

    if (devices.length === 0) {
      wrap.innerHTML = '<div class="text-muted-sm">No virtual devices yet. Add one from the Virtual Device tab first.</div>';
      return;
    }

    wrap.innerHTML = devices.map(function (d) {
      return '<label class="device-checkbox-item">' +
        '<input type="checkbox" value="' + d.id + '" />' +
        '<span>' + escapeHtml(d.name) + ' <span class="text-muted-sm">(' + escapeHtml(d.serialNo || "n/a") + (d.location ? " — " + escapeHtml(d.location) : "") + ')</span></span>' +
        '</label>';
    }).join("");
  }

  document.getElementById("newProjectForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var form = this;
    var nameInput = document.getElementById("projectName");
    var name = nameInput.value.trim();
    if (!name) return;

    var tagsRaw = document.getElementById("projectTags").value.trim();
    var tags = tagsRaw
      ? tagsRaw.split(",").map(function (t) { return t.trim(); }).filter(Boolean)
      : [];

    var selectedDeviceIds = Array.prototype.map.call(
      document.querySelectorAll('#createProjectDeviceList input[type="checkbox"]:checked'),
      function (cb) { return cb.value; }
    );

    var project = AppStorage.createProject({
      name: name,
      description: document.getElementById("projectDescription").value.trim(),
      owner: document.getElementById("projectOwner").value.trim(),
      startDate: document.getElementById("projectStartDate").value,
      status: document.getElementById("projectStatus").value,
      tags: tags
    });

    selectedDeviceIds.forEach(function (deviceId) {
      AppStorage.addDeviceToProject(project.id, deviceId);
    });

    form.reset();
    renderCreateProjectDeviceOptions();
    projectsPage = Math.max(1, Math.ceil(AppStorage.getProjects().length / PROJECTS_PAGE_SIZE));
    renderProjects();
  });

  // ---------- Virtual Devices ----------

  var DEVICES_PAGE_SIZE = 5;
  var devicesPage = 1;

  function getFilteredDevices() {
    var searchTerm = document.getElementById("deviceSearchInput").value.trim().toLowerCase();
    var statusFilter = document.getElementById("deviceStatusFilter").value;
    var protocolFilter = document.getElementById("deviceProtocolFilter").value;

    return AppStorage.getDevices().filter(function (d) {
      var matchesSearch = !searchTerm ||
        d.name.toLowerCase().indexOf(searchTerm) !== -1 ||
        (d.serialNo || "").toLowerCase().indexOf(searchTerm) !== -1;
      var matchesStatus = !statusFilter || d.status === statusFilter;
      var matchesProtocol = !protocolFilter || d.protocol === protocolFilter;
      return matchesSearch && matchesStatus && matchesProtocol;
    });
  }

  function renderDevices() {
    var allDevices = AppStorage.getDevices();
    var filtered = getFilteredDevices();
    var wrap = document.getElementById("deviceTableWrap");

    if (allDevices.length === 0) {
      wrap.innerHTML = '<div class="empty-state">No virtual devices yet. Add one above.</div>';
      document.getElementById("devicePagination").innerHTML = "";
      return;
    }

    if (filtered.length === 0) {
      wrap.innerHTML = '<div class="empty-state">No devices match your filters.</div>';
      document.getElementById("devicePagination").innerHTML = "";
      return;
    }

    var totalPages = Math.max(1, Math.ceil(filtered.length / DEVICES_PAGE_SIZE));
    if (devicesPage > totalPages) devicesPage = totalPages;

    var pageItems = filtered.slice((devicesPage - 1) * DEVICES_PAGE_SIZE, devicesPage * DEVICES_PAGE_SIZE);

    var rows = pageItems.map(function (d) {
      return '<tr>' +
        '<td><a class="device-link" href="device-detail.html?id=' + encodeURIComponent(d.id) + '">' + escapeHtml(d.name) + '</a></td>' +
        '<td>' + escapeHtml(d.location || "—") + '</td>' +
        '<td>' + escapeHtml(d.serialNo || "—") + '</td>' +
        '<td>' + escapeHtml(d.type || "—") + '</td>' +
        '<td><span class="badge badge-' + d.status + '">' + escapeHtml(d.status) + '</span></td>' +
        '<td><span class="badge badge-' + (d.protocol === "HTTP" ? "http" : "mqtt") + '">' + escapeHtml(d.protocol === "both" ? "MQTT + HTTP" : d.protocol) + '</span></td>' +
        '<td><button class="btn btn-sm btn-danger" data-delete-device="' + d.id + '">Delete</button></td>' +
        '</tr>';
    }).join("");

    wrap.innerHTML = '<table><thead><tr>' +
      '<th>Name</th><th>Location</th><th>Serial No.</th><th>Type</th><th>Status</th><th>Protocol</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';

    renderPagination("devicePagination", filtered.length, DEVICES_PAGE_SIZE, devicesPage, function (newPage) {
      devicesPage = newPage;
      renderDevices();
    });

    pageItems.forEach(function (d) {
      var btn = document.querySelector('[data-delete-device="' + d.id + '"]');
      if (btn) {
        btn.addEventListener("click", function () {
          if (confirm('Delete device "' + d.name + '"? This also removes it from any projects.')) {
            AppStorage.deleteDevice(d.id);
            renderDevices();
          }
        });
      }
    });
  }

  document.getElementById("deviceSearchInput").addEventListener("input", function () {
    devicesPage = 1;
    renderDevices();
  });

  document.getElementById("deviceStatusFilter").addEventListener("change", function () {
    devicesPage = 1;
    renderDevices();
  });

  document.getElementById("deviceProtocolFilter").addEventListener("change", function () {
    devicesPage = 1;
    renderDevices();
  });

  document.getElementById("newDeviceForm").addEventListener("submit", function (event) {
    event.preventDefault();
    var nameInput = document.getElementById("deviceName");
    var name = nameInput.value.trim();
    if (!name) return;

    AppStorage.createDevice({
      name: name,
      location: document.getElementById("deviceLocation").value.trim(),
      serialNo: document.getElementById("deviceSerial").value.trim(),
      type: document.getElementById("deviceType").value.trim(),
      protocol: document.getElementById("deviceProtocol").value
    });

    this.reset();
    devicesPage = Math.max(1, Math.ceil(AppStorage.getDevices().length / DEVICES_PAGE_SIZE));
    renderDevices();
  });

  // ---------- Init ----------
  activateTab(currentTabFromHash());
})();
