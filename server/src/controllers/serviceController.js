const serviceModel = require("../models/serviceModel");

function list(req, res) {
  res.json(serviceModel.getAll());
}

module.exports = { list };
