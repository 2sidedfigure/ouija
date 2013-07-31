var page = require('webpage').create(),
    system = require('system'),
    setCookie = require('./setcookie'),

    url,
    customHeaders,

    DEBUG = false,
    GET_UNMODIFIED = false,

    response = {
        setCookie: function(name, data) {
            this.cookies = this.cookies || {};

            if (this.cookies[name]) {
                this.cookies[name].value = data.value;
            } else {
                this.cookies[name] = data;
            }

            this.checkReady();
        },
        setHeader: function(name, value) {
            this.headers = this.headers || {};

            this.headers[name] = value;

            this.checkReady();
        },
        setBody: function(value) {
            this.body = value;

            this.checkReady();
        },
        setStatus: function(value) {
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
                && this.cookies
                && this.headers
                && this.body
                && this.httpStatus) {
                console.log(this);
                phantom.exit();
            }
        },
        sendWhenReady: function() {
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
                console.error("Couldn't parse headers: invalid JSON");
                phantom.exit(1);
            }
            break;
        case 'u': //unmodified content
            GET_UNMODIFIED = true
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
            response.setHeader(h.name, h.value);
        }
    });
};

page.open(url, function(status) {
    if (status != 'success') {
        console.log('Unable to load ' + url);
        phantom.exit(1);
    } else {
        page.cookies.forEach(function(c) {
            response.setCookie(c.name, c);
        });

        if (GET_UNMODIFIED) {
            var cachedPage = require('webpage').create();

            cachedPage.customHeaders = customHeaders;
            cachedPage.settings = {
                javascriptEnabled: false,
                loadImages: false
            };

            cachedPage.open(url, function(status) {
                if (status != 'success') {
                    console.log('Error fetching cached copy of ' + url);
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
    }
});
