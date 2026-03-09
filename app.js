const { createServer } = require("node:http");
const config = require("./config");

let DEVICES = [
  { id: 1, device: "Smart Lamp", status: "on", room: "Kitchen" }
];

function log(level, method, path, status) {
  const time = new Date().toISOString();
  console.log(`${time} | ${level} | ${method} | ${path} | ${status}`);
}

const server = createServer((req, res) => {
  const method = req.method;
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  function handleLog(status) {

    if (config.NODE_ENV === "development") {

      let level = "INFO";

      if (status >= 400 && status < 500) level = "WARN";
      if (status >= 500) level = "ERROR";

      log(level, method, pathname, status);
    }

    if (config.NODE_ENV === "production" && status >= 400) {

      let level = "WARN";

      if (status >= 500) level = "ERROR";

      log(level, method, pathname, status);
    }
  }

  // HEALTH
  if (method === "GET" && pathname === "/health") {

    res.statusCode = 200;

    handleLog(res.statusCode);

    return res.end(JSON.stringify({
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    }));
  }

  // GET devices
  if (method === "GET" && pathname === "/devices") {

    const room = parsedUrl.searchParams.get("room");

    let results = [...DEVICES];

    if (room) {
      results = results.filter(
        (device) => device.room.toLowerCase() === room.toLowerCase()
      );
    }

    res.statusCode = 200;

    handleLog(res.statusCode);

    return res.end(JSON.stringify({
      count: results.length,
      items: results
    }));
  }

  // POST device
  if (method === "POST" && pathname === "/devices") {

    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", () => {

      try {

        const data = JSON.parse(body);

        if (!data.device || !data.room) {

          res.statusCode = 400;

          handleLog(res.statusCode);

          return res.end(JSON.stringify({
            error: "Device and Room are required"
          }));
        }

        if (data.status && !["on", "off"].includes(data.status)) {

          res.statusCode = 400;

          handleLog(res.statusCode);

          return res.end(JSON.stringify({
            error: "Status must be 'on' or 'off'"
          }));
        }

        const lastId =
          DEVICES.length > 0 ? DEVICES[DEVICES.length - 1].id : 0;

        const newDevice = {
          id: lastId + 1,
          device: data.device,
          status: data.status || "off",
          room: data.room
        };

        DEVICES.push(newDevice);

        res.statusCode = 201;

        handleLog(res.statusCode);

        res.end(JSON.stringify({
          message: "Created",
          device: newDevice
        }));

      } catch {

        res.statusCode = 400;

        handleLog(res.statusCode);

        res.end(JSON.stringify({
          error: "Invalid JSON"
        }));
      }
    });

    return;
  }

  // PATCH device
  if (method === "PATCH" && pathname.startsWith("/devices/")) {

    const id = parseInt(pathname.split("/")[2]);

    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", () => {

      try {

        const index = DEVICES.findIndex(d => d.id === id);

        if (index === -1) {

          res.statusCode = 404;

          handleLog(res.statusCode);

          return res.end(JSON.stringify({
            error: "Device not found"
          }));
        }

        const updates = JSON.parse(body);

        if (updates.id) {

          res.statusCode = 400;

          handleLog(res.statusCode);

          return res.end(JSON.stringify({
            error: "Cannot update id field"
          }));
        }

        if (updates.status && !["on", "off"].includes(updates.status)) {

          res.statusCode = 400;

          handleLog(res.statusCode);

          return res.end(JSON.stringify({
            error: "Status must be 'on' or 'off'"
          }));
        }

        DEVICES[index] = { ...DEVICES[index], ...updates };

        res.statusCode = 200;

        handleLog(res.statusCode);

        res.end(JSON.stringify({
          message: "Updated",
          device: DEVICES[index]
        }));

      } catch {

        res.statusCode = 400;

        handleLog(res.statusCode);

        res.end(JSON.stringify({
          error: "Invalid JSON"
        }));
      }
    });

    return;
  }

  // DELETE device
  if (method === "DELETE" && pathname.startsWith("/devices/")) {

    const id = parseInt(pathname.split("/")[2]);

    const originalLength = DEVICES.length;

    DEVICES = DEVICES.filter(d => d.id !== id);

    if (DEVICES.length < originalLength) {

      res.statusCode = 200;

      handleLog(res.statusCode);

      return res.end(JSON.stringify({
        message: "Deleted"
      }));

    } else {

      res.statusCode = 404;

      handleLog(res.statusCode);

      return res.end(JSON.stringify({
        error: "Device not found"
      }));
    }
  }

  // ROOT
  if (method === "GET" && pathname === "/") {

    res.statusCode = 200;

    handleLog(res.statusCode);

    return res.end(JSON.stringify({
      message: "Smart Home API працює"
    }));
  }

  res.statusCode = 404;

  handleLog(res.statusCode);

  res.end(JSON.stringify({
    error: "Route not found"
  }));

});

server.listen(config.PORT, config.HOSTNAME, () => {

  console.log(
    `Server running at http://${config.HOSTNAME}:${config.PORT}`
  );
});

function gracefulShutdown(signal) {

  console.log(`Received ${signal}. Starting graceful shutdown...`);

  const timeout = setTimeout(() => {

    console.error("Force shutdown after timeout");

    process.exit(1);

  }, 10000);

  server.close((err) => {

    clearTimeout(timeout);

    if (err) {

      console.error("Error while shutting down:", err);

      process.exit(1);
    }

    console.log("Server closed successfully");

    process.exit(0);
  });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("uncaughtException", (err) => {

  console.error("Uncaught Exception:", err);

  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {

  console.error("Unhandled Rejection:", reason);

  gracefulShutdown("unhandledRejection");
});