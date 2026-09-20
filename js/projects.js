(function () {
  var STATUS_LABELS = {
    planning: "Planning",
    active: "Active",
    "on-hold": "On Hold",
    completed: "Completed"
  };

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

    Utils.renderPagination("projectPagination", filtered.length, PROJECTS_PAGE_SIZE, projectsPage, function (newPage) {
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

      var editBtn = document.querySelector('[data-edit-project="' + project.id + '"]');
      if (editBtn) {
        editBtn.addEventListener("click", function () {
          openProjectModal(project);
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
    var canEdit = Auth.hasPermission("projects", "update");
    var canDelete = Auth.hasPermission("projects", "delete");

    var devices = project.deviceIds
      .map(function (id) { return AppStorage.getDevice(id); })
      .filter(Boolean);

    var chips = devices.length
      ? devices.map(function (d) {
          var removeBtn = canEdit
            ? '<button class="chip-remove" data-remove-device="' + project.id + '|' + d.id + '" title="Remove from project">&times;</button>'
            : "";
          return '<span class="chip">' +
            '<a href="device-detail.html?id=' + encodeURIComponent(d.id) + '">' + Utils.escapeHtml(d.name) + '</a>' +
            removeBtn +
            '</span>';
        }).join("")
      : '<span class="text-muted-sm">No devices assigned yet.</span>';

    var addRow = "";
    if (canEdit) {
      var available = AppStorage.getAvailableDevicesForProject(project.id);
      if (available.length === 0) {
        addRow = '<div class="text-muted-sm">All devices have already been added to this project.</div>';
      } else {
        var options = available.map(function (d) {
          return '<option value="' + d.id + '">' + Utils.escapeHtml(d.name) + ' (' + Utils.escapeHtml(d.serialNo || "n/a") + ')</option>';
        }).join("");
        addRow = '<div class="add-device-row">' +
          '<select data-device-select="' + project.id + '">' + options + '</select>' +
          '<button class="btn btn-sm" data-add-device-btn="' + project.id + '">Add Device</button>' +
          '</div>';
      }
    }

    var status = project.status || "planning";

    var tagChips = (project.tags || []).length
      ? '<div class="tag-list">' + project.tags.map(function (t) {
          return '<span class="tag">#' + Utils.escapeHtml(t) + '</span>';
        }).join("") + '</div>'
      : "";

    var metaItems = [];
    if (project.owner) metaItems.push('<div class="meta-item"><div class="meta-label">Client</div><div class="meta-value">' + Utils.escapeHtml(project.owner) + '</div></div>');
    if (project.startDate) metaItems.push('<div class="meta-item"><div class="meta-label">Start Date</div><div class="meta-value">' + Utils.escapeHtml(project.startDate) + '</div></div>');
    metaItems.push('<div class="meta-item"><div class="meta-label">Devices</div><div class="meta-value">' + devices.length + '</div></div>');

    return '<div class="card project-card">' +
      '<div class="project-card-accent status-' + status + '"></div>' +
      '<div class="card-header">' +
        '<h3><a href="project-detail.html?id=' + encodeURIComponent(project.id) + '" class="project-link">' + Utils.escapeHtml(project.name) + '</a></h3>' +
        '<span class="flex gap-sm">' +
          (canEdit ? '<button class="btn btn-sm" data-edit-project="' + project.id + '">Edit</button>' : "") +
          (canDelete ? '<button class="btn btn-sm btn-danger" data-delete-project="' + project.id + '">Delete</button>' : "") +
        '</span>' +
      '</div>' +
      '<div class="badge-row">' +
        '<span class="badge badge-status-' + status + '">' + STATUS_LABELS[status] + '</span>' +
      '</div>' +
      (project.description ? '<p class="project-description">' + Utils.escapeHtml(project.description) + '</p>' : "") +
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

  var createProjectSelectedDevices = {};

  function renderCreateProjectDeviceOptions() {
    var wrap = document.getElementById("createProjectDeviceList");
    var allDevices = AppStorage.getDevices();

    if (allDevices.length === 0) {
      wrap.innerHTML = '<div class="text-muted-sm">No virtual devices yet. Add one from the Virtual Device page first.</div>';
      return;
    }

    var searchTerm = document.getElementById("createProjectDeviceSearch").value.trim().toLowerCase();
    var matches = allDevices.filter(function (d) {
      if (!searchTerm) return true;
      return d.name.toLowerCase().indexOf(searchTerm) !== -1 ||
        (d.serialNo || "").toLowerCase().indexOf(searchTerm) !== -1 ||
        (d.location || "").toLowerCase().indexOf(searchTerm) !== -1;
    });

    if (matches.length === 0) {
      wrap.innerHTML = '<div class="text-muted-sm">No devices match your search.</div>';
      return;
    }

    wrap.innerHTML = matches.map(function (d) {
      var checked = createProjectSelectedDevices[d.id] ? " checked" : "";
      return '<label class="device-checkbox-item">' +
        '<input type="checkbox" value="' + d.id + '"' + checked + ' />' +
        '<span>' + Utils.escapeHtml(d.name) + ' <span class="text-muted-sm">(' + Utils.escapeHtml(d.serialNo || "n/a") + (d.location ? " — " + Utils.escapeHtml(d.location) : "") + ')</span></span>' +
        '</label>';
    }).join("");

    wrap.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
      cb.addEventListener("change", function () {
        if (cb.checked) {
          createProjectSelectedDevices[cb.value] = true;
        } else {
          delete createProjectSelectedDevices[cb.value];
        }
      });
    });
  }

  document.getElementById("createProjectDeviceSearch").addEventListener("input", renderCreateProjectDeviceOptions);

  // ---------- Create / Edit Project modal ----------

  var projectModalOverlay = document.getElementById("projectModalOverlay");
  var editingProjectId = null;

  function openProjectModal(project) {
    editingProjectId = project ? project.id : null;
    createProjectSelectedDevices = {};
    document.getElementById("createProjectDeviceSearch").value = "";

    var form = document.getElementById("newProjectForm");
    form.reset();

    if (project) {
      document.getElementById("projectModalTitle").innerHTML = '<span class="card-title-icon">&#9999;&#65039;</span> Edit Project';
      document.getElementById("projectSubmitBtn").textContent = "Save Changes";
      document.getElementById("createProjectDeviceGroup").classList.add("hidden");
      document.getElementById("projectName").value = project.name;
      document.getElementById("projectDescription").value = project.description || "";
      document.getElementById("projectOwner").value = project.owner || "";
      document.getElementById("projectStartDate").value = project.startDate || "";
      document.getElementById("projectStatus").value = project.status || "planning";
      document.getElementById("projectTags").value = (project.tags || []).join(", ");
    } else {
      document.getElementById("projectModalTitle").innerHTML = '<span class="card-title-icon">&#10024;</span> Create a New Project';
      document.getElementById("projectSubmitBtn").textContent = "+ Create Project";
      document.getElementById("createProjectDeviceGroup").classList.remove("hidden");
      renderCreateProjectDeviceOptions();
    }

    projectModalOverlay.classList.add("open");
    document.getElementById("projectName").focus();
  }

  function closeProjectModal() {
    projectModalOverlay.classList.remove("open");
    editingProjectId = null;
  }

  document.getElementById("openCreateProjectBtn").addEventListener("click", function () {
    openProjectModal(null);
  });
  document.getElementById("closeCreateProjectBtn").addEventListener("click", closeProjectModal);

  projectModalOverlay.addEventListener("click", function (event) {
    if (event.target === projectModalOverlay) closeProjectModal();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && projectModalOverlay.classList.contains("open")) closeProjectModal();
  });

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

    var fields = {
      name: name,
      description: document.getElementById("projectDescription").value.trim(),
      owner: document.getElementById("projectOwner").value.trim(),
      startDate: document.getElementById("projectStartDate").value,
      status: document.getElementById("projectStatus").value,
      tags: tags
    };

    if (editingProjectId) {
      AppStorage.updateProject(editingProjectId, fields);
      form.reset();
      closeProjectModal();
      renderProjects();
      return;
    }

    var project = AppStorage.createProject(fields);
    var selectedDeviceIds = Object.keys(createProjectSelectedDevices);
    selectedDeviceIds.forEach(function (deviceId) {
      AppStorage.addDeviceToProject(project.id, deviceId);
    });

    form.reset();
    createProjectSelectedDevices = {};
    closeProjectModal();
    projectsPage = Math.max(1, Math.ceil(AppStorage.getProjects().length / PROJECTS_PAGE_SIZE));
    renderProjects();
  });

  document.getElementById("openCreateProjectBtn").classList.toggle("hidden", !Auth.hasPermission("projects", "create"));

  renderProjects();
})();
