const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

let rooms = [];
let mainRoomId = "";
io.on("connection", (socket) => {
  console.log("user joined", socket.id);
  socket.on("createRoom", (roomId, name) => {
    socket.join(roomId);
    io.sockets.in(roomId).emit("onConnected", "You are in room no. " + roomId);
    rooms.push({ roomId: roomId, users: [{ id: socket.id, name: name }], messages:[] });
    mainRoomId = roomId;
    io.emit("rooms", rooms);
    // console.log("created", rooms);
  });

  socket.on("joinRoom", (roomId, name) => {
    socket.to(roomId).emit("update", `${name} just joined the call!`);
    socket.join(roomId);
    const room = rooms?.filter((room) => room?.roomId === roomId);
    room[0]?.users?.push({ id: socket.id, name: name });
    io.emit("rooms", rooms);
    mainRoomId = roomId;
    // console.log(room);
  });

  socket.on("leaveRoom", (roomId, id) => {
    socket.leave(roomId);
    const roomIndex = rooms.findIndex((room) => room.roomId === roomId);
    if (roomIndex !== -1) {
      const room = rooms[roomIndex];
      const users = room.users;
      const newUsers = users.filter((user) => user.id !== id);
      const updatedRoom = { ...room, users: newUsers };
      rooms[roomIndex] = updatedRoom;
      mainRoomId = roomId;
      io.emit("rooms", rooms);
    }

    if (rooms[roomIndex]?.users?.length === 0) {
      rooms = rooms.filter(r => r.roomId !== rooms[roomIndex].roomId);
      io.emit("rooms",rooms)
    }
  });

  socket.on('sendImage', (data) => {
    console.log("imageData:",data.roomId, data.sender);
    const room = rooms?.filter((room) => room?.roomId === data.roomId);
    room[0]?.messages?.push({sender:data.sender, data:data.data});
    io.emit("rooms", rooms);
  });

  socket.on('checkRoomExists', (roomName, callback) => {
    if (io.sockets.adapter.rooms.has(roomName)) {
      callback(true);
    } else {
      callback(false);
    }
  });
  

  socket.on("disconnect", () => {
    let room = rooms.find(room => room.users.some(user => user.id === socket.id));

    if (room) {
      console.log(`User ${socket.id} left room ${room.roomId}`);
      
      room.users = room.users.filter(user => user.id !== socket.id);
      if (room?.users?.length === 0) {
        rooms = rooms.filter(r => r.roomId !== room.roomId);
        io.emit("rooms",rooms)
      }else{
        let roomIndex = rooms.findIndex(r => r.roomId === room.roomId);
        rooms[roomIndex] = room;
        io.emit("rooms",rooms)
      }
    }
  });
});

http.listen(8080, () => {
  console.log("server has started");
});
