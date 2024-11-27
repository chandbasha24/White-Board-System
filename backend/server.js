const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { PeerServer } = require("peer");

const { addUser, getUser, removeUser } = require("./utils/users");

const app = express();
const server = http.createServer(app);

// Create a PeerServer instance
const peerServer = PeerServer({
  port: 5001,
  path: "/peerjs", // Ensure this matches the path you use in the client
});

// Mount the PeerServer on the specified route
app.use("/peerjs", peerServer);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Routes
app.get("/", (req, res) => {
  res.send("This is the MERN realtime board sharing app official server by FullyWorld web tutorials");
});

let roomIdGlobal, imgURLGlobal;

// Socket.IO connection
io.on("connection", (socket) => {
  socket.on("userJoined", (data) => {
    const { name, userId, roomId, host, presenter } = data;
    roomIdGlobal = roomId;
    socket.join(roomId);

    const users = addUser({
      name,
      userId,
      roomId,
      host,
      presenter,
      socketId: socket.id,
    });

    socket.emit("userIsJoined", { success: true, users });
    console.log({ name, userId });

    socket.broadcast.to(roomId).emit("allUsers", users);

    setTimeout(() => {
      socket.broadcast.to(roomId).emit("userJoinedMessageBroadcasted", { name, userId, users });
      socket.broadcast.to(roomId).emit("whiteBoardDataResponse", { imgURL: imgURLGlobal });
    }, 1000);
  });

  socket.on("whiteboardData", (data) => {
    imgURLGlobal = data;
    socket.broadcast.to(roomIdGlobal).emit("whiteBoardDataResponse", { imgURL: data });
  });

  socket.on("message", (data) => {
    const { message } = data;
    const user = getUser(socket.id);

    if (user) {
      socket.broadcast.to(roomIdGlobal).emit("messageResponse", { message, name: user.name });
    }
  });

  socket.on("disconnect", () => {
    const user = getUser(socket.id);

    if (user) {
      removeUser(socket.id);
      socket.broadcast.to(roomIdGlobal).emit("userLeftMessageBroadcasted", {
        name: user.name,
        userId: user.userId,
      });
    }
  });
});

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
