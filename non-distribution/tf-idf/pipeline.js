#!/usr/bin/env node

//pipeline:

// cat "$1" |
//   c/merge.js d/global-index.txt |
//   sort -o d/global-index.txt

// THE SECOND ARGUMENT IS A FILE WITH ALL URLS EXPLORED 
// while it kills some parallelism, the only other way I can think of is to rewrite the whole engine
// in JS, and I am not sure if I have time for it

// process part
const fs = require('fs');
// const readline = require('readline');
const natural = require('natural');
const processUrls = require('./tfGetUrls');
const {convert} = require('html-to-text');
const https = require('https');
const http = require('http');

// not sure what this number is tbh, might be 3
// const urlFile = process.argv[2];
// const globalIndexFile = "../d/global-index.txt";


let filteredWords = [];
let inverted = [];
const global = {}

// fills output with n-grams
function computeNgrams(output) {
    const buffer = filteredWords.filter(Boolean);

    const bigrams = [];
    for (let i = 0; i < buffer.length - 1; i++) {
      bigrams.push([buffer[i], buffer[i + 1]]);
    }
  
    const trigrams = [];
    for (let i = 0; i < buffer.length - 2; i++) {
      trigrams.push([buffer[i], buffer[i + 1], buffer[i + 2]]);
    }
  
    const together = buffer.concat(bigrams).concat(trigrams);
  
    for (const item of together) {
      if (Array.isArray(item)) {
        output.push(item.join('\t'));
      } else {
        output.push(item);
      }
    }
}

function invert(data, url) {
    const result = data
    // basically python's defaultdict, counting how many times each line occurs
        .reduce((acc, line) => {
        const key = line.trim();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
        }, {});

    // Entries creates a stream of KV pairs
    const output = Object.entries(result)
    // each entry counts the first three words
        .map(([words, count]) => {
        const parts = words.split(/\s+/).slice(0, 3).join(' ');
        return `${parts} | ${count} |`;
        })
        .sort()
        // adding the url at the end
        .map((line) => `${line} ${url}`)
        .join('\n');
    return output
}

const compare = (a, b) => {
    if (a.freq > b.freq) {
      return -1;
    } else if (a.freq < b.freq) {
      return 1;
    } else {
      return 0;
    }
  };

function processDocument() {
    const stopSet = new Set(fs.readFileSync('d/stopwords.txt', 'utf8').split('\n').map((word) => word.trim()).filter(Boolean));

    const processedWords = data.replace(/\s+/g, '\n')
        .replace(/[^a-zA-Z]/g, ' ')
        .replace(/\s+/g, '\n')
        .toLowerCase();
    const stemmer = natural.PorterStemmer;
    // stemming and filtering
    filteredWords = processedWords.split('\n').filter((word) => stemmer.stem(word) && !stopSet.has(word));
    
    // combine part
    const combinedGrams = [];
    computeNgrams(combinedGrams);

    // invert part
    inverted = invert(combinedGrams);
    
    // using provided fs to read

    // DOUBLE CHECK INDEXING PIPELINE
    merged(localIndex);
}

const merged = (localIndex) => {
  
    // Split the data into an array of lines
    const localIndexLines = localIndex.split('\n');
  
    localIndexLines.pop();
  
    const local = {};
  
    // 3. For each line in `localIndexLines`, parse them and add them to the `local` object where keys are terms and values contain `url` and `freq`.
    for (const line of localIndexLines) {
      // might need to skip empty lines
      const lineSplit = line.split('|').map((part) => part.trim());
      if (lineSplit.length < 3) continue;
      const term = lineSplit[0];
      const url = lineSplit[2];
      const freq = Number(lineSplit[1]);
      local[term] = {url, freq};
    }
  
    // 5. Merge the local index into the global index:
    // - For each term in the local index, if the term exists in the global index:
    //     - Append the local index entry to the array of entries in the global index.
    //     - Sort the array by `freq` in descending order.
    // - If the term does not exist in the global index:
    //     - Add it as a new entry with the local index's data.
  
    for (const term in local) {
      if (term in global) {
        global[term].push(local[term]);
        // technically, might be faster to resort everything at the end
        global[term].sort(compare);
      } else {
        global[term] = [local[term]];
      }
    }
    // 6. Print the merged index to the console in the same format as the global index file:
    //    - Each line contains a term, followed by a pipe (`|`), followed by space-separated pairs of `url` and `freq`.
    
    // TODO: instead of this, we will write the final global index to a file 

    // for (const term in global) {
    //   const pairs = global[term].map((entry) => `${entry.url} ${entry.freq}`).join(' ');
    //   const line = `${term} | ${pairs}`;
    //   console.log(line);
    // }
};

