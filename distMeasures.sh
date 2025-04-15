#!/bin/bash

# Initialize sums
crawler_elapsed=0
crawler_urls=0
indexer_elapsed=0
indexer_urls=0

# Read the file line-by-line
while IFS= read -r line; do
    # Skip LATENCY lines
    [[ "$line" == *"LATENCY"* ]] && continue

    # Extract fields for CRAWLER and INDEXER THROUGHPUT lines
    if [[ "$line" =~ ^CRAWLER ]]; then
        elapsed=$(echo "$line" | grep -oP 'elapsedTime: \K[0-9.]+' )
        urls=$(echo "$line" | grep -oP 'urlCount: \K[0-9]+' )
        crawler_elapsed=$(echo "$crawler_elapsed + $elapsed" | bc)
        crawler_urls=$(echo "$crawler_urls + $urls" | bc)
    elif [[ "$line" =~ ^INDEXER ]]; then
        elapsed=$(echo "$line" | grep -oP 'elapsedTime: \K[0-9.]+' )
        urls=$(echo "$line" | grep -oP 'urlCount: \K[0-9]+' )
        indexer_elapsed=$(echo "$indexer_elapsed + $elapsed" | bc)
        indexer_urls=$(echo "$indexer_urls + $urls" | bc)
    fi
done < "${1:-/dev/stdin}"

# Calculate throughput
crawler_throughput=$(echo "scale=6; $crawler_urls / $crawler_elapsed" | bc)
crawler_latency=$(echo "scale=6; $crawler_elapsed / $crawler_urls" | bc)
indexer_throughput=$(echo "scale=6; $indexer_urls / $indexer_elapsed" | bc)
indexer_latency=$(echo "scale=6; $indexer_elapsed / $indexer_urls" | bc)

# Output results
echo "CRAWLER:"
echo "  Total elapsed time (ms): $crawler_elapsed"
echo "  Total URL count: $crawler_urls"
echo "  Throughput (URLs/sec): $(echo "$crawler_throughput * 1000" | bc)"
echo "  Latency (ms): $crawler_latency"
echo ""
echo "INDEXER:"
echo "  Total elapsed time (ms): $indexer_elapsed"
echo "  Total URL count: $indexer_urls"
echo "  Throughput (URLs/sec): $(echo "$indexer_throughput * 1000" | bc)"
echo "  Latency (ms): $indexer_latency"