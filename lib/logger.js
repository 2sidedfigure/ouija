"use strict";

var logger = function(displayLevel) {

    displayLevel = logger.validErrorValue(displayLevel);

    var log = function(level, msg) {
        switch (arguments.length) {
            case 0:
                return;
            case 1:
                msg = level;
                level = log.DEBUG;
                break;
        }

        level = logger.validErrorValue(level, logger.DEBUG);

        if (level < logger.ERROR) level = logger.ERROR;

        if (displayLevel >= level) {
            logger._logMethod[level](logger._levelPrefix[level] + msg);
        }
    };

    log.LOG_LEVEL = displayLevel;

    return log;
};

logger.SILENT = 0;
logger.ERROR = 1;
logger.WARN = 2;
logger.DEBUG = 3;

logger._levelPrefix = [
    null,
    'ERROR => ',
    'WARNING => ',
    'DEBUG => '
];

logger._logMethod = [
    function() {},
    console.error,
    console.warn,
    console.log
];

logger.setMethod = function(level, method) {
    if (arguments.length == 1) {
        method = level;
        level = '*';
    }

    if (level == '*') {
        this._logMethod = this._logMethod.map(function() {
            return method;
        });
    } else {
        level = this.validErrorValue(level);

        this._logMethod[level] = method;
    }

    return this;
};

logger.validErrorValue = function(value, defaultValue) {
    value = value || this.ERROR; // default to ERROR

    if (typeof value != 'number') {
        value = this[value.toString().toUpperCase()];

        if (typeof value != 'number')
            value = defaultValue || this.ERROR; // default to ERROR
    }

    var max = this._levelPrefix.length - 1;

    if (value < 0) return 0;
    if (value > max) return max;

    return value;
};


module.exports = logger;
