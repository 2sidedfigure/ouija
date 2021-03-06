#!/usr/bin/env phantomjs

var page = require('webpage').create(),
    system = require('system'),
    fs = require('fs'),
    setCookie = require('./setcookie'),
    logger = require('./logger').setMethod(system.stderr.writeLine),
    log = logger(),
    url = require('./url'),

    customHeaders,
    abortAllRequests,

    GET_UNMODIFIED = false,
    FOLLOW_HTTP_REDIRECT = false,
    WAIT = 0,

    getErrorHandler = function(cb) {
        // effectively the same one in the API documentation
        return function(msg, trace) {
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

            if (cb) return cb(msg, trace);

            phantom.exit(1);
        };
    },

    blacklist = {
        set: function(str) {
            // try to parse the string as JSON and assign the
            // blacklist key to the hosts array
            try {
                this.hosts = JSON.parse(str).blacklist;

                log('DEBUG', 'Blacklist loaded with ' + this.hosts.length +
                                ' host' + (this.hosts.length == 1 ? '' : 's'));
            } catch (ex) {
                log('WARN', 'Unable to parse the blacklist: ' + ex);
            }
        },
        has: function(host) {
            if (!this.hosts || !this.hosts.length)
                return false;

            return this.hosts.some(function(h) {
                var re = new RegExp(h.replace(/([\-\.])/g, '\\$1') + '$', 'i');

                return re.test(host);
            });
        }
    },

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

            var key = this.getHeader(name).name || name;

            this.headers[key] = value;

            this.checkReady();
        },
        getHeader: function(name) {
            for (var h in this.headers) {
                if (name.toLowerCase() == h.toLowerCase())
                    return {
                        name: h,
                        value: this.headers[h]
                    };
            }

            return {};
        },
        setBody: function(value) {
            log('DEBUG', 'Setting body content');
            this.body = unescape(encodeURIComponent(value));

            this.checkReady();
        },
        setStatus: function(value) {
            log('DEBUG', 'Setting HTTP status to ' + value);
            this.httpStatus = value;

            this.checkReady();
        },
        setError: function(error) {
            this.errors = this.errors || [];

            this.errors.push(error);
        },
        toString: function() {
            var args = [
                {
                    url: this.url,
                    httpStatus: this.httpStatus,
                    cookies: this.cookies,
                    headers: this.headers,
                    errors: this.errors,
                    body: this.body
                }
            ];

            log.LOG_LEVEL >= logger.DEBUG && args.push(null, 2);

            return JSON.stringify.apply(JSON, args);
        },
        checkReady: function() {
            if (this._sendWhenReady) {
                this.formatForHttpRedirect();

                !this.headers && log('DEBUG', 'Waiting for headers');
                !this.body && log('DEBUG', 'Waiting for body');
                !this.httpStatus && log('DEBUG', 'Waiting for httpStatus');

                if (this.headers && this.body && this.httpStatus)
                    this.forceSend();
            }
        },
        forceSend: function() {
            this.formatForHttpRedirect();

            log('DEBUG', 'Sending output');
            system.stdout.writeLine(this);
            phantom.exit();
        },
        sendWhenReady: function() {
            log('DEBUG', 'Will send when ready');
            this._sendWhenReady = true;

            this.checkReady();
        },
        isHttpRedirect: function() {
            return this.httpStatus >= 300 && this.httpStatus < 400;
        },
        formatForHttpRedirect: function() {
            if (FOLLOW_HTTP_REDIRECT) return;

            var locationHeader;

            if ( this._formattedForHttpRedirect ||
                 !(this.isHttpRedirect()
                   && (locationHeader = this.getHeader('location').value)) )
                return;

            var msg = this.httpStatus + ' HTTP redirect to ' + locationHeader;
            log('DEBUG', msg);

            this.setBody(msg);
            this.setHeader('content-type', 'text/plain');
            // seems safe to just use the string length for the content-length
            // header since the string *should* be simple UTF8 with no
            // multibyte characters
            this.setHeader('content-length', msg.length);

            this._formattedForHttpRedirect = true;
        },
        setRedirectionUrl: function(redirect) {
            var currentUrl = url.parse(this.url),
                redirectUrl = url.parse(redirect);

            for (var p in redirectUrl) {
                redirectUrl[p] && (currentUrl[p] = redirectUrl[p]);
            }

            this.httpStatus = null;
            this.url = url.format(currentUrl);

            log('DEBUG', 'Following HTTP redirect to ' + this.url);
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
            response.url = url.format(url.parse(pair[1]));

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
        case 'b': //blacklisted hosts
            if (fs.exists(pair[1]) && fs.isFile(pair[1])) {
                blacklist.set(fs.read(pair[1]));
            } else {
                log('WARN', "Couldn't find blacklist file " + pair[1]);
            }
            break;
        case 'u': //unmodified content
            GET_UNMODIFIED = true;
            break;
        case 'w': //wait
            WAIT = pair[1] || 0;
            break;
        case 'f': //follow http redirect
            FOLLOW_HTTP_REDIRECT = true;
            break;
    }
});

page.onError = getErrorHandler(function(msg, trace) {
    response.setError({
        message: msg,
        stackTrace: trace
    });
});
phantom.onError = getErrorHandler();

customHeaders && (page.customHeaders = customHeaders);

page.onResourceRequested = function(request, network) {
    log('DEBUG', 'Requesting resource: ' + request.url);

    var isRequestedResource = (request.url == response.url),
        host = url.parse(request.url).host;

    if (blacklist.has(host) || (!isRequestedResource && abortAllRequests)) {
        network.abort();
        log('DEBUG', 'Aborting load of ' + request.url);
    }
};

page.onResourceReceived = function(res) {
    if (abortAllRequests) {
        // prevent the headers and status being set multiple times
        // since this method gets called for each chunk of a particular
        // resource
        return;
    }

    var isLastChunk = res.stage == 'end',
        isRequestedResource = res.url == response.url;

    isLastChunk && log('DEBUG', 'Recieved resource: ' + res.url + ' with HTTP status ' + res.status);

    if (isRequestedResource && isLastChunk) {
        response.setStatus(res.status);

        if (response.isHttpRedirect()) {
            if (FOLLOW_HTTP_REDIRECT) {
                res.headers && res.headers.forEach(function(h) {
                    if (/^location$/i.test(h.name)) {
                        response.setRedirectionUrl(h.value);
                    }
                });
                // prevent the redirection headers from being sent
                return;
            } else {
                abortAllRequests = true;
            }
        }
    }

    isLastChunk && res.headers && res.headers.forEach(function(h) {
        if (/^set\-cookie$/i.test(h.name)) {
            log('DEBUG', 'Attempting to set cookies from HTTP headers...');
            setCookie.parse(h.value).forEach(function(c) {
                response.setCookie(c.name, c);
            });
        } else if (isRequestedResource) {
            // don't return content-encoding header; should already match content-type
            if (!/^content\-encoding$/i.test(h.name))
                response.setHeader(h.name, h.value);
        }
    });
};

page.open(response.url, function(status) {
    if (abortAllRequests) {
        return response.forceSend();
    }

    log('DEBUG', 'Opening ' + response.url);
    log('DEBUG', 'Status: ' + status);

    if (status != 'success') {
        log('ERROR', 'Unable to load ' + response.url);
        phantom.exit(1);
    } else {
        setTimeout(function() {
            log('DEBUG', 'Attempting to set cookies from Javascipt...');
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

                cachedPage.open(response.url, function(status) {
                    if (status != 'success') {
                        log('ERROR', 'Error fetching cached copy of ' + response.url);
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
