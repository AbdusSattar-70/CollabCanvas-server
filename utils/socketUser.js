// users state
const UsersState = {
    users: [],
    setUsers: function (newUsersArray) {
        this.users = newUsersArray
    }
}

const buildMsg = ( text) => {
    return { text }
}

const activateUser= (id, name, room) =>{
    const user = { id, name, room }
    UsersState.setUsers([
        ...UsersState.users.filter(user => user.id !== id),
        user
    ])
    return user
}

const userLeavesApp=(id) =>{
    UsersState.setUsers(
        UsersState.users.filter(user => user.id !== id)
    )
}

const getUser=(socketId) =>{
    return UsersState.users.find(user => user.id === socketId)
}

const getUsersInRoom=(room) =>{
    return UsersState.users.filter(user => user.room === room)
}

const getAllActiveRooms=() =>{
    return Array.from(new Set(UsersState.users.map(user => user.room)))
}

module.exports = {
  buildMsg,
  activateUser,
  userLeavesApp,
  getUser,
  getUsersInRoom,
  getAllActiveRooms,
}
