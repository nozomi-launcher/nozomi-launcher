#!/bin/bash
DIR="$(dirname "$(realpath "$0")")"
exec "$DIR/nozomi-launcher" "$@"
