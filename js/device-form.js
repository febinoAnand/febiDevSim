(function () {
  Auth.requireAuth();
  AppStorage.init();

  var params = new URLSearchParams(window.location.search);
  var deviceId = params.get("id");
  var device = deviceId ? AppStorage.getDevice(deviceId) : null;

  var requiredPermission = deviceId ? "update" : "create";
  if (!Auth.hasPermission("devices", requiredPermission)) {
    window.location.href = "devices.html";
    return;
  }

  if (deviceId && !device) {
    window.location.href = "devices.html";
    return;
  }

  var titleEl = document.getElementById("deviceFormTitle");
  var submitBtn = document.getElementById("deviceSubmitBtn");
  var errorEl = document.getElementById("deviceFormError");

  if (device) {
    document.title = "Device Simulator — Edit Device";
    titleEl.textContent = "Edit Virtual Device";
    submitBtn.textContent = "Save Changes";

    document.getElementById("deviceName").value = device.name;
    document.getElementById("deviceLocation").value = device.location || "";
    document.getElementById("deviceSerial").value = device.serialNo || "";
    document.getElementById("deviceType").value = device.type || "";
    document.getElementById("deviceProtocol").value = device.protocol || "MQTT";
    document.getElementById("deviceStatus").value = device.status || "online";
    document.getElementById("deviceHost").value = device.host || "";
    document.getElementById("devicePort").value = device.port || "";
    document.getElementById("deviceMessageType").value = device.messageType || "JSON";
    document.getElementById("deviceInterval").value = device.interval || 3;
    document.getElementById("deviceSampleMessage").value = device.sampleMessage || "";
  } else {
    document.getElementById("deviceInterval").value = 3;
  }

  document.getElementById("deviceForm").addEventListener("submit", function (event) {
    event.preventDefault();

    var name = document.getElementById("deviceName").value.trim();
    if (!name) {
      errorEl.textContent = "Device name is required.";
      return;
    }

    var fields = {
      name: name,
      location: document.getElementById("deviceLocation").value.trim(),
      serialNo: document.getElementById("deviceSerial").value.trim(),
      type: document.getElementById("deviceType").value.trim(),
      protocol: document.getElementById("deviceProtocol").value,
      status: document.getElementById("deviceStatus").value,
      host: document.getElementById("deviceHost").value.trim(),
      port: document.getElementById("devicePort").value.trim(),
      messageType: document.getElementById("deviceMessageType").value,
      interval: document.getElementById("deviceInterval").value,
      sampleMessage: document.getElementById("deviceSampleMessage").value.trim()
    };

    if (device) {
      AppStorage.updateDevice(device.id, fields);
    } else {
      AppStorage.createDevice(fields);
    }

    window.location.href = "devices.html";
  });
})();
