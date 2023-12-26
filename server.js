// server.js
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const connectDb = require('./config/connectDb');
const { logger } = require('./middleware/logEvents');
const errorHandler = require('./middleware/errorHandler');
const EVENT = require('./config/constant');
const {
  buildMsg,
  activateUser,
  userLeavesApp,
  getUser,
  getUsersInRoom,
  getAllActiveRooms,
} = require('./utils/socketUser');
const boardRouter = require('./routes/boardRouter');
const URL = 'http://localhost:5173';
const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors({ origin: URL }));

const expressServer = app.listen(PORT, () => {
  console.log(`Server Running on ${PORT}`);
});

const io = new Server(expressServer, { cors: URL });

io.on(EVENT.CONNECTION, (socket) => {
  try {
    socket.on(EVENT.DRAW, (data) => {
      const room = getUser(socket.id)?.room;
      if (room) {
        socket.broadcast.to(room).emit(EVENT.DRAW, data);
      }
    });

    socket.on(EVENT.UNDO, (data) => {
      const room = getUser(socket.id)?.room;
      if (room) {
        socket.broadcast.to(room).emit(EVENT.UNDO, data);
      }
    });

    socket.on(EVENT.REDO, (data) => {
      const room = getUser(socket.id)?.room;
      if (room) {
        socket.broadcast.to(room).emit(EVENT.REDO, data);
      }
    });

    socket.on(EVENT.CLEAR, () => {
      const room = getUser(socket.id)?.room;
      if (room) {
        socket.broadcast.to(room).emit(EVENT.CLEAR);
      }
    });

    handleEnterRoom(socket);

    socket.on(EVENT.DISCONNECT, () => {
      const user = getUser(socket.id);
      if (user) {
        handleUserDisconnect(socket, user);
      }
    });

    socket.on(EVENT.NOTIFY, ({ text }) => {
      const room = getUser(socket.id)?.room;
      if (room) {
        io.to(room).emit(EVENT.NOTIFY, buildMsg(text));
      }
    });
  } catch (error) {
    console.error('Error in socket connection:', error);
  }
});

function handleEnterRoom(socket) {
  enterRoom(socket).then(({ name, room }) => {
    notifyRoom(socket, `Welcome ${name} to the ${room} Board`);
    broadcastToRoom(socket, `${name} has joined`);

    io.to(room).emit(EVENT.USERLIST, {
      users: getUsersInRoom(room),
    });

    io.emit(EVENT.ROOMLIST, {
      rooms: getAllActiveRooms(),
    });
  });
}

function enterRoom(socket) {
  return new Promise((resolve) => {
    socket.on(EVENT.ENTERROOM, ({ name, room }) => {
      const prevRoom = getUser(socket.id)?.room;
      if (prevRoom) {
        socket.leave(prevRoom);
        io.to(prevRoom).emit(EVENT.NOTIFY, buildMsg(`${name} has left the room`));
      }

      const user = activateUser(socket.id, name, room);

      if (prevRoom) {
        io.to(prevRoom).emit(EVENT.USERLIST, {
          users: getUsersInRoom(prevRoom),
        });
      }

      socket.join(user.room);

      resolve({ name: user.name, room: user.room });
    });
  });
}

function notifyRoom(socket, message) {
  const room = getUser(socket.id)?.room;
  if (room) {
    io.to(room).emit(EVENT.NOTIFY, buildMsg(message));
  }
}

function broadcastToRoom(socket, message) {
  const user = getUser(socket.id);
  if (user) {
    socket.broadcast.to(user.room).emit(EVENT.NOTIFY, buildMsg(message));
  }
}

function handleUserDisconnect(socket, user) {
  userLeavesApp(socket.id);

  io.to(user.room).emit(EVENT.NOTIFY, buildMsg(`${user.name} left`));
  io.to(user.room).emit(EVENT.USERLIST, {
    users: getUsersInRoom(user.room),
  });
  io.emit(EVENT.ROOMLIST, {
    rooms: getAllActiveRooms(),
  });
}

// database connection using mongoose
connectDb();

// custom middleware logger
app.use(logger);

// built-in middleware to handle urlencoded form data
app.use(express.urlencoded({ extended: true }));

// built-in middleware for json
app.use(express.json({ limit: '10mb' }));

// routes for boards create
app.use('/api', boardRouter);

// default error handler
app.use(errorHandler);
