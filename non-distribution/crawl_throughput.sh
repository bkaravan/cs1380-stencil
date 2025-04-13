#!/bin/bash
cd "$(dirname "$0")" || exit 1

cat /dev/null > d/visited.txt
cat /dev/null > d/urls.txt

# runs by itse
base_url="https://atlas.cs.brown.edu/data/gutenberg/"
echo $base_url > d/urls.txt

start_time=$(date +%s%N)
total_urls=0
max_urls=1000  # Cap the number of URLs to crawl

while read -r url; do
  if [[ "$url" == "stop" ]]; then
    break
  fi

  ./crawl.sh "$url" > d/content.txt
  ((total_urls++))

  # Stop if we've hit the max URL limit
  # echo 'On url:' $total_urls
  if [[ $total_urls -ge $max_urls ]]; then
    break
  fi

  # Stop if we've visited all known URLs
  if [[ "$(wc -l < d/visited.txt)" -ge "$(wc -l < d/urls.txt)" ]]; then
    break
  fi
done < <(tail -f d/urls.txt)

end_time=$(date +%s%N)
total_duration=$(echo "scale=6; ($end_time - $start_time) / 1000000000" | bc)
crawl_throughput=$(echo "scale=3; $total_urls / $total_duration" | bc)
echo "Crawl throughput: $crawl_throughput URLs per second"
