"use strict";

var

exec = require('child_process').exec,
url = require('url'),
path = require('path'),

parameterizeObject = function(obj, stringifyBooleans) {
    var arr = [];

    for (var p in obj) {
        var param = '--' + p,
            value = obj[p];

        if (!value) continue;

        if (stringifyBooleans || value !== true) {
            param += '=' + value;
        }

        arr.push(param);
    }

    return arr.length
        ? arr.join(' ')
        : '';
},

Response = function(address, opts, cb) {
    // normalize the address
    this.address = url.format(url.parse(address));

    // absolute path to the phantom response script
    this.scriptPath = path.join(path.dirname(module.filename), 'response.phantom.js');

    // default phantom parameters
    this.phantomParameters = {
        'disk-cache': true,
        'ignore-ssl-errors': true,
        'max-disk-cache-size': 10*1024 // 10 Mb
    };

    opts = opts || {};

    if (opts.phantomParameters) {
        for (var p in opts.phantomParameters) {
            this.setPhantomParameter(p, opts.phantomParameters[p]);
        }
    }

    this.returnUnmodifiedContent = !!opts.returnUnmodifiedContent;
    this.debug = !!opts.debug;

    if (opts.customHeaders) {
        for (var h in opts.customHeaders) {
            this.setCustomHeader(h, opts.customHeaders[h]);
        }
    }

    this.timeout = opts.timeout || (60 * 1000); // one minute
    this.maxBuffer = opts.maxBuffer || (2000 * 1024); // 2 Mb

    this.processCallback = cb;
};

Response.prototype.setPhantomParameter = function(key, value) {
    this.phantomParameters[key] = value;

    return this;
};

Response.prototype.setCustomHeader = function(key, value) {
    this.customHeaders = this.customHeaders || {};

    this.customHeaders[key] = value;

    return this;
};

Response.prototype.getCommandString = function() {
    var scriptArgs = {
        'address': this.address,
        'unmodified-content': this.returnUnmodifiedContent,
        'headers': this.customHeaders && ("'" + JSON.stringify(this.customHeaders) + "'"),
        'debug': this.debug
    };

    return [
            'phantomjs',
            parameterizeObject(this.phantomParameters, true),
            this.scriptPath,
            parameterizeObject(scriptArgs),
        ].join(' ');
};

Response.prototype.fetch = function(cb) {
    var useCB = cb || this.processCallback;

    if (!useCB) {
        // TODO: should throw an error
        return;
    }

    exec(
        this.getCommandString(),
        {
            timeout: this.timeout,
            maxBuffer: this.maxBuffer
        },
        function(err, stdout, stderr) {
            if (err && err.code !== 0) {
                return useCB({ 
                    status: 500,
                    message: stderr
                });
            }

            var response;

            try {
                response = JSON.parse(stdout);
            } catch (ex) {
                console.log(ex);
                return useCB({
                    status: 500,
                    message: 'Unable to parse response'
                });
            }

            return useCB(null, response, stderr);
        }
    );

    return this;
};

module.exports = {
    create: function(address, opts, cb) {
        return new Response(address, opts, cb);
    }
};
