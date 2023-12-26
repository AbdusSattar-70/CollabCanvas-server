const express = require("express");
const { Server } = require("socket.io");
const cors = require('cors');
require('dotenv').config();
const connectDb = require('./config/connectDb');
const { logger } = require('./middleware/logEvents');
const errorHandler = require('./middleware/errorHandler');
const EVENT = require('./config/constant');
const boardRouter = require("./routes/boardRouter");

const URL = 'http://localhost:5173';
const PORT = process.env.PORT || 3000;
const app = express();
const expressServer = app.listen(PORT, () => console.log(`Server Running on ${PORT}`));
const io = new Server(expressServer, { cors: URL });


app.use(cors({ origin: URL }));
app.use(logger);
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/api', boardRouter);
app.use(errorHandler);
connectDb();

const UsersState = {
    users: [],
    setUsers: function (newUsersArray) {
        this.users = newUsersArray
    }
}

io.on(EVENT.CONNECTION, (socket)=>{
   const room = getUser(socket.id)?.room;
   socket.on(EVENT.DRAW, (data) => {
    if (room) {
      socket.broadcast.to(room).emit(EVENT.DRAW, data);
       socket.broadcast.to(room).emit(EVENT.UNDO, data);
        socket.broadcast.to(room).emit(EVENT.REDO, data);
        socket.broadcast.to(room).emit(EVENT.CLEAR);
    }
  });
    // Upon connection - only to user
    socket.emit('message', buildMsg( "Welcome to Chat App!"))

    socket.on('enterRoom', ({ name, room }) => {

        // leave previous room
        const prevRoom = getUser(socket.id)?.room

        if (prevRoom) {
            socket.leave(prevRoom)
            io.to(prevRoom).emit('message', buildMsg(`${name} has left the room`))
        }

        const user = activateUser(socket.id, name, room)

        // Cannot update previous room users list until after the state update in activate user
        if (prevRoom) {
            io.to(prevRoom).emit('userList', {
                users: getUsersInRoom(prevRoom)
            })
        }

        // join room
        socket.join(user.room)

        // To user who joined
        socket.emit('message', buildMsg(`You have joined the ${user.room} chat room`))

        // To everyone else
        socket.broadcast.to(user.room).emit('message', buildMsg(`${user.name} has joined the room`))

        // Update user list for room
        io.to(user.room).emit('userList', {
            users: getUsersInRoom(user.room)
        })

        // Update rooms list for everyone
        io.emit('roomList', {
            rooms: getAllActiveRooms()
        })
    })

    // When user disconnects - to all others
    socket.on('disconnect', () => {
        const user = getUser(socket.id)
        userLeavesApp(socket.id)

        if (user) {
            io.to(user.room).emit('message', buildMsg(`${user.name} has left the room`))

            io.to(user.room).emit('userList', {
                users: getUsersInRoom(user.room)
            })

            io.emit('roomList', {
                rooms: getAllActiveRooms()
            })
        }

        console.log(`User ${socket.id} disconnected`)
    })

    // Listening for a message event
    socket.on('message', ({ text }) => {
        const room = getUser(socket.id)?.room
        if (room) {
            io.to(room).emit('message', buildMsg(text))
        }
    })

    // Listen for activity
    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room
        if (room) {
            socket.broadcast.to(room).emit('activity', name)
        }
    })
});

function buildMsg(text) {
    return {
        text,

    }
}

// User functions
function activateUser(id, name, room) {
    const user = { id, name, room }
    UsersState.setUsers([
        ...UsersState.users.filter(user => user.id !== id),
        user
    ])
    return user
}

function userLeavesApp(id) {
    UsersState.setUsers(
        UsersState.users.filter(user => user.id !== id)
    )
}

function getUser(id) {
    return UsersState.users.find(user => user.id === id)
}

function getUsersInRoom(room) {
    return UsersState.users.filter(user => user.room === room)
}

function getAllActiveRooms() {
    return Array.from(new Set(UsersState.users.map(user => user.room)))
}


