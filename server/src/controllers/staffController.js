const staffModel = require("../models/staffModel");

function list(req, res) {
  res.json(staffModel.getAll());
}

module.exports = { list };
