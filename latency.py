import sys
import os

args = sys.argv[1:]

if len(args) != 1:
    print("Usage: python latency.py <dir>")
    sys.exit(1)
dir = args[0]

files = os.listdir(dir)

url_count = 0
latency = 0

for file in files:
    with open(os.path.join(dir, file), "r") as f:
        lines = f.readlines()
        for line in lines:
            url_count += 1
            latency += float(line)

print("avg latency:", (latency / url_count) / 1000, "for crawling", url_count, "urls")
print("troughput:", url_count / (latency / 1000), "urls/s")
