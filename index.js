const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// In-memory room storage
const rooms = {};

const emitRoomMetrics = (roomId) => {
  const room = io.sockets.adapter.rooms.get(roomId);
  const users = room ? room.size : 0;

  io.to(roomId).emit("room-metrics", { users });
};

io.on("connection", (socket) => {
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    // Send existing text if available
    if (rooms[roomId]) {
      socket.emit("text-update", rooms[roomId]);
    }

    // ✅ Update active users count
    emitRoomMetrics(roomId);
  });

  socket.on("text-change", ({ roomId, text }) => {
    rooms[roomId] = text;
    socket.to(roomId).emit("text-update", text);
  });

  socket.on("disconnect", () => {
    socket.rooms.forEach((roomId) => {
      // Ignore the private socket room
      if (roomId === socket.id) return;

      emitRoomMetrics(roomId);
    });
  });
});

app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
