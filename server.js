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
const URL = 'https://collabcanvas-client.onrender.com';
const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors({ origin: URL }));

const expressServer = app.listen(PORT, () => {
  console.log(`Server Running on ${PORT}`);
});

const io = new Server(expressServer, { cors: URL });

io.on(EVENT.CONNECTION, handleSocketConnection);

function handleSocketConnection(socket) {
  try {
    setSocketEventListeners(socket);
  } catch (error) {
    console.error('Error in socket connection:', error);
  }
}

function setSocketEventListeners(socket) {
  socket.on(EVENT.DRAW, handleDraw);
  socket.on(EVENT.UNDO, handleUndo);
  socket.on(EVENT.REDO, handleRedo);
  socket.on(EVENT.CLEAR, handleClear);
  socket.on(EVENT.ENTERROOM, handleEnterRoom.bind(null, socket));
  socket.on(EVENT.DISCONNECT, handleDisconnect.bind(null, socket));
  socket.on(EVENT.NOTIFY, handleNotify.bind(null, socket));
}

function handleDraw(data) {
  const room = getUser(this.id)?.room;
  if (room) {
    this.broadcast.to(room).emit(EVENT.DRAW, data);
  }
}

function handleUndo(data) {
  const room = getUser(this.id)?.room;
  if (room) {
    this.broadcast.to(room).emit(EVENT.UNDO, data);
  }
}

function handleRedo(data) {
  const room = getUser(this.id)?.room;
  if (room) {
    this.broadcast.to(room).emit(EVENT.REDO, data);
  }
}

function handleClear() {
  const room = getUser(this.id)?.room;
  if (room) {
    this.broadcast.to(room).emit(EVENT.CLEAR);
  }
}

function handleEnterRoom(socket, { name, room }) {
  enterRoom(socket, name, room).then(({ name, room }) => {
    broadcastToRoom(socket, `${name} has joined`);

    io.to(room).emit(EVENT.USERLIST, {
      users: getUsersInRoom(room),
    });

    io.emit(EVENT.ROOMLIST, {
      rooms: getAllActiveRooms(),
    });
  });
}

function enterRoom(socket, name, room) {
  return new Promise((resolve) => {
    const prevRoom = getUser(socket.id)?.room;


    const user = activateUser(socket.id, name, room);

    if (prevRoom) {
      io.to(prevRoom).emit(EVENT.USERLIST, {
        users: getUsersInRoom(prevRoom),
      });
    }

    socket.join(user.room);

    resolve({ name: user.name, room: user.room });
  });
}

function handleDisconnect(socket) {
  const user = getUser(socket.id);
  if (user) {
    handleUserDisconnect(socket, user);
  }
}

function handleNotify(socket, { text }) {
  const room = getUser(socket.id)?.room;
  if (room) {
    io.to(room).emit(EVENT.NOTIFY, buildMsg(text));
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

connectDb();
app.use(logger);
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/api', boardRouter);
app.use(errorHandler);
