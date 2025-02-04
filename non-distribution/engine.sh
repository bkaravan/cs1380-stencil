#!/bin/bash
# This is the main entry point of the search engine.
cd "$(dirname "$0")" || exit 1

while read -r url; do

  if [[ "$url" == "stop" ]]; then
    # stop the engine if it sees the string "stop" 
    exit;
  fi

  # start_time=$(date +%s.%N)  # Capture start time with nanoseconds

  # echo "[engine] crawling $url" > /dev/stderr
  # crawl_start_time=$(date +%s.%N)
  # ./crawl.sh "$url" > d/content.txt
  # crawl_end_time=$(date +%s.%N)

  # echo "[engine] indexing $url" > /dev/stderr
  # index_start_time=$(date +%s.%N)
  # ./index.sh d/content.txt "$url"
  # index_end_time=$(date +%s.%N)

  # end_time=$(date +%s.%N)  # Capture end time

  # # Function to calculate time difference with precision
  # time_diff() {
  #   awk "BEGIN {print ($2 - $1)}"
  # }

  # # Compute and log time differences
  # crawl_duration=$(time_diff $crawl_start_time $crawl_end_time)
  # index_duration=$(time_diff $index_start_time $index_end_time)
  # total_duration=$(time_diff $start_time $end_time)

  # echo "[engine] Crawl duration: ${crawl_duration}s" > /dev/stderr
  # echo "[engine] Index duration: ${index_duration}s" > /dev/stderr
  # echo "[engine] Total duration: ${total_duration}s" > /dev/stderr

   echo "[engine] crawling $url" > /dev/stderr
  ./crawl.sh "$url" > d/content.txt

  echo "[engine] indexing $url" > /dev/stderr
  ./index.sh d/content.txt "$url"

  if  [[ "$(cat d/visited.txt | wc -l)" -ge "$(cat d/urls.txt | wc -l)" ]]; then
      # stop the engine if it has seen all available URLs
      break;
  fi

done < <(tail -f d/urls.txt)
