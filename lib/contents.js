var page = require('webpage').create(),
    system = require('system'),
    url = system.args[1],
    response = {
        url: url
    },
    setData = function(key, value) {
        response[key] = value;

        if (response.headers && response.cookies && response.body) {
            console.log(JSON.stringify(response, null, 2));
            phantom.exit();
        }
    };

page.customHeaders = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_3) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.165 Safari/535.19'
};

page.onResourceReceived = function(res) {
    if (res.url == url) {
        setData('headers', res.headers);
    }
};

page.open(url, function(status) {
    if (status != 'success') {
        console.log('Unable to load ' + url);
        phantom.exit(1);
    } else {
        setData('cookies', page.cookies);
        setData('body', page.content);
    }
});
