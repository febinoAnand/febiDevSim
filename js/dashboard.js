(function () {
  var STATUS_LABELS = {
    planning: "Planning",
    active: "Active",
    "on-hold": "On Hold",
    completed: "Completed"
  };

  var CHART_COLORS = ["#4f7cff", "#8a5cf6", "#35c56a", "#e8a53d", "#ef5a6f", "#33bfe0"];

  function extractNumericValue(payloadStr) {
    try {
      var obj = JSON.parse(payloadStr);
      for (var key in obj) {
        if (typeof obj[key] === "number") return obj[key];
      }
    } catch (e) {
      // not JSON or no numeric field — ignore
    }
    return null;
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function renderSentActivityChart() {
    var devices = AppStorage.getDevices();
    var chartWrap = document.getElementById("sentActivityChart");
    var legendWrap = document.getElementById("sentActivityLegend");

    var series = [];
    devices.forEach(function (d) {
      var points = AppStorage.getLogs(d.id)
        .filter(function (entry) { return entry.direction === "sent"; })
        .map(function (entry) { return { value: extractNumericValue(entry.payload), timestamp: entry.timestamp }; })
        .filter(function (p) { return p.value !== null; })
        .slice(-15);

      if (points.length >= 2) {
        series.push({ device: d, points: points });
      }
    });

    if (series.length === 0) {
      chartWrap.innerHTML = '<div class="empty-state">No sent activity yet. Open a device to generate live simulated traffic, then return here to see the trend.</div>';
      legendWrap.innerHTML = "";
      return;
    }

    series = series.slice(0, 6);

    var allValues = [];
    var allTimes = [];
    series.forEach(function (s) {
      s.points.forEach(function (p) {
        allValues.push(p.value);
        allTimes.push(new Date(p.timestamp).getTime());
      });
    });

    var minVal = Math.min.apply(null, allValues);
    var maxVal = Math.max.apply(null, allValues);
    if (minVal === maxVal) { minVal -= 1; maxVal += 1; }
    var valuePad = (maxVal - minVal) * 0.12;
    minVal -= valuePad;
    maxVal += valuePad;

    var minTime = Math.min.apply(null, allTimes);
    var maxTime = Math.max.apply(null, allTimes);
    if (minTime === maxTime) { maxTime += 1000; }

    var width = Math.max(320, Math.round(chartWrap.clientWidth) || 640);
    var height = 190;
    var marginLeft = 44, marginRight = 14, marginTop = 14, marginBottom = 26;
    var plotWidth = width - marginLeft - marginRight;
    var plotHeight = height - marginTop - marginBottom;

    function yFor(v) {
      return marginTop + plotHeight - ((v - minVal) / (maxVal - minVal)) * plotHeight;
    }
    function xFor(ts) {
      var t = new Date(ts).getTime();
      return marginLeft + ((t - minTime) / (maxTime - minTime)) * plotWidth;
    }

    var gridLines = "";
    var yLabels = "";
    for (var g = 0; g <= 4; g++) {
      var gy = marginTop + (plotHeight / 4) * g;
      gridLines += '<line x1="' + marginLeft + '" y1="' + gy.toFixed(1) + '" x2="' + (width - marginRight) + '" y2="' + gy.toFixed(1) + '" stroke="var(--color-border)" stroke-width="1" />';
      var gVal = maxVal - (g / 4) * (maxVal - minVal);
      yLabels += '<text x="' + (marginLeft - 8) + '" y="' + (gy + 3).toFixed(1) + '" text-anchor="end" font-size="10" fill="var(--color-text-muted)">' + (Math.round(gVal * 10) / 10) + '</text>';
    }

    var xLabels = "";
    var tickFracs = [0, 1 / 3, 2 / 3, 1];
    tickFracs.forEach(function (frac, idx) {
      var t = minTime + frac * (maxTime - minTime);
      var x = marginLeft + frac * plotWidth;
      var anchor = idx === 0 ? "start" : (idx === tickFracs.length - 1 ? "end" : "middle");
      xLabels += '<text x="' + x.toFixed(1) + '" y="' + (height - marginBottom + 18) + '" text-anchor="' + anchor + '" font-size="10" fill="var(--color-text-muted)">' + formatTime(t) + '</text>';
    });

    var baselineY = marginTop + plotHeight;
    var defs = "";
    var areas = "";
    var polylines = series.map(function (s, i) {
      var color = CHART_COLORS[i % CHART_COLORS.length];
      var gradId = "sentChartGrad" + i;
      var coords = s.points.map(function (p) {
        return { x: xFor(p.timestamp), y: yFor(p.value), value: p.value, timestamp: p.timestamp };
      });
      var pointsAttr = coords.map(function (c) { return c.x.toFixed(1) + "," + c.y.toFixed(1); }).join(" ");

      defs += '<linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.32" />' +
        '<stop offset="100%" stop-color="' + color + '" stop-opacity="0" />' +
        '</linearGradient>';

      var areaPath = 'M ' + coords[0].x.toFixed(1) + ',' + baselineY.toFixed(1) + ' ' +
        coords.map(function (c) { return 'L ' + c.x.toFixed(1) + ',' + c.y.toFixed(1); }).join(" ") +
        ' L ' + coords[coords.length - 1].x.toFixed(1) + ',' + baselineY.toFixed(1) + ' Z';
      areas += '<path d="' + areaPath + '" fill="url(#' + gradId + ')" stroke="none" />';

      var dots = coords.map(function (c) {
        return '<circle cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="3.5" fill="' + color + '">' +
          '<title>' + Utils.escapeHtml(s.device.name) + ' — ' + c.value + ' at ' + formatTime(c.timestamp) + '</title>' +
          '</circle>';
      }).join("");
      return '<polyline points="' + pointsAttr + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />' + dots;
    }).join("");

    chartWrap.innerHTML =
      '<svg viewBox="0 0 ' + width + ' ' + height + '" class="line-chart-svg">' +
        '<defs>' + defs + '</defs>' +
        gridLines +
        areas +
        polylines +
        yLabels +
        xLabels +
      '</svg>';

    legendWrap.innerHTML = series.map(function (s, i) {
      var color = CHART_COLORS[i % CHART_COLORS.length];
      var last = s.points[s.points.length - 1];
      return '<span class="legend-item"><span class="legend-dot" style="background:' + color + ';"></span>' +
        '<span>' + Utils.escapeHtml(s.device.name) + ' <span class="text-muted-sm">' + last.value + ' at ' + formatTime(last.timestamp) + '</span></span>' +
        '</span>';
    }).join("");
  }

  function renderDashboard() {
    var projects = AppStorage.getProjects();
    var devices = AppStorage.getDevices();

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
      { label: "Active Devices", value: deviceStatusCounts.online, icon: "&#128640;" },
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

    renderSentActivityChart();

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
          '<div><strong>' + Utils.escapeHtml(p.name) + '</strong><div class="text-muted-sm">' + p.deviceIds.length + ' device(s)</div></div>' +
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
          '<div><a href="device-detail.html?id=' + encodeURIComponent(d.id) + '">' + Utils.escapeHtml(d.name) + '</a>' +
          '<div class="text-muted-sm">' + Utils.escapeHtml(d.serialNo || "n/a") + '</div></div>' +
          '<span class="badge badge-' + d.status + '">' + Utils.escapeHtml(d.status) + '</span>' +
          '</div>';
      }).join("");
    }
  }

  renderDashboard();
})();
