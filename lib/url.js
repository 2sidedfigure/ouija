"use strict";

// considered using the node url library, but couldn't resolve dependencies
// without serious modifications, leading to maintenance nightmares

module.exports = {
    parse: function(url) {
        // rudimentary URL regex, could use some improvement
        // but should suffice for now. capturing parentheses are:
        //   1: protocol
        //   2: host
        //   3: path
        //   4: query
        var re = /^(?:([^:]+)?:?\/\/\/?)?([^\/]+)(?:(\/[^\?]*)(?:\??(.*))?)?$/,
            match = re.exec(url) || [];

        return {
            protocol: match[1],
            host: match[2],
            path: match[3] || '/',
            query: match[4]
        };
    },
    format: function(obj) {
        // based off the object returned from the parse url
        return [
            obj.protocol
                ? obj.protocol + '://'
                : '//',
            obj.host,
            obj.path,
            obj.query
                ? '?' + obj.query
                : ''
        ].join('');
    }
};
