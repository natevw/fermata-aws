"use strict";

const suiteDir = "aws-sig-v4-test-suite";

let fs = require('fs'),
    path = require('path'),
    plugin = require(".");

function parseRequest(reqData) {
   let reqLines = reqData.split('\n'),
      [method, ..._reqPath] = reqLines[0].split(' '),
      _vers = _reqPath.pop(),
      reqPath = _reqPath.join(' '),
      bodyIdx = reqLines.indexOf(''),
      headerLines = (~bodyIdx) ? reqLines.slice(1, bodyIdx) : reqLines.slice(1),
      data = (~bodyIdx) ? reqLines.slice(bodyIdx+1).join('\n') : null;
  
  function extractPath(pathname) {
    let path = [''];
    pathname.split('/').map(decodeURIComponent).forEach(function (part) {
      if (part === '.') return;
      else if (part === '..') path.pop();
      else if (part || path[path.length-1]) path.push(part);
    });
    return path;
  }
  
  function extractQuery(params) {
    let query = {};
    for (let key of params.keys()) {
      var vals = params.getAll(key);
      query[key] = (vals.length === 1) ? vals[0] : vals;
    }
    return query;
  }
  
  function extractHeaders(lines) {
    let headers = {},
        prevKey = null;
    lines.forEach(function (line) {
      let [key, val] = line.split(':');
      if (typeof val !== 'string') {
        val = key;
        key = prevKey;
      } else {
        key = key.split('-').map(function (w) {
          return w && w[0].toUpperCase() + w.slice(1).toLowerCase();
        }).join('-');
      }
      
      if (key in headers) {
        headers[key] += ',' + val;
      } else {
        headers[key] = val;
      }
      prevKey = key;
    });
    
    return headers;
  } 
  
  
  let url = new URL(reqPath, "scheme:/host"),
      [pathname, _search] = reqPath.split('?'),
      path = extractPath(pathname),
      query = extractQuery(url.searchParams),
      headers = extractHeaders(headerLines);
  
  return {
    method, path, query, headers, data
  };
}

function testAgainstData(suiteDir, subdir) {
  let basePath = path.join(suiteDir, subdir, subdir);
  
  let reqData = fs.readFileSync(`${basePath}.req`, 'utf8'),
      request = parseRequest(reqData);
  //console.log(subdir, request);
  
  function checkResult(label, our, tgt) {
    if (our !== tgt) {
      console.warn(subdir, "FAIL", label);
      console.info(`tgt:\n${tgt}\n`);
      console.info(`our:\n${our}\n`);
      console.info(subdir, request);
      throw Error(`${label} does not match!`);
    } else {
      console.log(subdir, "ok:", label);
    }
  }
  
  let ourCreq = plugin.canonicalRequest(request)[0],
      tgtCreq = fs.readFileSync(`${basePath}.creq`, 'utf8');
  checkResult("Canonical request", ourCreq, tgtCreq);
  
  if (
    subdir === 'post-x-www-form-urlencoded' ||
    subdir === 'post-x-www-form-urlencoded-parameters'
  ) return;      // NOTE: these two now have a Content-Length field not accounted for in the .sts files…
  // see e.g. https://github.com/mhart/aws4/blob/master/test/aws-sig-v4-test-suite/post-x-www-form-urlencoded/post-x-www-form-urlencoded.creq
  
  let ourSts = plugin.signRequest(request),
      tgtSts = fs.readFileSync(`${basePath}.sts`, 'utf8');
  checkResult("String-to-sign", ourSts, tgtSts);
  
  let ourAuth = request.headers['Authorization'],
      tgtAuth = fs.readFileSync(`${basePath}.authz`, 'utf8');
  checkResult("Authorization header", ourAuth, tgtAuth);
}


fs.readdirSync(suiteDir).forEach(function (subdir) {
  if (subdir[0] === '.') return;
  else if (
    subdir === 'normalize-path' ||
    subdir === 'post-sts-token'
  ) {
    var subSuiteDir = path.join(suiteDir, subdir);
    fs.readdirSync(subSuiteDir).forEach(function (subdir) {
      if (subdir[0] === '.') return;
      else if (subdir.endsWith(".txt")) return;
      else testAgainstData(subSuiteDir, subdir);
    });
  } else {
    testAgainstData(suiteDir, subdir);
  }
});