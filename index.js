"use strict";

let vinyl = require('vinyl'),
    PluginError = require('plugin-error'),
    PLUGIN_NAME = 'json-config-transform',
    logEnabled = false;

function NewFile(path, contents) {
    let fs = require('fs');

    if (path.startsWith(".")) {
        path = "." + path;
    }

    fs.writeFile(path, contents, function (err) {
        if (err) {
            throw err;
        }

        Log("File saved at " + path);
    });
}

function TransformProperties(base, target, output) {
    // start with all properties in base
    for (var prop in base) {
        if (target.hasOwnProperty(prop)) {
            // recursively merge nested properties if property is an object excluding arrays
            if (typeof target[prop] !== null
                && typeof base[prop] === "object"
                && typeof target[prop] === "object"
                && toString.call(base[prop]) !== "[object Array]")
            {
                Log("Base Property '" + prop + "': is OBJECT type - recursively merging properties...");
                TransformProperties(base[prop], target[prop], output[prop]);
            } else {
                // set the output property to the new target property (includes arrays overwriting arrays)
                Log("Base Property '" + prop + "': output VALUE SET to " + target[prop]);
                output[prop] = target[prop];
            }
        } else {
            Log("Base Property '" + prop + "' not found on target.");
        }
    }

    // see if any new properties exist on the target and add to the output if not present
    for (var prop in target) {
        if (!output.hasOwnProperty(prop)) {
            Log("Target Property '" + prop + "': output VALUE SET to + " + target[prop]);
            output[prop] = target[prop];
        } else {
            Log("Target Property '" + prop + "': already exists on output.");
        }
    }
}

function Log(message) {
    if (logEnabled) {
        console.log(message);
    }
}

function ToBool(value) {
    if (value === undefined) {
        return false;
    } else if (typeof value === 'boolean') {
        return value;
    } else if (typeof value === 'number' ) {
        value = value.toString();
    } else if (typeof value !== 'string') {
        return false;
    }

    switch (value.toLowerCase()) {
        case "true":
        case "yes":
        case "1":
        case "y":
            return true;
        default:
            return false;
    }
}

function Settings(options) {
    if (!options) {
        throw new PluginError(PLUGIN_NAME, "Options object required.");
    }

    if (typeof options === "string") {
        options = {
            Environment: options
        };  
    }

    options = Object.assign({}, {
        environment: "",
        configSource: "./appsettings.json",
        outputPath: "./appsettings.json",
        logEnabled: false,
        indent: false
    }, options);

    this.Environment = options.environment;
    this.ConfigSource = options.configSource;
    this.OutputPath = options.outputPath;
    this.LogEnabled = ToBool(options.logEnabled);
    this.Indent = ToBool(options.indent);

    this.ConfigFileName = _getFileNameFromPath(this.ConfigSource);
    this.ConfigDirectoryPath = _getDirectoryFromFullPath(this.ConfigSource);
    this.EnvironmentConfigSource = this.ConfigDirectoryPath + _getFileNameWithoutExtension(this.ConfigFileName) + "." + this.Environment + ".json";

    function _getFileNameFromPath(path) {
        if (!path) {
            return path;
        }

        return path.split('\\').pop().split('/').pop();
    }

    function _getFileNameWithoutExtension(filename) {
        if (!filename) {
            return filename;
        }

        return filename.replace(/\.[^/.]+$/, "");
    }
    
    function _getDirectoryFromFullPath(path) {
        if (!path) {
            return path;
        }

        return path.substr(0, path.lastIndexOf("/")) + "/";
    }
}

module.exports = function(options) {
    let transformSettings = new Settings(options);

    if (!transformSettings.Environment) {
        throw new PluginError(PLUGIN_NAME, "Transform operation aborted. No environment specified.");
    }

    logEnabled = transformSettings.LogEnabled;

    Log("** Transforming JSON file '" + transformSettings.ConfigFileName + "' for '" + transformSettings.Environment + "' environment. **");

    let baselineConfigSettings = require(transformSettings.ConfigSource),
        newSettings = baselineConfigSettings,
        environmentSettings = require(transformSettings.EnvironmentConfigSource);

    TransformProperties(baselineConfigSettings, environmentSettings, newSettings);

    // convert new object to a JSON string and write it a file in output directory
    return NewFile(transformSettings.OutputPath, JSON.stringify(newSettings, undefined, transformSettings.Indent ? '\t' : 0));
}