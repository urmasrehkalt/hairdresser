const express = require("express");
const cors = require("cors");

// Andmebaasi initsialiseerimine (loob tabelid ja seedib andmed)
require("./database");

const routes = require("./routes");

const app = express();
const port = process.env.PORT || 3000;

// Vahevara
app.use(cors());
app.use(express.json());

// Marsruudid
app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", routes);

// Käivitamine
app.listen(port, () => {
  console.log(`Server käivitus pordil ${port}`);
});
