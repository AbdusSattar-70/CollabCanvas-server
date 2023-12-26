const express = require('express');

const boardRouter = express.Router();

const { getBoards, createBoard, getDrawing, updateBoard} = require('../controllers/boardController');

// get all board
boardRouter.get('/boards', getBoards);

boardRouter.get('/boards/:id', getDrawing);

// create new board
boardRouter.post('/create-board', createBoard);

// update board
boardRouter.patch('/update-board', updateBoard);



module.exports = boardRouter;
