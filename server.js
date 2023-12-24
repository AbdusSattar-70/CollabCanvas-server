const express = require("express");
const { Server } = require("socket.io");
const cors = require('cors');
require('dotenv').config();
const connectDb = require('./config/connectDb');
const { logger } = require('./middleware/logEvents');
const errorHandler = require('./middleware/errorHandler');
const EVENT = require('./config/constant')
const {
  buildMsg,
  activateUser,
  userLeavesApp,
  getUser,
  getUsersInRoom,
  getAllActiveRooms} = require('./utils/socketUser')
const boardRouter = require("./routes/boardRouter");
const URL = 'http://localhost:5173'
const PORT = process.env.PORT || 3000
const app = express();

app.use(cors({origin: URL}))

const expressServer = app.listen(PORT,()=>{
  console.log(`Server Running on ${PORT}`)
});

const io = new Server(expressServer, { cors: URL });

io.on(EVENT.CONNECTION, async (socket) => {
  try {
    socket.on(EVENT.DRAW, async (data) => {
      const room = getUser(socket.id)?.room;
      if (room) {
        socket.broadcast.to(room).emit(EVENT.DRAW, data);
      }
    });

    socket.on(EVENT.UNDO, async (data) => {
      const room = getUser(socket.id)?.room;
      if (room) {
        socket.broadcast.to(room).emit(EVENT.UNDO, data);
      }
    });

    socket.on(EVENT.REDO, async (data) => {
      const room = getUser(socket.id)?.room;
      if (room) {
        socket.broadcast.to(room).emit(EVENT.REDO, data);
      }
    });

    socket.on(EVENT.CLEAR, async () => {
      const room = getUser(socket.id)?.room;
      if (room) {
        socket.broadcast.to(room).emit(EVENT.CLEAR);
      }
    });

    await handleEnterRoom(socket);

    socket.on(EVENT.DISCONNECT, async () => {
      const user = getUser(socket.id);
      if (user) {
        await handleUserDisconnect(socket, user);
      }
    });

    socket.on(EVENT.NOTIFY, async ({ text }) => {
      const room = getUser(socket.id)?.room;
      if (room) {
        io.to(room).emit(EVENT.NOTIFY, buildMsg(text));
      }
    });
  } catch (error) {
    console.error('Error in socket connection:', error);
  }
});

async function handleEnterRoom(socket) {
  const { name, room } = await enterRoom(socket);

  notifyRoom(socket, `Welcome ${name} to the ${room} Board`);
  broadcastToRoom(socket, `${name} has joined`);

  io.to(room).emit(EVENT.USERLIST, {
    users: getUsersInRoom(room),
  });

  io.emit(EVENT.ROOMLIST, {
    rooms: getAllActiveRooms(),
  });
}

async function enterRoom(socket) {
  return new Promise((resolve) => {
    socket.on(EVENT.ENTERROOM, async ({ name, room }) => {
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


async function handleUserDisconnect(socket, user) {
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

