const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const PORT = 3000;

//global variables
let users = {},
  queue = [],
  peopleActive = 0;

//this fires once a user is connected; sort of like the main function
io.on("connection", (socket) => {
  //console.log(`A user connected! Socket ID: ${socket.id}`);

  users[socket.id] = {
    connectedTo: null,
  };

  //increments number of people active and online in total
  peopleActive++;

  //sends number of people active to all clients
  io.sockets.emit("stats", { people: peopleActive });

  //sets user into queue for a new conversation
  socket.on("newConvo", () => {
    if (queue.length !== 0) {
      //connects the first person in queue to current socket user
      users[queue[0]].connectedTo = socket.id;
      //connects current socket user to first person in queue
      users[socket.id].connectedTo = queue[0];
      queue.shift();

      io.to(users[socket.id].connectedTo).emit(
        "newConvo",
        "You're now chatting with a stranger! Say hi!"
      );

      io.to(socket.id).emit(
        "newConvo",
        "You're now chatting with a stranger! Say hi!"
      );
    } else {
      queue.push(socket.id);
    }
  });

  //removes user from current conversation
  socket.on("detatchConvo", () => {
    let index = queue.indexOf(socket.id);

    if (index !== -1) {
      queue.splice(index, 1);
    }

    if (users[socket.id].connectedTo != null) {
      //sets user connectedTo variable to null from current user disconnecting
      users[users[socket.id].connectedTo].connectedTo = null;

      //sends a message about who disconnected
      io.to(users[socket.id].connectedTo).emit(
        "detatchConvo",
        "Stranger has disconnected."
      );
    }

    io.to(socket.id).emit("detatchConvo", "You have disconnected.");
  });

  //receives and sends message to and from user
  socket.on("message", function (msg) {
    io.to(users[socket.id].connectedTo).emit("message", {
      user: "Stranger",
      message: msg,
    });
    io.to(socket.id).emit("message", { user: "You", message: msg });
  });

  //tells the client that the stranger is typing
  socket.on("typing", function (result) {
    io.to(users[socket.id].connectedTo).emit("typing", result);
  });

  //this fires when a user disconnects from the server
  socket.on("disconnect", function () {
    //console.log("A user disconnected!");

    let index = queue.indexOf(socket.id);

    if (index !== -1) {
      queue.splice(index, 1);
    }

    if (peopleActive !== 1 && users[socket.id].connectedTo != null) {
      //sends a message about who disconnected
      io.to(users[socket.id].connectedTo).emit(
        "detatchConvo",
        "Stranger has disconnected."
      );

      //sets user connectedTo variable to null from current user disconnecting
      users[users[socket.id].connectedTo].connectedTo = null;
    }

    delete users[socket.id];
    peopleActive--;
    io.sockets.emit("stats", { people: peopleActive });
  });
});

server.listen(PORT, () =>
  console.log(`Now listening at http://localhost:${PORT}.`)
);
