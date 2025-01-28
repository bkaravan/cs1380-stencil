#!/usr/bin/env node

/*
Extract all URLs from a web page.
*/
const {JSDOM} = require('jsdom');
const {URL} = require('url');

function processUrls(html, baseURL) {
  if (baseURL.endsWith('index.html')) {
    baseURL = baseURL.slice(0, baseURL.length - 'index.html'.length);
  } else {
    baseURL += '/';
  }

  const dom = new JSDOM(html);
  const document = dom.window.document;

  // 4. Find all URLs:
  //  - select all anchor (`<a>`) elements) with an `href` attribute using `querySelectorAll`.
  //  - extract the value of the `href` attribute for each anchor element.
  const output = [];
  document.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href');
    const absURL = new URL(href, baseURL).href;
    // 5. Print each absolute URL to the console, one per line.
    output.push(absURL);
  });
  return output;
}

module.exports = processUrls;

