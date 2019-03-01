"use strict";

let vinyl = require('vinyl'),
    PluginError = require('plugin-error'),
    PLUGIN_NAME = 'json-config-transform';

function NewFile(path, contents) {
    /*
    //uses the node stream object
    var readableStream = require('stream').Readable({ objectMode: true });

    //reads in contents string
    readableStream._read = function () {
        this.push(new vinyl({ cwd: "", base: null, path: name, contents: new Buffer(contents) }));
        this.push(null);
    };
    return readableStream;
    */

    let fs = require('fs');

    //path = path.substr(2, path.length - 2);
    path = "." + path;
    console.log("path", path);
    fs.writeFile(path, contents, function (err) {
        if (err) {
            throw err;
        }

        console.log("file saved!");
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
    console.log(message);
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
        Environment: "",
        ConfigSource: "./appsettings.json",
        OutputPath: "./appsettings.json",
    }, options);

    console.log("Settings - options", options);

    this.Environment = options.Environment;
    this.ConfigSource = options.ConfigSource;
    this.OutputPath = options.OutputPath;

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

    console.log("transformSettings", transformSettings);

    if (!transformSettings.Environment) {
        throw new PluginError(PLUGIN_NAME, "Transform operation aborted. No environment specified.");
    }

    Log("** Transforming JSON file '" + transformSettings.ConfigFileName + "' for '" + transformSettings.Environment + "' environment. **");

    let baselineConfigSettings = require(transformSettings.ConfigSource),
        newSettings = baselineConfigSettings,
        environmentSettings = require(transformSettings.EnvironmentConfigSource);

    TransformProperties(baselineConfigSettings, environmentSettings, newSettings);

    //convert new object to a JSON string and write it a file in output directory
    // TODO - stringify create output with indents?
    return NewFile(transformSettings.OutputPath, JSON.stringify(newSettings, null, 2));
}