"use strict";

var

exec = require('child_process').exec,
url = require('url'),
path = require('path'),
mkdirp = require('mkdirp').sync,

DEFAULT_LOCAL_STORAGE_PATH = './.ouija/localstorage',
LOCAL_STORAGE_PATH,

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

    this.returnUnmodifiedContent = !!opts.returnUnmodifiedContent;
    this.followHttpRedirect = !!opts.followHttpRedirect;
    this.logLevel = opts.logLevel || 'ERROR';
    this.localStorageId = opts.localStorageId;

    this.setPhantomParameter('local-storage-path', this._getLocalStoragePath());

    if (opts.phantomParameters) {
        for (var p in opts.phantomParameters) {
            this.setPhantomParameter(p, opts.phantomParameters[p]);
        }
    }

    if (opts.customHeaders) {
        for (var h in opts.customHeaders) {
            this.setCustomHeader(h, opts.customHeaders[h]);
        }
    }

    this.wait = opts.wait;
    this.blacklist = opts.blacklist;
    this.timeout = opts.timeout || (60 * 1000); // one minute
    this.maxBuffer = opts.maxBuffer || (2000 * 1024); // 2 Mb

    this.processCallback = cb;
};

Response.localStoragePath = function(value) {
    if (value) {
        LOCAL_STORAGE_PATH = value;
    } else {
        // sorry windows: submit a patch
        var homeDir = process.env.HOME;

        return LOCAL_STORAGE_PATH
            ? LOCAL_STORAGE_PATH
            : path.join(homeDir, DEFAULT_LOCAL_STORAGE_PATH);
    }
};

Response.prototype.setPhantomParameter = function(key, value) {
    this.phantomParameters[key] = value;

    return this;
};

Response.prototype.setLocalStorageId = function(value) {
    this.localStorageId = value;

    return this;
};

Response.prototype._getLocalStoragePath = function() {
    return path.join(Response.localStoragePath(), this.localStorageId || '');
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
        'wait': this.wait,
        'log-level': this.logLevel,
        'blacklist': this.blacklist,
        'follow-http-redirect': this.followHttpRedirect
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

    mkdirp(this.phantomParameters['local-storage-path'], '0600');

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
