# Ouija

Server software for proxying HTTP requests through 
[PhantomJS](http://phantomjs.org). It'll make your automated requests look 
*more* human!

## Requirements

[PhantomJS](http://phantomjs.org) must be 
[installed](http://phantomjs.org/download.html) and available in the `PATH`.

## Usage

Once the server is up and running, simply issue requests to it like you would 
to any other proxy server. This means providing the host when requesting the 
resource, e.g.:

 > GET http://example.com/foo/bar.html

...instead of:

 > GET /foo/bar.html

### Special HTTP Headers

Ouija accepts some special HTTP headers for manipulating the response or 
configuring the resulting request. As usual, the header names are 
case-insensitive.

 - **Ouija-Get-Unmodified-Content**: Normally, if scripts on the page modify 
   the DOM of the requested page, Ouija will return the modified source. 
   Passing this header will ensure you recieve the unmodified source. The value 
   of the header is inconsequential; Ouija only checks for its presence.

 - **Ouija-Pass-***: Any headers prefixed with *Ouija-Pass-* will be used in 
   the resulting request (with *Ouija-Pass-* stripped from the name). E.g., 
   passing:

    > Ouija-Pass-User-Agent: Ouijabot

   ...will result in the following header in the resulting request:

    > User-Agent: Ouijabot

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
