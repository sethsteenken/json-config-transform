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
    // start with all properties in base that match in target
    // these will be direct matches and result in target value replacing base value
    for (var prop in base) {
        if (!target.hasOwnProperty(prop)) {
            continue;
        }

        // recursively merge nested properties if property is an object excluding arrays
        if (typeof target[prop] !== null
            && typeof base[prop] === "object"
            && typeof target[prop] === "object"
            && toString.call(base[prop]) !== "[object Array]")
        {
            TransformProperties(base[prop], target[prop], output[prop]);
        } else {
            // set the output property to the new target property
            Log(prop + " value REPLACED with " + target[prop] + ".");
            output[prop] = target[prop];
        }
    }

    // see if any new properties exist on the target and add to the output if not present
    // this is also where special transform actions take place
    for (var prop in target) {
        if (prop.includes("[transform:remove]")) {
            let originalProp = prop.replace("[transform:remove]", "");

            if (!output.hasOwnProperty(originalProp)) {
                throw new PluginError(PLUGIN_NAME, "Action [transform:remove] failed. Cannot remove property " + originalProp + ". Property does not exist.");
            }
            
            delete output[originalProp];
            Log(originalProp + " REMOVED.");
            continue;
        }

        // append items found in array to array output
        if (prop.includes("[transform:append]")) {
            let originalProp = prop.replace("[transform:append]", "");

            if (!output.hasOwnProperty(originalProp)) {
                throw new PluginError(PLUGIN_NAME, "Action [transform:append] failed. Cannot append array items to property " + originalProp + ". Property does not exist.");
            }

            if (toString.call(target[prop]) !== "[object Array]" || toString.call(output[originalProp]) !== "[object Array]") {
                throw new PluginError(PLUGIN_NAME, "Action [transform:append] invalid. Action only applicable on array properties.");
            }

            for (let i = 0; i < target[prop].length; i++) {
                output[originalProp].push(target[prop][i]);
            }
            
            let newItemsCount = target[prop].length;
            Log(originalProp + " APPENDED " + newItemsCount + " new item" + (newItemsCount === 1 ? "." : "s."));
            continue;
        }

        if (prop.includes("[transform:match:")) {
            let cmd = prop.slice(prop.indexOf("[transform"), prop.length),
                originalProp = prop.replace(cmd, ""),
                matchProp =  cmd.slice(cmd.lastIndexOf(":") + 1, cmd.length).replace("]", "");

            if (!output.hasOwnProperty(originalProp) || toString.call(output[originalProp]) !== "[object Array]") {
                throw new PluginError(PLUGIN_NAME, "Action " + cmd + " failed. Cannot match array items to property " + originalProp + ". Property does not exist.");
            }

            if (toString.call(target[prop]) !== "[object Array]") {
                throw new PluginError(PLUGIN_NAME, "Action " + cmd + " invalid. Action only applicable on array properties.");
            }

            Log(originalProp + " array being MATCHED by property " + matchProp + ".");

            for (let i = 0; i < target[prop].length; i++) {
                let targetItem = target[prop][i];

                if (typeof targetItem !== "object" || !targetItem.hasOwnProperty(matchProp)) {
                    throw new PluginError(PLUGIN_NAME, "Action " + cmd + " invalid. Array items must be an object amd have property " + matchProp + ".");
                }

                for (let o = 0; o < output[originalProp].length; o++) {
                    let outputItem = output[originalProp][o];

                    if (typeof outputItem !== "object" || !outputItem.hasOwnProperty(matchProp)) {
                        throw new PluginError(PLUGIN_NAME, "Action " + cmd + " invalid. Array items must be an object amd have property " + matchProp + ".");
                    }

                    if (outputItem[matchProp].toLowerCase() === targetItem[matchProp].toLowerCase()) {
                        for (var itemProp in targetItem) {
                            outputItem[itemProp] = targetItem[itemProp];
                        }
                    }   
                }
            }
            
            continue;
        }

        if (!output.hasOwnProperty(prop)) {
            Log(prop + " ADDED with value " + target[prop] + ".");
            output[prop] = target[prop];
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