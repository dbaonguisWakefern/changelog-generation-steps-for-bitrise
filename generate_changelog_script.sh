#!/bin/bash

# export GIT_CHANGELOG_STARTING_HASH="a944d672b"

export GIT_CHANGELOG="$(git log --no-walk --tags --pretty="%h %d %s" --decorate=full)"

echo "$GIT_CHANGELOG" > generate_changelog_temp.txt

# echo "$GIT_CHANGELOG"

node generate_changelog_node.js