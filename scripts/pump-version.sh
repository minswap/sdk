#!/usr/bin/env bash

set -euo pipefail

version=$1

echo "update version field"
jq ".version = \"$version\"" <package.json >package.json.tmp
mv package.json.tmp package.json

jq ".version = \"$version\"" <package-lock.json >package-lock.json.tmp
mv package-lock.json.tmp package-lock.json

echo "build"
npm run build

echo "publish"
npm publish

echo "commit new version"
git add package.json package-lock.json
git commit -m "publish version v$version"

echo "tag version"
git tag v"$version"

echo "push to remote"
git push origin main
git push origin v"$version"
