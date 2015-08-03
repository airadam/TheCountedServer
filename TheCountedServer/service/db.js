var databaseURI = "localhost:27017/thecounted"; // MongoDB default for local installations without credentials
var db = require("mongojs").connect(databaseURI, []);

module.exports = db;


