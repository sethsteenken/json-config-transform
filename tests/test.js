var transformer = require("../index.js");

transformer({
    environment: "Production",
    configSource: "./appsettings.json",
    outputPath: "./appsettings_output.json",
    logEnabled: true,
    indent: true
});

