// Client-side fake MQTT/HTTP traffic generator for a device detail page.
var Simulator = (function () {
  var timerId = null;

  function _genId() {
    return "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  }

  function _pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function _pickProtocol(device) {
    if (device.protocol === "MQTT" || device.protocol === "HTTP") return device.protocol;
    return Math.random() < 0.5 ? "MQTT" : "HTTP";
  }

  function _randomPayload() {
    var samples = [
      function () { return { temperature: (18 + Math.random() * 10).toFixed(1), unit: "C" }; },
      function () { return { humidity: (30 + Math.random() * 40).toFixed(1), unit: "%" }; },
      function () { return { battery: Math.round(50 + Math.random() * 50), unit: "%" }; },
      function () { return { state: _pick(["open", "closed", "locked", "unlocked"]) }; },
      function () { return { signalStrength: -1 * Math.round(40 + Math.random() * 40), unit: "dBm" }; }
    ];
    return JSON.stringify(_pick(samples)());
  }

  function _generateEntry(device) {
    var protocol = _pickProtocol(device);
    var direction = Math.random() < 0.5 ? "sent" : "received";
    var isError = Math.random() < 0.08;
    var isTimeout = !isError && Math.random() < 0.04;
    var status = isError ? "error" : (isTimeout ? "timeout" : "ok");

    var topicOrEndpoint;
    if (protocol === "MQTT") {
      topicOrEndpoint = _pick([
        "devices/" + device.id + "/telemetry",
        "devices/" + device.id + "/status",
        "devices/" + device.id + "/command"
      ]);
    } else {
      var method = direction === "sent" ? _pick(["POST", "PUT"]) : "GET";
      topicOrEndpoint = method + " /api/devices/" + device.id + (direction === "sent" ? "/telemetry" : "/status");
    }

    return {
      id: _genId(),
      timestamp: new Date().toISOString(),
      protocol: protocol,
      direction: direction,
      topicOrEndpoint: topicOrEndpoint,
      payload: _randomPayload(),
      status: status
    };
  }

  function start(device, onNewEntry) {
    stop();

    function tick() {
      var entry = _generateEntry(device);
      AppStorage.appendLog(device.id, entry);
      if (typeof onNewEntry === "function") onNewEntry(entry);
      timerId = setTimeout(tick, 2000 + Math.random() * 1500);
    }

    timerId = setTimeout(tick, 1200);
  }

  function stop() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  return {
    start: start,
    stop: stop
  };
})();
