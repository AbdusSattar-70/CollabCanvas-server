/* eslint-disable consistent-return */

const {Worker} = require('node:worker_threads');
const Board = require('../models/Board.model');
const http2 = require('http2');
const path = require('node:path');
const { generateBoardName } = require('../utils/commonMethod');
const { default: mongoose } = require('mongoose');
const { HTTP_STATUS_OK, HTTP_STATUS_BAD_REQUEST, HTTP_STATUS_NOT_FOUND } = http2.constants;

const worker = new Worker(path.resolve(__dirname, 'decompress.js'));

const updateBoard = async (req, res) => {
  try {
    const { boardId, lines, url } = req.body;
    const _id = new mongoose.Types.ObjectId(boardId);

    const postMessageAsync = (lines) => {
      return new Promise((resolve, reject) => {
        worker.once('message', (message) => resolve(message));
        worker.once('error', reject);
        worker.postMessage(lines);
      });
    };

    const { restored } = await postMessageAsync(lines);
    const query = Board.findOneAndUpdate(
      { _id },
      {
        $set: { lines: restored, url },
      },
    );

    const updatedBoard = await query.exec();

    if (!updatedBoard) {
      return res.status(HTTP_STATUS_NOT_FOUND).json({ message: 'Board not found' });
    }

    res.status(HTTP_STATUS_OK).json({ message: 'Board data update success', board: updatedBoard });
  } catch (error) {
    console.error('Error saving drawing data:', error);
    res.status(HTTP_STATUS_BAD_REQUEST).json({ message: 'Internal server error' });
  }
};


const getBoards = async (req, res, next) => {
  try {
    const foundBoards = await Board.find().select('_id boardName userName url');

    if (!foundBoards.length) {
      return res.status(HTTP_STATUS_NOT_FOUND).json({ error: 'No boards found' });
    }

    return res.status(HTTP_STATUS_OK).json(foundBoards);
  } catch (err) {
    next(err);
  }
};


const createBoard = async (req, res, next) => {
  try {
    const { userName } = req.body;
    if (!userName) {
      return res.status(HTTP_STATUS_BAD_REQUEST).json({ error: 'Invalid input data' });
    }
    // Create a unique board name from username
    const boardName = generateBoardName(userName);
    // Perform board creation
    const board = await createNewBoard({ userName, boardName });
    // Send success response with only the _id field
    return res.status(HTTP_STATUS_CREATED).json({ message: 'Board created successfully', boardId: board._id });
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






module.exports = {
  getBoards,
  createBoard,
  getDrawing,
  updateBoard
};


