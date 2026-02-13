const db = require("../database");

function getAll() {
  return db.prepare("SELECT id, name, duration_minutes FROM services").all();
}

function getById(id) {
  return db
    .prepare("SELECT id, name, duration_minutes FROM services WHERE id = ?")
    .get(id);
}

module.exports = { getAll, getById };
