(function () {
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
    var canEditDevice = Auth.hasPermission("devices", "update");
    var canDeleteDevice = Auth.hasPermission("devices", "delete");

    var rows = pageItems.map(function (d) {
      var actions = [];
      if (canEditDevice) actions.push('<a class="btn btn-sm" href="device-form.html?id=' + encodeURIComponent(d.id) + '">Edit</a>');
      if (canDeleteDevice) actions.push('<button class="btn btn-sm btn-danger" data-delete-device="' + d.id + '">Delete</button>');
      return '<tr>' +
        '<td><a class="device-link" href="device-detail.html?id=' + encodeURIComponent(d.id) + '">' + Utils.escapeHtml(d.name) + '</a></td>' +
        '<td>' + Utils.escapeHtml(d.location || "—") + '</td>' +
        '<td>' + Utils.escapeHtml(d.serialNo || "—") + '</td>' +
        '<td>' + Utils.escapeHtml(d.type || "—") + '</td>' +
        '<td><span class="badge badge-' + d.status + '">' + Utils.escapeHtml(d.status) + '</span></td>' +
        '<td><span class="badge badge-' + (d.protocol === "HTTP" ? "http" : "mqtt") + '">' + Utils.escapeHtml(d.protocol) + '</span></td>' +
        '<td><div class="flex gap-sm">' + actions.join("") + '</div></td>' +
        '</tr>';
    }).join("");

    wrap.innerHTML = '<table><thead><tr>' +
      '<th>Name</th><th>Location</th><th>Serial No.</th><th>Type</th><th>Status</th><th>Protocol</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';

    Utils.renderPagination("devicePagination", filtered.length, DEVICES_PAGE_SIZE, devicesPage, function (newPage) {
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

  document.getElementById("openCreateDeviceBtn").classList.toggle("hidden", !Auth.hasPermission("devices", "create"));

  renderDevices();
})();
