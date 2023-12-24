/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */

const Board = require("../models/Board.model");


const createNewBoard = async (Info) => {
  const newBoard = new Board(Info);
  await newBoard.save();
  return newBoard;
};


// Function to generate a unique board name from the username
const generateBoardName = (userName) => {
  const randomNumber = Math.floor(10000 + Math.random() * 90000);
  const boardName = `${userName}_${randomNumber}`;

  return boardName;
};

module.exports = {
  createNewBoard,
  generateBoardName
};
