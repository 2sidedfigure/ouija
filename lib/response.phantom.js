#!/usr/bin/env phantomjs

var page = require('webpage').create(),
    system = require('system'),
    setCookie = require('./setcookie'),
    logger = require('./logger').setMethod(system.stderr.writeLine),
    log = logger(),

    url,
    customHeaders,

    GET_UNMODIFIED = false,
    WAIT = 0,

    response = {
        setCookie: function(name, data) {
            log('DEBUG', 'Setting cookie ' + name);
            this.cookies = this.cookies || {};

            if (this.cookies[name]) {
                this.cookies[name].value = data.value;
            } else {
                this.cookies[name] = data;
            }

            this.checkReady();
        },
        setHeader: function(name, value) {
            log('DEBUG', 'Setting HTTP header ' + name);
            this.headers = this.headers || {};

            this.headers[name] = value;

            this.checkReady();
        },
        setBody: function(value) {
            log('DEBUG', 'Setting body content');
            this.body = unescape(encodeURIComponent(value));

            this.checkReady();
        },
        setStatus: function(value) {
            log('DEBUG', 'Setting HTTP status');
            this.httpStatus = value;

            this.checkReady();
        },
        toString: function() {
            var args = [
                {
                    url: this.url,
                    httpStatus: this.httpStatus,
                    cookies: this.cookies,
                    headers: this.headers,
                    body: this.body
                }
            ];

            log.LOG_LEVEL >= logger.DEBUG && args.push(null, 2);

            return JSON.stringify.apply(JSON, args);
        },
        checkReady: function() {
            if (this._sendWhenReady
                && this.headers
                && this.body
                && this.httpStatus) {
                log('DEBUG', 'Sending output');
                system.stdout.writeLine(this);
                phantom.exit();
            }
        },
        sendWhenReady: function() {
            log('DEBUG', 'Will send when ready');
            this._sendWhenReady = true;

            this.checkReady();
        }
    };

system.args.forEach(function(arg, i) {
    if (i == 0) return;

    var pair = /^\-\-?(\w)[\w\-]*=?(.*)$/.exec(arg);

    if (!pair) {
        // TODO: display usage
        return;
    }

    pair.shift();

    switch (pair[0]) {
        case 'l': //log level
            var level = parseInt(pair[1], 10);

            if (isNaN(level)) {
                level = logger[pair[1].toUpperCase()];

                if (typeof level != 'number')
                    level = logger.ERROR;
            }

            log = logger(level);

            break;
        case 'a': //address
            // ensure the resource has a trailing slash if necessary
            var urlRE = /^((?:[^:]+)?:?\/\/\/?[^\/]+)(\/.*)*/,
                urlMatch = urlRE.exec(pair[1]);

            if (urlMatch && (!urlMatch[2] || urlMatch[2].length == 0)) {
                pair[1] += '/';
            }

            url = response.url = pair[1];
            break;
        case 'h': //headers
            try {
                var headers = JSON.parse(pair[1]);

                customHeaders = customHeaders || {};

                for (var h in headers) {
                    customHeaders[h] = headers[h];
                }
            } catch (ex) {
                log('ERROR', "Couldn't parse headers: invalid JSON");
                phantom.exit(1);
            }
            break;
        case 'u': //unmodified content
            GET_UNMODIFIED = true
            break;
        case 'w': //wait
            WAIT = pair[1] || 0;
            break;
    }
});

// effectively the same one in the API documentation
phantom.onError = function(msg, trace) {
    var stack = [msg];
    if (trace && trace.length) {
        stack.push("\tStack trace:");
        trace.forEach(function(t) {
            stack.push([
                "\t\t",
                t.file || t.sourceURL,
                ":",
                t.line,
                t.function ? ' (in ' + t.function + ')' : ''
            ].join(''));
        });
    }
    log('ERROR', stack.join("\n"));
    phantom.exit(1);
};

customHeaders && (page.customHeaders = customHeaders);

page.onResourceReceived = function(res) {
    log('DEBUG', 'Recieved resource: ' + res.url);
    var isRequestedResource = (res.url == url);

    isRequestedResource && response.setStatus(res.status);

    res.headers && res.headers.forEach(function(h) {
        if (/^set\-cookie$/i.test(h.name)) {
            setCookie.parse(h.value).forEach(function(c) {
                response.setCookie(c.name, c);
            });
        } else if (isRequestedResource) {
            if (!/^content\-encoding$/i.test(h.name))
                response.setHeader(h.name, h.value);
        }
    });
};

page.open(url, function(status) {
    log('DEBUG', 'Opening ' + url);
    log('DEBUG', 'Status: ' + status);

    if (status != 'success') {
        log('ERROR', 'Unable to load ' + url);
        phantom.exit(1);
    } else {
        setTimeout(function() {
            page.cookies.forEach(function(c) {
                response.setCookie(c.name, c);
            });

            if (GET_UNMODIFIED) {
                log('DEBUG', 'Requesting unmodified version');

                var cachedPage = require('webpage').create();

                cachedPage.customHeaders = customHeaders;
                cachedPage.settings = {
                    javascriptEnabled: false,
                    loadImages: false
                };

                cachedPage.open(url, function(status) {
                    if (status != 'success') {
                        log('ERROR', 'Error fetching cached copy of ' + url);
                        phantom.exit(1);
                    } else {
                        response.setBody(cachedPage.content);
                        response.sendWhenReady();
                    }
                });

            } else {
                response.setBody(page.content);
                response.sendWhenReady();
            }
        }, WAIT);
    }
});
