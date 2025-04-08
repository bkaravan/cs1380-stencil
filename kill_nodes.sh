#!/bin/bash

# Script to kill processes running on ports 7110, 7111, and 7112

echo "Killing processes on ports 7110, 7111, and 7112..."

for port in 1234 7110 7111 7112 7113 7114 7115; do
    pid=$(sudo lsof -t -i:$port 2>/dev/null)
    if [ -n "$pid" ]; then
      echo "Killing process on port $port (PID: $pid)"
      sudo kill -9 $pid
    else
      echo "No process found on port $port"
    fi
  done

echo "clearing store & authors" 

rm -rf store

rm -rf authors