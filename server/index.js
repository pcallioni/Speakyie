const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIO(server, { cors: { origin: "*" } });

io.on("connection", socket => {
  console.log("Client connected:", socket.id);

  socket.on("join-room", room => {
    socket.join(room);
    socket.to(room).emit("user-connected", socket.id);

    socket.on("signal", data => {
      socket.to(data.to).emit("signal", { from: socket.id, signal: data.signal });
    });

    socket.on("disconnect", () => {
      socket.to(room).emit("user-disconnected", socket.id);
    });
  });
});

server.listen(5000, () => console.log("Server running on http://localhost:5000"));