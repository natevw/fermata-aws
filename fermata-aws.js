// https://docs.aws.amazon.com/index.html
// https://docs.aws.amazon.com/general/latest/gr/Welcome.html?id=docs_gateway
// https://docs.aws.amazon.com/general/latest/gr/signing_aws_api_requests.html

// TODO: https://docs.aws.amazon.com/general/latest/gr/signature-v4-test-suite.html


var crypto = require('crypto');
function _hash(hash, d, raw) {
    hash.update(d);
    return (raw) ? hash.digest() : hash.digest('hex').toLowerCase();
}
function sha256(d, raw) {
    return _hash(crypto.createHash('sha256'), d, raw);
}
function hmac(key, d, raw) {
    return _hash(crypto.createHmac('sha256', key), d, raw);
}

function amzTimestamp(d) {
    d || (d = new Date());
    return d.toISOString()
        // strip punctuation…
        .replace(/-/g,'')
        .replace(/:/g, '')
        // …and milliseconds
        .replace(/\.\d*Z$/, 'Z');
}

function cmp(a, b) {
    return (a < b) ? -1 : ((a > b) ? 1 : 0);
}

// c.f. fermata._flatten
function flatten(obj) {
    var list = [];
    Object.keys(obj).forEach(function (k) {
        [].concat(obj[k]).forEach(function (v) {
            list.push([k, v]);
        });
    });
    return list;
}

var aws = function (transport, TODO) {
    this.base = TODO;
    transport = transport.using('statusCheck');//.using('autoConvert', "application/json");
    return function (req, callback) {
        aws.signRequest(req);
        transport(req, callback);
    }
};

aws.signRequest = function (req) {
    var algorithm = 'AWS4-HMAC-SHA256',
        timestamp = amzTimestamp(),     // "20150830T123600Z"
        // TODO: determine these!!
        apiKeyId = "AKIDEXAMPLE",
        apiKey = "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
        region = "us-east-1",
        service = "iam",
        host = "iam.amazonaws.com";
    
    req.headers['Host'] = host;
    req.headers['X-Amz-Date'] = timestamp;
    
    var credScope = [timestamp.slice(0,8), region, service, 'aws4_request'],
        [canReqData, signedHeaders] = aws.canonicalRequest(req);
// console.log("---");
// console.log(canReqData);
// console.log("---");
    
    var stringToSign = [
        algorithm,
        timestamp,
        credScope.join('/'),
        sha256(canReqData),
    ].join('\n');
// console.log("--");
// console.log(stringToSign);
// console.log("--");
    
    var signingKey = "AWS4" + apiKey;
    credScope.forEach(function (scopeVal) {
        signingKey = hmac(signingKey, scopeVal, true);
    });
    
    var signature = hmac(signingKey, stringToSign),
        credential = [apiKeyId, ...credScope].join('/'),
        authHeader = `${algorithm} Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
console.log(signature);
    
    // TODO: `X-Amz-Security-Token` handling (see https://docs.aws.amazon.com/general/latest/gr/sigv4-add-signature-to-request.html)
    req.headers['Authorization'] = authHeader;
    console.log(authHeader);
};

aws.credentialScope = function (date, region, service) {
    return [date, region, service, 'aws4_request'].join('/');
};


aws.canonicalRequest = function (req) {
    /* see https://docs.aws.amazon.com/general/latest/gr/sigv4-create-canonical-request.html
    CanonicalRequest =
        HTTPRequestMethod + '\n' +
        CanonicalURI + '\n' +
        CanonicalQueryString + '\n' +
        CanonicalHeaders + '\n' +
        SignedHeaders + '\n' +
        HexEncode(Hash(RequestPayload))   
    */
    
    let canonLines = [];
    canonLines.push(req.method);
    
    // TODO: "Normalize URI paths according to RFC 3986." [presumedly section 6]
    let normalPath = req.path.map(function (c) {
        return (c.join) ? c.join('/') : encodeURIComponent(c);
    }).join('/');
    canonLines.push(normalPath || "/");
    
    var normalParams = flatten(req.query).sort(function (a, b) {
        return cmp(a[0], b[0]) || cmp(a[1], b[1]);
    }).map(function (kv) {
        kv[1] || (kv[1] = '');
        return kv.map(encodeURIComponent).join('=');
    }).join("&");
    canonLines.push(normalParams);
    
    var signedHeaders = [];
    var normalHeaders = Object.keys(req.headers).map(function (k) {
        function normalKey(s) {
            return s.toLowerCase().trim();
        }
        function normalVal(s) {
            return s.toString().replace(/\s+/g, ' ').trim();
        }
        
        var v = req.headers[k];
        return [
            normalKey(k),
            v.split(',').map(normalVal).join(',')
        ];
    }).sort(function (a,b) {
        return cmp(a[0], b[0]);
    }).map(function (kv) {
        signedHeaders.push(kv[0]);
        return kv.join(':');
    });
    Array.prototype.push.apply(canonLines, normalHeaders);
    canonLines.push('');
    
    signedHeaders = signedHeaders.join(';');
    canonLines.push(signedHeaders);
    
    var hashedPayload = sha256(req.data || '');
    canonLines.push(hashedPayload);
    
    return [canonLines.join('\n'), signedHeaders];
}

module.exports = aws;
