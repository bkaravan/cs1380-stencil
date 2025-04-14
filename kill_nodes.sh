#!/bin/bash

# Script to kill processes running on ports 7110, 7111, and 7112

echo "Killing processes on ports 7110, 7111, and 7112..."

for port in 1234 7110 7111 7112 7113 7114 7115; do
    kill -9 $(lsof -t -i:$port 2>/dev/null)
done

echo "clearing store & authors" 

rm -rf store

rm -rf authors

rm -rf debugging