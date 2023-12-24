/* eslint-disable consistent-return */
const Board = require('../models/Board.model');
const http2 = require('http2');
const { createNewBoard,generateBoardName } = require('../utils/commonMethod');
const { default: mongoose } = require('mongoose');
const pako = require('pako')
const { HTTP_STATUS_OK, HTTP_STATUS_CREATED, HTTP_STATUS_BAD_REQUEST, HTTP_STATUS_NOT_FOUND } = http2.constants;

const getBoards = async (req, res, next) => {
  try {
    const foundBoard = await Board.find();
    if (!foundBoard.length) return res.status(HTTP_STATUS_NOT_FOUND);

    // Send success response
    return res.status(HTTP_STATUS_OK).json(foundBoard);
  } catch (err) {
    next(err);
  }
};

const createBoard = async (req, res, next) => {
  try {
    const { userName } = req.body;

    // Validate input data
    if (!userName) {
      return res.status(HTTP_STATUS_BAD_REQUEST).json({ error: 'Invalid input data' });
    }

    // Create a unique board name from username
    const boardName = generateBoardName(userName);

    // Perform board creation
    const board = await createNewBoard({ userName, boardName });

    // Send success response
    return res.status(HTTP_STATUS_CREATED).json({ message: 'Board created successfully', board });
  } catch (err) {
    next(err);
  }
};


const getDrawing = async (req, res) => {
  try {
    const {id} = req.params;
    const _id = new mongoose.Types.ObjectId(id);

    const drawingData = await Board.find({ _id });
    res.status(HTTP_STATUS_OK).json(drawingData);
  } catch (error) {
    console.error('Error retrieving drawing data:', error);
    res.status(HTTP_STATUS_BAD_REQUEST).json({ error: 'Internal Server Error' });
  }
};

const updateBoard = async (req, res) => {
  try {
    const { boardId, lines, url } = req.body;
    const restored = JSON.parse(pako.inflate(lines, { to: 'string' }));
    const _id = new mongoose.Types.ObjectId(boardId);

    const data = await Board.findOneAndUpdate(
      { _id },
      {
        $set: { lines: restored, url },
      },
      { new: true }
    );

    res.status(HTTP_STATUS_OK).json({ message: 'board data update success', data });
  } catch (error) {
    console.error('Error saving drawing data:', error);
    res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getBoards,
  createBoard,
  getDrawing,
  updateBoard
};
