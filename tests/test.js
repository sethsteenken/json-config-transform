var transformer = require("../index.js");

transformer({
    environment: "Production",
    configSource: "./tests/appsettings.json",
    outputPath: "appsettings_output.json",
    logEnabled: true
});