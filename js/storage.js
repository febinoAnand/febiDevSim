// localStorage data-access layer for projects, devices, and per-device logs.
var AppStorage = (function () {
  var KEYS = {
    projects: "ds_projects",
    devices: "ds_devices",
    seeded: "ds_seeded",
    logPrefix: "ds_logs_"
  };

  var MAX_LOGS_PER_DEVICE = 200;

  function _read(key, fallback) {
    var raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function _write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function _genId(prefix) {
    return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  }

  function _nowIso() {
    return new Date().toISOString();
  }

  // ---------- Devices ----------

  function getDevices() {
    return _read(KEYS.devices, []);
  }

  function _saveDevices(devices) {
    _write(KEYS.devices, devices);
  }

  function getDevice(id) {
    return getDevices().filter(function (d) { return d.id === id; })[0];
  }

  function createDevice(data) {
    var devices = getDevices();
    var device = {
      id: _genId("dev"),
      name: data.name,
      location: data.location || "",
      serialNo: data.serialNo || "",
      type: data.type || "Sensor",
      status: data.status || "online",
      protocol: data.protocol || "both",
      createdAt: _nowIso()
    };
    devices.push(device);
    _saveDevices(devices);
    return device;
  }

  function deleteDevice(id) {
    var devices = getDevices().filter(function (d) { return d.id !== id; });
    _saveDevices(devices);

    // Remove this device from any project referencing it.
    var projects = getProjects().map(function (p) {
      p.deviceIds = p.deviceIds.filter(function (did) { return did !== id; });
      return p;
    });
    _saveProjects(projects);

    localStorage.removeItem(KEYS.logPrefix + id);
  }

  // ---------- Projects ----------

  function getProjects() {
    return _read(KEYS.projects, []);
  }

  function _saveProjects(projects) {
    _write(KEYS.projects, projects);
  }

  function getProject(id) {
    return getProjects().filter(function (p) { return p.id === id; })[0];
  }

  function createProject(data) {
    var projects = getProjects();
    var project = {
      id: _genId("proj"),
      name: data.name,
      description: data.description || "",
      owner: data.owner || "",
      startDate: data.startDate || "",
      status: data.status || "planning",
      tags: data.tags || [],
      deviceIds: [],
      createdAt: _nowIso()
    };
    projects.push(project);
    _saveProjects(projects);
    return project;
  }

  function deleteProject(id) {
    var projects = getProjects().filter(function (p) { return p.id !== id; });
    _saveProjects(projects);
  }

  function addDeviceToProject(projectId, deviceId) {
    var projects = getProjects();
    var project = projects.filter(function (p) { return p.id === projectId; })[0];
    if (!project) return false;
    if (project.deviceIds.indexOf(deviceId) !== -1) return false; // duplicate guard
    project.deviceIds.push(deviceId);
    _saveProjects(projects);
    return true;
  }

  function removeDeviceFromProject(projectId, deviceId) {
    var projects = getProjects();
    var project = projects.filter(function (p) { return p.id === projectId; })[0];
    if (!project) return false;
    project.deviceIds = project.deviceIds.filter(function (id) { return id !== deviceId; });
    _saveProjects(projects);
    return true;
  }

  function getAvailableDevicesForProject(projectId) {
    var project = getProject(projectId);
    if (!project) return [];
    var allDevices = getDevices();
    return allDevices.filter(function (d) { return project.deviceIds.indexOf(d.id) === -1; });
  }

  // ---------- Logs ----------

  function getLogs(deviceId) {
    return _read(KEYS.logPrefix + deviceId, []);
  }

  function appendLog(deviceId, entry) {
    var logs = getLogs(deviceId);
    logs.push(entry);
    if (logs.length > MAX_LOGS_PER_DEVICE) {
      logs = logs.slice(logs.length - MAX_LOGS_PER_DEVICE);
    }
    _write(KEYS.logPrefix + deviceId, logs);
  }

  function clearLogs(deviceId) {
    localStorage.removeItem(KEYS.logPrefix + deviceId);
  }

  // ---------- Seed data ----------

  function init() {
    if (localStorage.getItem(KEYS.seeded)) return;

    var tempSensor = createDevice({
      name: "Temp Sensor 01",
      location: "Warehouse A",
      serialNo: "SN-1001",
      type: "Temperature Sensor",
      status: "online",
      protocol: "MQTT"
    });

    createDevice({
      name: "Door Controller",
      location: "Main Entrance",
      serialNo: "SN-1002",
      type: "Actuator",
      status: "online",
      protocol: "HTTP"
    });

    createDevice({
      name: "Gateway Hub",
      location: "Server Room",
      serialNo: "SN-1003",
      type: "Gateway",
      status: "idle",
      protocol: "both"
    });

    var project = createProject({
      name: "Smart Warehouse Pilot",
      description: "Initial rollout of connected sensors for Warehouse A.",
      owner: "Acme Logistics",
      startDate: new Date().toISOString().slice(0, 10),
      status: "active",
      tags: ["warehouse", "pilot", "iot"]
    });
    addDeviceToProject(project.id, tempSensor.id);

    localStorage.setItem(KEYS.seeded, "true");
  }

  return {
    init: init,
    getDevices: getDevices,
    getDevice: getDevice,
    createDevice: createDevice,
    deleteDevice: deleteDevice,
    getProjects: getProjects,
    getProject: getProject,
    createProject: createProject,
    deleteProject: deleteProject,
    addDeviceToProject: addDeviceToProject,
    removeDeviceFromProject: removeDeviceFromProject,
    getAvailableDevicesForProject: getAvailableDevicesForProject,
    getLogs: getLogs,
    appendLog: appendLog,
    clearLogs: clearLogs
  };
})();
