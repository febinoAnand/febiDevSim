(function () {
  Auth.requireAuth();
  AppStorage.init();

  var content = document.getElementById("deviceContent");

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  var params = new URLSearchParams(window.location.search);
  var deviceId = params.get("id");
  var device = deviceId ? AppStorage.getDevice(deviceId) : null;

  if (!device) {
    content.innerHTML = '<div class="card"><div class="empty-state">' +
      'Device not found. <a href="dashboard.html">Return to dashboard</a>.' +
      '</div></div>';
    return;
  }

  content.innerHTML =
    '<div class="device-detail-grid">' +
    '<div class="card">' +
      '<div class="card-header">' +
        '<h3>' + escapeHtml(device.name) + '</h3>' +
        '<span class="badge badge-' + device.status + '">' + escapeHtml(device.status) + '</span>' +
      '</div>' +
      '<div class="device-meta">' +
        '<div class="meta-item"><div class="meta-label">Location</div><div class="meta-value">' + escapeHtml(device.location || "—") + '</div></div>' +
        '<div class="meta-item"><div class="meta-label">Serial No.</div><div class="meta-value">' + escapeHtml(device.serialNo || "—") + '</div></div>' +
        '<div class="meta-item"><div class="meta-label">Type</div><div class="meta-value">' + escapeHtml(device.type || "—") + '</div></div>' +
        '<div class="meta-item"><div class="meta-label">Protocol</div><div class="meta-value">' + escapeHtml(device.protocol === "both" ? "MQTT + HTTP" : device.protocol) + '</div></div>' +
      '</div>' +
    '</div>' +
    '<div class="card">' +
      '<div class="card-header">' +
        '<h3><span class="live-dot"></span>&nbsp; Live Activity Log</h3>' +
        '<button class="btn btn-sm" id="clearLogsBtn">Clear Logs</button>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<select id="logProtocolFilter">' +
          '<option value="">All Protocols</option>' +
          '<option value="MQTT">MQTT</option>' +
          '<option value="HTTP">HTTP</option>' +
        '</select>' +
        '<select id="logDirectionFilter">' +
          '<option value="">All Directions</option>' +
          '<option value="sent">Sent</option>' +
          '<option value="received">Received</option>' +
        '</select>' +
        '<select id="logStatusFilter">' +
          '<option value="">All Statuses</option>' +
          '<option value="ok">OK</option>' +
          '<option value="error">Error</option>' +
          '<option value="timeout">Timeout</option>' +
        '</select>' +
      '</div>' +
      '<div class="text-muted-sm" id="logFilterSummary" style="margin-bottom: 10px;"></div>' +
      '<div class="log-feed" id="logFeed"></div>' +
    '</div>' +
    '</div>';

  var feed = document.getElementById("logFeed");
  var allLogs = [];

  function renderEntry(entry) {
    var div = document.createElement("div");
    div.className = "log-entry protocol-" + entry.protocol.toLowerCase() +
      (entry.status !== "ok" ? " status-error" : "");
    div.innerHTML =
      '<div class="log-entry-top">' +
        '<span class="badge badge-' + (entry.protocol === "HTTP" ? "http" : "mqtt") + '">' + entry.protocol + '</span>' +
        '<span class="log-direction">' + (entry.direction === "sent" ? "&uarr; sent" : "&darr; received") + '</span>' +
        '<span class="log-timestamp">' + new Date(entry.timestamp).toLocaleTimeString() + '</span>' +
        (entry.status !== "ok" ? '<span class="badge badge-offline">' + entry.status + '</span>' : "") +
      '</div>' +
      '<div class="log-endpoint">' + escapeHtml(entry.topicOrEndpoint) + '</div>' +
      '<pre class="log-payload">' + escapeHtml(entry.payload) + '</pre>';
    return div;
  }

  function getFilteredLogs() {
    var protocolFilter = document.getElementById("logProtocolFilter").value;
    var directionFilter = document.getElementById("logDirectionFilter").value;
    var statusFilter = document.getElementById("logStatusFilter").value;

    return allLogs.filter(function (entry) {
      var matchesProtocol = !protocolFilter || entry.protocol === protocolFilter;
      var matchesDirection = !directionFilter || entry.direction === directionFilter;
      var matchesStatus = !statusFilter || entry.status === statusFilter;
      return matchesProtocol && matchesDirection && matchesStatus;
    });
  }

  function renderFilteredLogs() {
    var filtered = getFilteredLogs();
    var summary = document.getElementById("logFilterSummary");

    summary.textContent = allLogs.length
      ? "Showing " + filtered.length + " of " + allLogs.length + " entries"
      : "";

    if (allLogs.length === 0) {
      feed.innerHTML = '<div class="empty-state">No activity yet. Live simulated traffic will appear here shortly.</div>';
      return;
    }

    if (filtered.length === 0) {
      feed.innerHTML = '<div class="empty-state">No log entries match these filters.</div>';
      return;
    }

    feed.innerHTML = "";
    filtered.forEach(function (entry) {
      feed.appendChild(renderEntry(entry));
    });
  }

  function loadExistingLogs() {
    allLogs = AppStorage.getLogs(device.id).slice().reverse();
    renderFilteredLogs();
  }

  function addNewEntry(entry) {
    allLogs.unshift(entry);
    renderFilteredLogs();
  }

  ["logProtocolFilter", "logDirectionFilter", "logStatusFilter"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", renderFilteredLogs);
  });

  document.getElementById("clearLogsBtn").addEventListener("click", function () {
    AppStorage.clearLogs(device.id);
    loadExistingLogs();
  });

  loadExistingLogs();
  Simulator.start(device, addNewEntry);

  window.addEventListener("beforeunload", function () {
    Simulator.stop();
  });
})();
