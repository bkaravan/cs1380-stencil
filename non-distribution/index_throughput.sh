#!/bin/bash
cd "$(dirname "$0")" || exit 1

cat /dev/null > d/visited.txt
cat /dev/null > d/urls.txt
cat /dev/null > d/global-index.txt

base_url="https://atlas.cs.brown.edu/data/gutenberg/"
echo $base_url > d/urls.txt

# Record start time for indexing (not for the whole crawl)
# start_time=$(date +%s%N)
total_indexing_time=0
max_urls=1000  # Cap the number of URLs to crawl
total_urls=0

while read -r url; do
  if [[ "$url" == "stop" ]]; then
    # stop the engine if it sees the string "stop"
    break;
  fi

  # Run the crawl script first
  ./crawl.sh "$url" >d/content.txt
  
  # Measure time taken for the indexing part only
  index_start_time=$(date +%s%N)
  ./index.sh d/content.txt "$url"
  index_end_time=$(date +%s%N)

  # Calculate the time for indexing
  index_duration=$((index_end_time - index_start_time))
  total_urls=$((total_urls + 1))

  # Add the indexing time to the total time (for later analysis if needed)
  total_indexing_time=$((total_indexing_time + index_duration))

  if [[ $total_urls -ge $max_urls ]]; then
    break
  fi

  if  [[ "$(cat d/visited.txt | wc -l)" -ge "$(cat d/urls.txt | wc -l)" ]]; then
    # stop the engine if it has seen all available URLs
    break;
  fi
done < <(tail -f d/urls.txt)

# Calculate total indexing duration in seconds
index_duration_sec=$(echo "scale=6; $total_indexing_time / 1000000000" | bc)
index_throughput=$(echo "scale=3; $total_urls / $index_duration_sec" | bc)

echo "Indexing throughput: $index_throughput URLs per second"