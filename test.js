"use strict";

const suiteDir = "aws-sig-v4-test-suite";

let fs = require('fs'),
    path = require('path'),
    plugin = require(".");

function parseRequest(reqData) {
   let reqLines = reqData.split('\n'),
      [method, reqPath, _vers] = reqLines[0].split(' '),
      bodyIdx = reqLines.indexOf(''),
      headerLines = (~bodyIdx) ? reqLines.slice(1, bodyIdx) : reqLines.slice(1),
      data = (~bodyIdx) ? reqLines.slice(bodyIdx+1).join('\n') : null;
  
  function extractPath(pathname) {
    return pathname.split('/').map(decodeURIComponent);
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
  
  
  var url = new URL(reqPath, "scheme:/host"),
      path = extractPath(url.pathname),
      query = extractQuery(url.searchParams),
      headers = extractHeaders(headerLines);
  
  return {
    method, path, query, headers, data
  };
}


fs.readdirSync(suiteDir).forEach(function (subdir) {
  if (subdir[0] === '.') return;
  if (subdir === 'normalize-path') return;    // TODO: handle
  if (subdir === 'post-sts-token') return;    // TODO: handle
  
  let basePath = path.join(suiteDir, subdir, subdir);
  
  let reqData = fs.readFileSync(`${basePath}.req`, 'utf8'),
      request = parseRequest(reqData);
  //console.log(subdir, request);
  
  function checkResult(label, our, tgt) {
    if (our !== tgt) {
      console.log("\nMISMATCH\n");
      console.warn(`tgt:\n${tgt}\n`);
      console.warn(`our:\n${our}\n`);
      console.info(subdir, request);
      throw Error(`${label} does not match!`);
    } else {
      console.log(label, "okay for", subdir);
    }
  }
  
  let ourCreq = plugin.canonicalRequest(request)[0],
      tgtCreq = fs.readFileSync(`${basePath}.creq`, 'utf8');
  checkResult("Canonical request", ourCreq, tgtCreq);
  
  let ourSts = plugin.signRequest(request),
      tgtSts = fs.readFileSync(`${basePath}.sts`, 'utf8');
  checkResult("String-to-sign", ourSts, tgtSts);
  
  let ourAuth = request.headers['Authorization'],
      tgtAuth = fs.readFileSync(`${basePath}.authz`, 'utf8');
  checkResult("Authorization header", ourAuth, tgtAuth);
});