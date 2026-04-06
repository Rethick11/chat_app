import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static("public"));

const users = {};
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("create-room", (roomId, username) => {
    rooms[roomId] = {
      id: roomId,
      users: [{ id: socket.id, username }],
      creator: socket.id,
    };

    socket.join(roomId);
    socket.emit("room-created", roomId);
  });

  socket.on("join-room", (roomId, username) => {
    if (rooms[roomId]) {
      rooms[roomId].users.push({ id: socket.id, username });
      socket.join(roomId);
      io.to(roomId).emit("user-joined", {
        name: username,
        users: rooms[roomId].users,
        creator: rooms[roomId].creator, // send this too
      });
    } else {
      socket.emit("error", "Room does not exist");
    }
  });

  socket.on("upload-image", (roomId, imageData) => {
    if (rooms[roomId] && rooms[roomId].creator === socket.id) {
      io.to(roomId).emit("new-image", imageData);
    } else {
      socket.emit("error", "Only the host can upload images");
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];

      room.users = room.users.filter((u) => u.id !== socket.id);

      if (room.creator === socket.id) {
        io.to(roomId).emit("room-closed", "Host has left the room");
        delete rooms[roomId];
      }
    }
  });
});

httpServer.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