class UrlCrawler {
  constructor() {
    // Instead of files, use Sets and arrays to store data
    this.urls = new Set();          // Represents urls.txt
    this.visited = new Set();       // Represents visited.txt
    this.content = '';             // Represents content.txt
    this.agent = new https.Agent({
      rejectUnauthorized: false
    });
  }

  makeRequest(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
      const options = {
        rejectUnauthorized: false, // Ignore SSL certificate errors
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml'
        }
      };
  
      const client = url.startsWith('https') ? https : http;
  
      const req = client.get(url, options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Handle redirect
          if (maxRedirects === 0) {
            reject(new Error('Too many redirects'));
            return;
          }
          const redirectUrl = new URL(res.headers.location, url).toString();
          resolve(this.makeRequest(redirectUrl, maxRedirects - 1)); // Recursive call
        } else if (res.statusCode !== 200) {
          reject(new Error(`HTTP error! status: ${res.statusCode}`));
        } else {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve(data);
          });
        }
      });
  
      req.on('error', (error) => {
        reject(error);
      });
    });
  }

  async crawlUrl(url) {
    console.log(`[engine] crawling ${url}`);
    try {
      // Simulate myCrawl.sh
      this.content = await this.crawl(url);
      //console.log(this.content);
      
      console.log(`[engine] indexing ${url}`);
      // Simulate myInd.sh
      await this.mockIndex(this.content, url);
      
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
    }
  }

  // Mock function to simulate crawling
  async crawl(url) {
    this.visited.add(url);

    try {
      // Fetch the page content
      const html = await this.makeRequest(url);

      // Process in parallel, similar to the tee in the bash script
      const [newUrls, textContent] = await Promise.all([
        // Call getURLs.js
        processUrls(html, url),
        // Call getText.js
        convert(html)
      ]);

      // Add new URLs that haven't been visited yet
      for (const newUrl of newUrls) {
        if (!this.visited.has(newUrl)) {
          this.urls.add(newUrl);
        }
      }

      return textContent;

    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
      return '';
    }
  }

  // Mock function to simulate indexing
  async mockIndex(content, url) {
    // Replace this with actual indexing logic
    return true;
  }

  // Method to add new URLs to crawl
  addUrl(url) {
    this.urls.add(url);
  }

  // Main engine method
  async run() {
    // Create an async iterator to simulate tail -f behavior
    const urlIterator = this.urlGenerator();

    for await (const url of urlIterator) {
      if (url === 'stop') {
        console.log('Stopping due to stop command');
        break;
      }
      
      await this.crawlUrl(url);

      // Check if we've visited all available URLs
      if (this.visited.size >= this.urls.size) {
        console.log('Stopping - all URLs have been visited');
        break;
      }
    }
  }

  // Generator function to simulate tail -f behavior
  async *urlGenerator() {
    const processed = new Set();
    
    while (true) {
      for (const url of this.urls) {
        if (!processed.has(url)) {
          processed.add(url);
          yield url;
        }
      }
      
      // Simulate waiting for new URLs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

function main() {
  const crawler = new UrlCrawler();

  // Add some URLs to crawl
  crawler.addUrl('https://cs.brown.edu/courses/csci1380/sandbox/1');

  // Start the crawler
  crawler.run().catch(console.error);
}


main();



// some idea from cs200 search

// def process_document(self, title: str, id: int, body: str) -> list[str]:
// """
// Takes in a document title, id, and body, and returns a list of the
// tokens in the document title and body.

// A "token" is a word, not including stopwords, that has been stemmed. For
// links, only the link text (not destination) are included in the returned
// list.


// Parameters:
//     title       the title of the document
//     id          the id of the document
//     body        the text of the document
// Returns:
//     a list of the tokens in the title and the body

// Process documents assumes that the ids to titles and titles to ids have
// already been filled
// """

// # find every word to go through in title and body
// all_tokens = re.findall(self.tokenization_regex, title)
// all_tokens += re.findall(self.tokenization_regex, body)
// ret_list = []
// # add a counter to calculate maxes
// cur_max = 1

// for word in all_tokens:
//     # check if the word is a link
//     if self.word_is_link(word):
//         # if it is, split it
//         a, b = self.split_link(word)
//         # check that the link is in the corpus
//         if b in self.titles_to_ids.keys():
//             # check if we have added it before
//             if id in self.ids_to_links.keys():
//                 cur_set = self.ids_to_links[id]
//                 cur_set.add(self.titles_to_ids[b])
//                 self.ids_to_links.update({id: cur_set})
//             else:
//                 self.ids_to_links.update({id: {self.titles_to_ids[b]}})
//         # add the text to things that need stemming
//         all_tokens += a
//     else:
//         after_stem = self.stem_and_stop(word)
//         # if the word is not a stopword
//         if after_stem != '':
//             # if we have already seen this owrd
//             if after_stem in self.words_to_doc_frequency.keys():
//                 cur_dict = self.words_to_doc_frequency[after_stem]
//                 # if it has been on this page, increase its count and
//                 # check the max counter
//                 if id in cur_dict.keys():
//                     cur_dict[id] += 1
//                     if cur_dict[id] > cur_max:
//                         cur_max = cur_dict[id]
//                 # otherwise update it to 1
//                 else:
//                     cur_dict.update({id: 1})
//             # if it's a new word put it in the word frequency with 1
//             else:
//                 self.words_to_doc_frequency.update(
//                     {after_stem: {id: 1}})
//             ret_list.append(after_stem)

// # after all of this we will know the highest count of the word for this
// # page with this counter
// self.ids_to_max_counts.update({id: cur_max})
// return ret_list

// def parse(self):
// """
// Reads in an xml file, parses titles and ids, tokenizes text, removes
// stop words, does stemming, and processes links.

// Updates ids_to_titles, titles_to_ids, words_to_doc_frequency,
// ids_to_max_counts, and ids_to_links
// """

// # load XML + root
// wiki_tree = et.parse(self.wiki)
// wiki_xml_root = wiki_tree.getroot()

// # loop through every document once to fill in ids to titles and titles to ids
// for wiki_page in wiki_xml_root:
//     title = wiki_page.find("title").text.strip()
//     id = int(wiki_page.find("id").text.strip())
//     self.ids_to_titles.update({id: title})
//     self.titles_to_ids.update({title: id}) 

// # loop through the second time using process_document on each page
// for wiki_page in wiki_xml_root:
//     title = wiki_page.find("title").text.strip()
//     id = int(wiki_page.find("id").text.strip())
//     self.process_document(
//         title, id, wiki_page.find("text").text.strip())

// def compute_tf(self) -> dict[str, dict[int, float]]:
// """
// Computes tf metric based on words_to_doc frequency

// Assumes parse has already been called to populate the relevant data
// structures.

// Returns:
//     a dictionary mapping every word to its term frequency
// """

// ret_dict = {}

// for word in self.words_to_doc_frequency:
//     # for every word make a dictionary and compute it
//     ret_dict[word] = {}
//     for id in self.words_to_doc_frequency[word]:
//         ret_dict[word][id] = self.words_to_doc_frequency[word][id] / \
//             self.ids_to_max_counts[id]

// return ret_dict

// def compute_idf(self) -> dict[str, float]:
// """
// Computes idf metric based on words_to_doc_frequency

// Assumes parse has already been called to populate the relevant data
// structures.

// Returns:
//     a dictionary mapping every word to its inverse term frequency
// """
// ret_dict = {}
// # as many ids as many pages in the doc
// total_page_count = len(self.ids_to_titles)
// for word in self.words_to_doc_frequency:
//     word_idf = math.log(
//         total_page_count/len(self.words_to_doc_frequency[word]))
//     ret_dict.update({word: word_idf})

// return ret_dict

// def compute_term_relevance(self) -> dict[str, dict[int, float]]:
// """
// Computes term relevance based on tf and idf

// Assumes parse has already been called to populate the relevant data
// structures.

// Returns:
//     a dictionary mapping every every term to a dictionary mapping a page
//     id to the relevance metric for that term and page
// """
// tf_dict = self.compute_tf()
// idf_dict = self.compute_idf()

// for word in tf_dict:
//     for id in tf_dict[word]:
//         tf_dict[word][id] = tf_dict[word][id] * idf_dict[word]

// return tf_dict