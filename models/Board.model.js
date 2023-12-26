const { default: mongoose } = require("mongoose");

const LineSchema = new mongoose.Schema({
  tool: {
    type: String,
  },
  points: {
    type: [Number],
  },
  color: {
    type: String,
  },
  brushSize: {
    type: Number,
  },
  fillMode: {
    type: String,
  },
  draggable: {
    type: Boolean,
  },
});

const BoardSchema = new mongoose.Schema(
  {
    boardName: {
      type: String,
    },
    userName: {
      type: String,
      required: true,
    },
    lines: [LineSchema],
    url: String,
  },
  {
    timestamps: true,
  }
);

const Board = mongoose.model('Board', BoardSchema);

module.exports = Board;