const fs = require("fs");
const configFilePath = "/home/pi/HomeAutoServer/config.json";

console.log("eey", fs.existsSync(configFilePath));
