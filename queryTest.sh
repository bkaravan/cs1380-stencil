#!/bin/bash

# Create a named pipe (FIFO)
PIPE=/tmp/node_input_fifo
REAL=queryResults.txt
rm -f $PIPE
mkfifo $PIPE

./kill_nodes.sh

# Start the Node.js process reading from the pipe
node main.js < $PIPE > $REAL &

# Wait 60 seconds for nodes to initialize
sleep 80

start_time=$(date +%s%N)

# Read each line from the file and send it to the pipe
total_queries=0
while read -r line; do
  # Send the line to the Node.js process
  echo "$line" > $PIPE
  total_queries=$((total_queries + 1))
done < "authors_output.txt"

end_time=$(date +%s%N)


# Calculate elapsed time in nanoseconds
elapsed_time=$((end_time - start_time))

# Calculate throughput (queries per second)
if [[ $elapsed_time -gt 0 ]]; then
  throughput=$(echo "scale=6; $total_queries / ($elapsed_time / 1000000000)" | bc)
else
  throughput="N/A"  # Handle case where elapsed time is zero (unexpected)
fi

# Output the throughput
echo "Total queries sent: $total_queries"
echo "Elapsed time: $elapsed_time nanoseconds"
echo "Throughput: $throughput queries per second"
echo "Latency: $(echo "scale=6; $elapsed_time / ($total_queries * 1000000)" | bc) milliseconds per query"