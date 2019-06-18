# fermata-aws

This is a [Fermata](https://github.com/natevw/fermata) plugin to support connecting to Amazon Web Services APIs.


## Setup

In-browser usage of this plugin is not supported, as it relies on AWS credentials you should keep secret.

Under node.js will need to `npm install fermata fermata-aws`. Then in your code, you will need to register this plugin manually:

    var fermata = require('fermata'),
        aws = require('fermata-aws);
    fermata.registerPlugin('aws', aws);   // you could pick a different name if you'd like
    
    var api = fermata.aws();
    // …

## Example usage

TODO
    
## Plugin API

The following documentation assumes this plugin has been registered with the name `'aws'` (as by default in the browser, or if you follow the node.js example above).

- `fermata.aws([serverUrl])` — TODO


## License (MIT)

Copyright © 2019 Nathan Vander Wilt.

Released under the terms of the MIT License:

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
