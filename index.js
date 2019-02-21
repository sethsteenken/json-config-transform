"use strict";

let vinyl = require('vinyl'),
    PluginError = require('plugin-error'),
    PLUGIN_NAME = 'json-config-transform';

function Argument(args, key, defaultValue) {
    var self = this;

    function _getArgumentValue(args, key) {
        var option,
            index = args.indexOf(key);

        if (index > -1 && args.length > (index + 1)) {
            return args[index + 1];
        }

        return undefined;
    }

    self.Value = defaultValue;
    self.Argument = _getArgumentValue(args, key);

    if (self.Argument !== undefined)
        self.Value = self.Argument;
}

function NewFile(name, contents) {
    //uses the node stream object
    var readableStream = require('stream').Readable({ objectMode: true });

    //reads in contents string
    readableStream._read = function () {
        this.push(new vinyl({ cwd: "", base: null, path: name, contents: new Buffer(contents) }));
        this.push(null);
    };
    return readableStream;
}

function MergeProperties(base, target, output) {
    // start with all properties in base
    for (var prop in base) {
        if (target.hasOwnProperty(prop)) {
            // recursively merge nested properties if property is an object excluding arrays
            if (typeof target[prop] !== null
                && typeof base[prop] === "object"
                && typeof target[prop] === "object"
                && toString.call(base[prop]) !== "[object Array]")
            {
                console.log("Base Property '" + prop + "': is OBJECT type - recursively merging properties...");
                MergeProperties(base[prop], target[prop], output[prop]);
            } else {
                // set the output property to the new target property (includes arrays overwriting arrays)
                console.log("Base Property '" + prop + "': output VALUE SET to " + target[prop]);
                output[prop] = target[prop];
            }
        } else {
            console.log("Base Property '" + prop + "' not found on target.");
        }
    }

    // see if any new properties exist on the target and add to the output if not present
    for (var prop in target) {
        if (!output.hasOwnProperty(prop)) {
            console.log("Target Property '" + prop + "': output VALUE SET to + " + target[prop]);
            output[prop] = target[prop];
        } else {
            console.log("Target Property '" + prop + "': already exists on output.");
        }
    }
}

function FormatConfigFileName(filename) {

}

module.exports = function(options) {
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
        ConfigDirectory: "./",
        ConfigSourceFileName: "appsettings.json",
        OutputPath: "./appsettings.json",
    }, options)

    /*
    let environment = new Argument(process.argv, "--environment"),
        baseDirectory = new Argument(process.argv, "--basedir", "./"),
        filename = new Argument(process.argv, "--basefilename", "appsettings"),
        outputDirectory = new Argument(process.argv, "--outputdir", "./"),
        outputFileName = new Argument(process.argv, "--outputfilename", "appsettings");
        */
/*
    if (options.Environment) {
        console.log("** Transforming JSON file '" + options.ConfigSourceFileName + "' for '" + options.Environment + "' environment. **");

        var settingsBase = require(baseDirectory.Value + filename.Value + ".json"),
            newSettings = settingsBase,
            environmentSettings = require(baseDirectory.Value + filename.Value + '.' + environment.Value + '.json');

        MergeProperties(settingsBase, environmentSettings, newSettings);

        //convert new object to a JSON string and write it a file in output directory
        return NewFile(outputFileName.Value + ".json", JSON.stringify(newSettings, null, 2))
            .pipe(gulp.dest(outputDirectory.Value));
    } else {
        console.error("Transform operation aborted. No environment specified.");
    }
    */
}