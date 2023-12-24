const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema(
  {
    boardName: {
      type: String,
    },

    userName: {
      type: String,
      required: true,
    },

    lines: [
      { tool: String,
        points: [Number],
        color: String,
        brushSize: Number
      }
    ],
    url: String

  },

   {
    timestamps: true
  }
);

const Board = mongoose.model('Board', boardSchema);

module.exports = Board;
