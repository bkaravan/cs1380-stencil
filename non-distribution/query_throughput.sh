cd "$(dirname "$0")" || exit 1
pwd
./query-extract.sh
# search_terms=("stuff" "turbul" "turmoil" "understood captiv" "understood captiv subject")
start_time=$(date +%s%N)
queries_processed=0

while read -r term; do
    ./query.js "$term" > /dev/null
    ((queries_processed++))
done < d/query_words.txt

end_time=$(date +%s%N)

# Convert nanoseconds to seconds with float precision
total_duration=$(echo "scale=6; ($end_time - $start_time) / 1000000000" | bc)
throughput=$(echo "scale=3; $queries_processed / $total_duration" | bc)

echo "Processed $queries_processed queries in $total_duration seconds."
echo "Query throughput: $throughput queries per second."