# Ouija

Server software for proxying HTTP requests through
[PhantomJS](http://phantomjs.org). It'll make your automated requests look
*more* human!

## Requirements

[PhantomJS](http://phantomjs.org) must be
[installed](http://phantomjs.org/download.html) and available in the `PATH`.

## Installation

```
$ npm install ouija
```

## Usage

Start the server by running:

```
$ ./ouija
```

...which defaults to port 6660. You can specify a port to bind to at startup by
using the `-p, --port` option:

```
$ ./ouija -p 8080
```

...and optionally specify a logging level using `-l, --log-level` (one of
SILENT, ERROR, WARN, DEBUG; defaults to ERROR):


```
$ ./ouija -l DEBUG
```

Assets from specific hosts can be prevented from loading by supplying a blacklist file via the `-b, --blacklist` option:

```
$ ./ouija -b /tmp/blacklist.json
```

where */tmp/blacklist.json* looks like:

```
{
    "blacklist": [
        "example.com",
        "bar.com"
    ]
}
```

Given the above sample file, assets from the following hosts will be blocked:

 - example.com
 - *.example.com
 - bar.com
 - *.bar.com

Once the server is up and running, simply issue requests to it like you would
to any other proxy server. This means providing the host when requesting the
resource, e.g.:

 > GET http://example.com/foo/bar.html

...instead of:

 > GET /foo/bar.html

### Special HTTP Headers

#### Request Headers

Ouija accepts some special HTTP headers for manipulating the response or
configuring the resulting request. As usual, the header names are
case-insensitive.

 - **Ouija-Get-Unmodified-Content**: Normally, if scripts on the page modify
   the DOM of the requested page, Ouija will return the modified source.
   Passing this header will ensure you recieve the unmodified source. The value
   of the header is inconsequential; Ouija only checks for its presence.

 - **Ouija-Follow-HTTP-Redirect**: Normally, Ouija will return the HTTP
   redirect response and not the resource specified by the redirect. By passing
   this header, Ouija will follow the HTTP redirect and return the response
   received by requesting the resource referenced by the redirect.

 - **Ouija-Proxy**: Specify a proxy server to use (e.g. 10.10.10.10:8080).

 - **Ouija-Proxy-Type**: Set the type of proxy server (one of http, socks5 or
   none; defaults to http).

 - **Ouija-Proxy-Auth**: Authentication information for the proxy server
   (e.g. username:password).

 - **Ouija-Wait**: Delay the capture of the URL contents by the provided number
   of milliseconds (e.g. 2000).

 - **Ouija-Pass-***: Any headers prefixed with *Ouija-Pass-* will be used in
   the resulting request (with *Ouija-Pass-* stripped from the name). E.g.,
   passing:

    > Ouija-Pass-User-Agent: Ouijabot

   ...will result in the following header in the resulting request:

    > User-Agent: Ouijabot

#### Response Headers

If the requested page has any JavaScript errors, the error message will be
returned as the value of the **Ouija-JS-Error** header.

## Author

± ryan (ryan@2-si.de).

## License

Copyright (c) 2013 Ryan Ettipio

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
