const { createServer } = require("node:http");

let DEVICES = [
  { id: 1, device: "Smart Lamp", status: "on", room: "Kitchen" }
];

const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || "localhost";

const server = createServer((req, res) => {
  const method = req.method;
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // get
  if (method === "GET" && pathname === "/devices") {
    const room = parsedUrl.searchParams.get("room");

    let results = [...DEVICES];

    if (room) {
      results = results.filter(
        (device) => device.room.toLowerCase() === room.toLowerCase()
      );
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({ count: results.length, items: results }));
  }

  // post
  if (method === "POST" && pathname === "/devices") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);

        if (!data.device || !data.room) {
          res.statusCode = 400;
          return res.end(
            JSON.stringify({ error: "Device and Room are required" })
          );
        }

        if (data.status && !["on", "off"].includes(data.status)) {
          res.statusCode = 400;
          return res.end(
            JSON.stringify({ error: "Status must be 'on' or 'off'" })
          );
        }

        const lastId =
          DEVICES.length > 0 ? DEVICES[DEVICES.length - 1].id : 0;

        const newDevice = {
          id: lastId + 1,
          device: data.device,
          status: data.status || "off",
          room: data.room,
        };

        DEVICES.push(newDevice);

        res.statusCode = 201;
        res.end(JSON.stringify({ message: "Created", device: newDevice }));
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });

    return;
  }

  // patch
  if (method === "PATCH" && pathname.startsWith("/devices/")) {
    const id = parseInt(pathname.split("/")[2]);

    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const index = DEVICES.findIndex((d) => d.id === id);

        if (index === -1) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: "Device not found" }));
        }

        const updates = JSON.parse(body);

        if (updates.id) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "Cannot update id field" }));
        }

        if (updates.status && !["on", "off"].includes(updates.status)) {
          res.statusCode = 400;
          return res.end(
            JSON.stringify({ error: "Status must be 'on' or 'off'" })
          );
        }

        DEVICES[index] = { ...DEVICES[index], ...updates };

        res.statusCode = 200;
        res.end(JSON.stringify({ message: "Updated", device: DEVICES[index] }));
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });

    return;
  }

  // delete
  if (method === "DELETE" && pathname.startsWith("/devices/")) {
    const id = parseInt(pathname.split("/")[2]);

    const originalLength = DEVICES.length;
    DEVICES = DEVICES.filter((d) => d.id !== id);

    if (DEVICES.length < originalLength) {
      res.statusCode = 200;
      return res.end(JSON.stringify({ message: "Deleted" }));
    } else {
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: "Device not found" }));
    }
  }

  if (method === "GET" && pathname === "/") {
    res.statusCode = 200;
    return res.end(JSON.stringify({ message: "Smart Home API працює" }));
    }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: "Route not found" }));
});

server.listen(PORT, HOSTNAME, () => {
  console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
});