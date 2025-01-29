# M0: Setup & Centralized Computing

> Add your contact information below and in `package.json`.

* name: `Bohdan Karavan`

* email: `bohdan_karavan@brown.edu`

* cslogin: `bkaravan`


## Summary

> Summarize your implementation, including the most challenging aspects; remember to update the `report` section of the `package.json` file with the total number of hours it took you to complete M0 (`hours`), the total number of JavaScript lines you added, including tests (`jsloc`), the total number of shell lines you added, including for deployment and testing (`sloc`).


My implementation consists of components described in the handout, which including the lab files, consisted of writing 8 components: combine, getText, getUrl, invert, merge, process, stem, and query. There were two main challanges in the assignment: understanding shell scripting and converting the whole pipeline to support tf-idf. I have never extensively used shell scripting before, so it was quite difficult to get used to their usage and track their meaning at first. It feels like shell commands are much less intuitive to the eye than any other language I have seen. The first couple of tests also took a bit of time getting used to shell syntax, but eventually, I got a bit more comfortable. But the hardest part of the assignment was getting the whole pipeline transferred into one javascript file to support tf-idf. The actual implemention of tf-idf took me about 30 minutes, but making the whole pipeline support it took me around 8-10 hours. With that said, some of it included lab part 1 with converting scripts to java script files, but when I tried integrating everything together, I realized that engine, index, and crawl need to be converted too. This took by far the most effort, especially since I had a number of bugs that were hard to track down. Maybe it is a part of learning experience, but it feels like there is not a whole lot of guidance on this part of the assignment.


## Correctness & Performance Characterization


> Describe how you characterized the correctness and performance of your implementation.


To characterize correctness, we developed 10 test cases that test the following cases: testing each component individually, testing end to end pipelines on different corpora, and testing tf-idf with hand-calculated tf-idf metrics on a smaller corpus of documents.


*Performance*: The throughput of various subsystems is described in the `"throughput"` portion of package.json. All of my measurements were on the second sandbox provided. I measured throughput of the crawler by adding timestaps in the engine script. The crawler was a bit faster on the local machine, and could process 1.5 urls per second, on average. The throughput of the indexer is measured in a similar way, but I also took into account the number of words each corpus had. Both environments were fairly close in their throughput, with dev processign 14700 words per second, and aws 14200 words per second. Lastly, to test queries, I created a loop that would search for a term in the beginning, middle, and end of the global index file, and ran it 100 times. Surprsingly, the throughput of the query was remarkably consistent, with both local and aws finding matches in 0.07 seconds, so roughly 14 queries per second. With that being said, I didn't take file opening time into account, which could affect query throughput. 

Interesting note on throughput: combining the whole pipeline into one file made it noticably faster. 
The characteristics of my development machines are summarized in the `"dev"` portion of package.json.


## Wild Guess

> How many lines of code do you think it will take to build the fully distributed, scalable version of your search engine? Add that number to the `"dloc"` portion of package.json, and justify your answer below.

I feel like the purpose of this assignment already prepared us for "distributed" code, since every component lived in a 
separate script/file. Therefore, I doubt there are much more lines needed to make this code support distribution. I eyebolled the whole codebase to be
600 lines, and added 250 lines to support distributed synchronizations. 

