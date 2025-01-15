const express = require("express");
const nocache = require("nocache");
const morgan = require("morgan");
const { connect } = require("./db/dbConnection.js");
const { routers } = require("./routers/routers");

const app = express();

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(nocache());
connect()
  .then((connection) => {
    console.log("Connected to the database.");
  })
  .catch((error) => {
    console.log("Database connection failed!");
    console.log(error);
  });

  
app.use("/", routers);

app.listen(3000, () => {
  console.log("App started running at port 3000");
});
  