const db = require("../database");

function getAll() {
  return db.prepare("SELECT id, name FROM staff").all();
}

function getById(id) {
  return db.prepare("SELECT id, name FROM staff WHERE id = ?").get(id);
}

module.exports = { getAll, getById };
