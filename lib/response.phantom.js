#!/usr/bin/env phantomjs

var page = require('webpage').create(),
    system = require('system'),
    setCookie = require('./setcookie'),

    url,
    customHeaders,

    DEBUG = false,
    GET_UNMODIFIED = false,
    WAIT = 0,

    error = function(msg) {
        system.stderr.writeLine('ERROR: ' + msg);
    },
    debug = function(msg) {
        DEBUG && system.stderr.writeLine('=> ' + msg);
    },

    response = {
        setCookie: function(name, data) {
            debug('Setting cookie ' + name);
            this.cookies = this.cookies || {};

            if (this.cookies[name]) {
                this.cookies[name].value = data.value;
            } else {
                this.cookies[name] = data;
            }

            this.checkReady();
        },
        setHeader: function(name, value) {
            debug('Setting HTTP header ' + name);
            this.headers = this.headers || {};

            this.headers[name] = value;

            this.checkReady();
        },
        setBody: function(value) {
            debug('Setting body content');
            this.body = unescape(encodeURIComponent(value));

            this.checkReady();
        },
        setStatus: function(value) {
            debug('Setting HTTP status');
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

            DEBUG && args.push(null, 2);

            return JSON.stringify.apply(JSON, args);
        },
        checkReady: function() {
            if (this._sendWhenReady
                && this.headers
                && this.body
                && this.httpStatus) {
                debug('Sending output');
                system.stdout.writeLine(this);
                phantom.exit();
            }
        },
        sendWhenReady: function() {
            debug('Will send when ready');
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
        case 'd': //debug
            DEBUG = true;
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
                error("Couldn't parse headers: invalid JSON");
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

customHeaders && (page.customHeaders = customHeaders);

page.onResourceReceived = function(res) {
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
    debug('Opening ' + url);
    debug('Status: ' + status);

    if (status != 'success') {
        error('Unable to load ' + url);
        phantom.exit(1);
    } else {
        setTimeout(function() {
            page.cookies.forEach(function(c) {
                response.setCookie(c.name, c);
            });

            if (GET_UNMODIFIED) {
                debug('Requesting unmodified version');

                var cachedPage = require('webpage').create();

                cachedPage.customHeaders = customHeaders;
                cachedPage.settings = {
                    javascriptEnabled: false,
                    loadImages: false
                };

                cachedPage.open(url, function(status) {
                    if (status != 'success') {
                        error('Error fetching cached copy of ' + url);
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
