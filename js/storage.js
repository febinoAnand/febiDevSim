// localStorage data-access layer for projects, devices, and per-device logs.
var AppStorage = (function () {
  var KEYS = {
    projects: "ds_projects",
    devices: "ds_devices",
    users: "ds_users",
    roles: "ds_roles",
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
      protocol: data.protocol || "MQTT",
      host: data.host || "",
      port: data.port || "",
      messageType: data.messageType || "JSON",
      interval: data.interval ? Number(data.interval) : 3,
      sampleMessage: data.sampleMessage || "",
      createdAt: _nowIso()
    };
    devices.push(device);
    _saveDevices(devices);
    return device;
  }

  function updateDevice(id, data) {
    var devices = getDevices();
    var device = devices.filter(function (d) { return d.id === id; })[0];
    if (!device) return null;
    device.name = data.name;
    device.location = data.location || "";
    device.serialNo = data.serialNo || "";
    device.type = data.type || "Sensor";
    device.status = data.status || device.status;
    device.protocol = data.protocol || device.protocol;
    device.host = data.host || "";
    device.port = data.port || "";
    device.messageType = data.messageType || "JSON";
    device.interval = data.interval ? Number(data.interval) : 3;
    device.sampleMessage = data.sampleMessage || "";
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

  function updateProject(id, data) {
    var projects = getProjects();
    var project = projects.filter(function (p) { return p.id === id; })[0];
    if (!project) return null;
    project.name = data.name;
    project.description = data.description || "";
    project.owner = data.owner || "";
    project.startDate = data.startDate || "";
    project.status = data.status || "planning";
    project.tags = data.tags || [];
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

  // ---------- Roles ----------

  var PERMISSION_MODULES = ["projects", "devices", "users", "roles"];
  var PERMISSION_ACTIONS = ["create", "read", "update", "delete"];

  function getRoles() {
    return _read(KEYS.roles, []);
  }

  function _saveRoles(roles) {
    _write(KEYS.roles, roles);
  }

  function getRole(id) {
    return getRoles().filter(function (r) { return r.id === id; })[0];
  }

  function _buildPermissions(rawPermissions) {
    var permissions = {};
    PERMISSION_MODULES.forEach(function (mod) {
      var src = (rawPermissions && rawPermissions[mod]) || {};
      permissions[mod] = {
        create: !!src.create,
        read: !!src.read,
        update: !!src.update,
        delete: !!src.delete
      };
    });
    return permissions;
  }

  function createRole(data) {
    var roles = getRoles();
    var role = {
      id: _genId("role"),
      name: data.name,
      permissions: _buildPermissions(data.permissions),
      createdAt: _nowIso()
    };
    roles.push(role);
    _saveRoles(roles);
    return role;
  }

  function updateRole(id, data) {
    var roles = getRoles();
    var role = roles.filter(function (r) { return r.id === id; })[0];
    if (!role) return null;
    role.name = data.name;
    role.permissions = _buildPermissions(data.permissions);
    _saveRoles(roles);
    return role;
  }

  function deleteRole(id) {
    var roles = getRoles().filter(function (r) { return r.id !== id; });
    _saveRoles(roles);
  }

  function isRoleInUse(roleId) {
    return getUsers().some(function (u) { return u.roleId === roleId; });
  }

  // ---------- Users ----------

  function getUsers() {
    return _read(KEYS.users, []);
  }

  function _saveUsers(users) {
    _write(KEYS.users, users);
  }

  function getUser(id) {
    return getUsers().filter(function (u) { return u.id === id; })[0];
  }

  function getUserByUsername(username) {
    var uname = (username || "").trim().toLowerCase();
    return getUsers().filter(function (u) { return u.username.toLowerCase() === uname; })[0];
  }

  function createUser(data) {
    if (getUserByUsername(data.username)) return null; // duplicate username guard
    var users = getUsers();
    var user = {
      id: _genId("user"),
      username: data.username,
      name: data.name || "",
      email: data.email || "",
      password: data.password || "",
      roleId: data.roleId || "",
      createdAt: _nowIso()
    };
    users.push(user);
    _saveUsers(users);
    return user;
  }

  function updateUser(id, data) {
    var existing = getUserByUsername(data.username);
    if (existing && existing.id !== id) return null; // duplicate username guard
    var users = getUsers();
    var user = users.filter(function (u) { return u.id === id; })[0];
    if (!user) return null;
    user.username = data.username;
    user.name = data.name || "";
    user.email = data.email || "";
    if (data.password) user.password = data.password; // blank keeps current password
    user.roleId = data.roleId || user.roleId;
    _saveUsers(users);
    return user;
  }

  function deleteUser(id) {
    var users = getUsers().filter(function (u) { return u.id !== id; });
    _saveUsers(users);
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

  // ---------- Migrations ----------

  // Upgrades roles saved under the old flat {create, edit/update, delete} shape
  // (from before permissions were split per module) to the current
  // { projects: {create,read,update,delete}, devices: {...}, users: {...}, roles: {...} } shape.
  function _migrateLegacyRoles() {
    var roles = getRoles();
    var changed = false;

    roles = roles.map(function (r) {
      var perms = r.permissions || {};
      var isCurrentShape = PERMISSION_MODULES.every(function (mod) {
        return perms[mod] && typeof perms[mod] === "object";
      });
      if (isCurrentShape) return r;

      changed = true;
      var legacyCreate = !!perms.create;
      var legacyUpdate = !!(perms.update || perms.edit);
      var legacyDelete = !!perms.delete;
      // The old model had no separate "read" gate — everyone could view everything.
      var legacyRead = perms.read !== undefined ? !!perms.read : true;

      var upgraded = {};
      PERMISSION_MODULES.forEach(function (mod) {
        upgraded[mod] = {
          create: legacyCreate,
          read: legacyRead,
          update: legacyUpdate,
          delete: legacyDelete
        };
      });
      r.permissions = upgraded;
      return r;
    });

    if (changed) _saveRoles(roles);
  }

  // Guarantees a login-capable admin account exists even for browsers that were
  // already past the one-time seed (ds_seeded) before Users/Roles was introduced,
  // so the seeding below never got a chance to create it.
  function _ensureAdminAccountExists() {
    if (getUsers().length > 0) return;

    var fullAccess = { create: true, read: true, update: true, delete: true };
    var roles = getRoles();
    var adminRole = roles.filter(function (r) { return r.name === "Administrator"; })[0];
    if (!adminRole) {
      adminRole = createRole({
        name: "Administrator",
        permissions: { projects: fullAccess, devices: fullAccess, users: fullAccess, roles: fullAccess }
      });
    }

    var hasViewer = roles.some(function (r) { return r.name === "Viewer"; });
    if (!hasViewer) {
      var readOnly = { create: false, read: true, update: false, delete: false };
      var noAccess = { create: false, read: false, update: false, delete: false };
      createRole({
        name: "Viewer",
        permissions: { projects: readOnly, devices: readOnly, users: noAccess, roles: noAccess }
      });
    }

    createUser({
      username: "admin",
      name: "Admin User",
      email: "admin@example.com",
      password: "admin123",
      roleId: adminRole.id
    });
  }

  // ---------- Seed data ----------

  function init() {
    _migrateLegacyRoles();
    _ensureAdminAccountExists();
    if (localStorage.getItem(KEYS.seeded)) return;

    var tempSensor = createDevice({
      name: "Temp Sensor 01",
      location: "Warehouse A",
      serialNo: "SN-1001",
      type: "Temperature Sensor",
      status: "online",
      protocol: "MQTT",
      host: "broker.hivemq.com",
      port: "1883",
      messageType: "JSON",
      interval: 5,
      sampleMessage: '{"temperature": 22.5, "unit": "C"}'
    });

    createDevice({
      name: "Door Controller",
      location: "Main Entrance",
      serialNo: "SN-1002",
      type: "Actuator",
      status: "online",
      protocol: "HTTP",
      host: "192.168.1.50",
      port: "8080",
      messageType: "String",
      interval: 10,
      sampleMessage: "DOOR_STATUS:LOCKED"
    });

    createDevice({
      name: "Gateway Hub",
      location: "Server Room",
      serialNo: "SN-1003",
      type: "Gateway",
      status: "idle",
      protocol: "MQTT",
      host: "broker.hivemq.com",
      port: "1883",
      messageType: "JSON",
      interval: 8,
      sampleMessage: '{"uptime": 3600, "status": "idle"}'
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
    updateDevice: updateDevice,
    deleteDevice: deleteDevice,
    getProjects: getProjects,
    getProject: getProject,
    createProject: createProject,
    updateProject: updateProject,
    deleteProject: deleteProject,
    addDeviceToProject: addDeviceToProject,
    removeDeviceFromProject: removeDeviceFromProject,
    getAvailableDevicesForProject: getAvailableDevicesForProject,
    PERMISSION_MODULES: PERMISSION_MODULES,
    PERMISSION_ACTIONS: PERMISSION_ACTIONS,
    getRoles: getRoles,
    getRole: getRole,
    createRole: createRole,
    updateRole: updateRole,
    deleteRole: deleteRole,
    isRoleInUse: isRoleInUse,
    getUsers: getUsers,
    getUser: getUser,
    getUserByUsername: getUserByUsername,
    createUser: createUser,
    updateUser: updateUser,
    deleteUser: deleteUser,
    getLogs: getLogs,
    appendLog: appendLog,
    clearLogs: clearLogs
  };
})();
