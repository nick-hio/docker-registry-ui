#!/bin/sh

# Runtime settings live in HTML attributes. Escape values before substitution.
# Concatenation avoids sed replacement expansion and script-string injection.
awk '
function html(value, result, i, character) {
  result = ""
  for (i = 1; i <= length(value); i++) {
    character = substr(value, i, 1)
    if (character == "&") character = "&amp;"
    else if (character == "\"") character = "&quot;"
    else if (character == "<") character = "&lt;"
    else if (character == ">") character = "&gt;"
    result = result character
  }
  return result
}
{
  remaining = $0
  output = ""
  while (match(remaining, /\$\{[A-Z_]+\}/)) {
    key = substr(remaining, RSTART + 2, RLENGTH - 3)
    output = output substr(remaining, 1, RSTART - 1) html(ENVIRON[key])
    remaining = substr(remaining, RSTART + RLENGTH)
  }
  print output remaining
}' index.html > index.html.tmp && mv index.html.tmp index.html

get_nginx_proxy_headers() {
  (
    env &&
    if [ -f "/etc/nginx/.env" ]; then
      cat /etc/nginx/.env
      # Force new line
      echo ""
    fi
  ) | while read e; do
    if [ -n "$(echo $e | grep -o '^NGINX_PROXY_HEADER_')" ]; then
      key=$(echo ${e%%=*} | sed 's/^NGINX_PROXY_HEADER_//' | sed 's/_/-/g')
      value=${e#*=}
      echo -n "proxy_set_header ${key} \"${value}\"; "
    fi
  done
}

get_nginx_proxy_pass_headers() {
  (
    env &&
    if [ -f "/etc/nginx/.env" ]; then
      cat /etc/nginx/.env
      # Force new line
      echo ""
    fi
  ) | while read e; do
    if [ -n "$(echo $e | grep -o '^NGINX_PROXY_PASS_HEADER_')" ]; then
      key=$(echo ${e%%=*} | sed 's/^NGINX_PROXY_PASS_HEADER_//' | sed 's/_/-/g')
      echo -n "proxy_pass_header \"${key}\"; "
    fi
  done
}

if [ -n "${NGINX_PROXY_PASS_URL}" ] ; then
  sed -i "s,\${NGINX_PROXY_PASS_URL},${NGINX_PROXY_PASS_URL}," /etc/nginx/conf.d/default.conf
  sed -i "s^\${NGINX_PROXY_HEADERS}^$(get_nginx_proxy_headers)^" /etc/nginx/conf.d/default.conf
  sed -i "s^\${NGINX_PROXY_PASS_HEADERS}^$(get_nginx_proxy_pass_headers)^" /etc/nginx/conf.d/default.conf
  sed -i "s,#! , ," /etc/nginx/conf.d/default.conf # The space is important here, to not interfer with #!r
  if [ -n "${NGINX_RESOLVER}" ]; then
    sed -i "s,\${NGINX_RESOLVER},${NGINX_RESOLVER}," /etc/nginx/conf.d/default.conf
    sed -i "s,#r,," /etc/nginx/conf.d/default.conf
  else
    sed -i "s,#!r, ," /etc/nginx/conf.d/default.conf # The space is for cosmetic here
  fi
fi

if [ "$(whoami)" != "root" ]; then
  if [ "$NGINX_LISTEN_PORT" = "80" ]; then
    NGINX_LISTEN_PORT="8080"
  fi
  sed -i "/user  nginx;/d" /etc/nginx/nginx.conf
  sed -i "s,/run/nginx.pid,/tmp/nginx.pid," /etc/nginx/nginx.conf
fi

if [ "$NGINX_LISTEN_PORT" != "80" ]; then
  sed -i "s,listen       80;,listen       $NGINX_LISTEN_PORT;," /etc/nginx/conf.d/default.conf
fi
