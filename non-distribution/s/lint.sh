#!/bin/bash

cd "$(dirname "$0")"/.. || exit 1

LINT=0

# i have used both classes and and async functions in my tf-idf
# and while I can remove the class, I don't know how to do it without async functions (please don't make me rewrite it with promises)
for file in $(find . -name '*.sh' | grep -v -f .gitignore); do
    if shellcheck "$file"; then
	true
    else
	LINT=1
    fi
done

if npm run lint; then
	true
else
	LINT=1
fi

exit $LINT
