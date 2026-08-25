#!/bin/zsh
cd "$(dirname "$0")/backend" || exit 1
./gradlew bootRun
