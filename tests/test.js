var transformer = require("../index.js");

transformer({
    Environment: "Production",
    ConfigSource: "./tests/appsettings.json",
    OutputPath: "./tests/appsettings_output.json",   
});