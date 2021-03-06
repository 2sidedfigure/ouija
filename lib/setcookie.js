"use strict";

// the dude abides [RFC 6265](http://tools.ietf.org/html/rfc6265)

module.exports = {
    parse: function(str) {
        var cookieStrings = str.split(/[\n\r]+/),
            cookies = [];

        cookieStrings.forEach( function(cookieString) {
            var keyValueRE = /^\s*([^=]+)=([^;]+)(?:;\s+(.*))?\s*$/,
                keyValueMatch = keyValueRE.exec(cookieString),
                cookie;

            if (!keyValueMatch || !keyValueMatch[1] || !keyValueMatch[2]) {
                // missing a cookie name and value...
                // ignore this cookie and move on
                return;
            }

            cookie = {
                name: keyValueMatch[1],
                value: keyValueMatch[2]
            };

            if (keyValueMatch[3]) {
                // parse the cookie attribute values
                var attrs = keyValueMatch[3],
                    regexes = {
                        domain: /domain=([^;]+)(?:;\s+)?/i,
                        path: /path=([^;]+)(?:;\s+)?/i,
                        secure: /secure(?:;\s+)?/i,
                        httpOnly: /httponly(?:;\s+)?/i,
                        maxAge: /max-age=(-?\d+)(?:;\s+)?/i,
                        expires: /expires=((?:.+GMT)|(?:.*\d{4}))(?:;\s+)?/i
                    };

                for (var re in regexes) {
                    var match = regexes[re].exec(attrs);

                    if (match) {
                        cookie[re] = match[1] || true;

                        attrs = attrs.replace(match[0], '');
                    }
                }
            }

            cookies.push(cookie);
        } );

        return cookies;
    },
    format: function(obj) {
        var output = [
                obj.name + '=' + obj.value
            ],
            keys = [
                'Domain',
                'Path',
                'Secure',
                'HttpOnly',
                'Max-Age',
                'Expires'
            ];

        keys.forEach(function(key) {
            var objKey = key.replace(/\-/, '').toLowerCase(),
                objValue = obj[objKey];

            if (!objValue) return;

            output.push(objValue === true
                    ? key
                    : key + '=' + objValue
                );
        });

        return output.join('; ');
    }
};
