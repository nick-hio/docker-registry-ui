# Deployment

## Build the image

This fork does not publish a Docker image yet. Build it from source:

```bash
git clone https://github.com/nick-hio/docker-registry-ui.git
cd docker-registry-ui
docker build -t docker-registry-ui:local .
```

The upstream images (`joxit/docker-registry-ui`) contain the original interface.

### Image variants

| File | Base image |
| --- | --- |
| `Dockerfile` | `nginx:alpine-slim` |
| `debian.dockerfile` | `nginx:stable-bookworm` |
| `arm64v8.dockerfile` | `arm64v8/nginx:alpine-slim` |
| `arm32v7.dockerfile` | `arm32v7/nginx:alpine-slim` |

To build a variant, give its file to `docker build`:

```bash
docker build -f debian.dockerfile -t docker-registry-ui:local-debian .
```

## Recommended setup

This Docker Compose file runs the UI and the registry together. It works for most use cases. The UI forwards the registry requests with [`NGINX_PROXY_PASS_URL`](configuration.md#nginx-proxy), so the UI and the registry have the same origin. Build the `docker-registry-ui:local` image first.

```yml
services:
  registry-ui:
    image: docker-registry-ui:local
    restart: always
    ports:
      - 80:80
    environment:
      - SINGLE_REGISTRY=true
      - REGISTRY_TITLE=Docker Registry UI
      - DELETE_IMAGES=true
      - SHOW_CONTENT_DIGEST=true
      - NGINX_PROXY_PASS_URL=http://registry-server:5000
      - SHOW_CATALOG_NB_TAGS=true
      - CATALOG_MIN_BRANCHES=1
      - CATALOG_MAX_BRANCHES=1
      - TAGLIST_PAGE_SIZE=100
      - REGISTRY_SECURED=false
      - CATALOG_ELEMENTS_LIMIT=1000
    container_name: registry-ui

  registry-server:
    image: registry:2.8.2
    restart: always
    environment:
      REGISTRY_HTTP_HEADERS_Access-Control-Allow-Origin: '[http://registry-ui.example.com]'
      REGISTRY_HTTP_HEADERS_Access-Control-Allow-Methods: '[HEAD,GET,OPTIONS,DELETE]'
      REGISTRY_HTTP_HEADERS_Access-Control-Allow-Credentials: '[true]'
      REGISTRY_HTTP_HEADERS_Access-Control-Allow-Headers: '[Authorization,Accept,Cache-Control]'
      REGISTRY_HTTP_HEADERS_Access-Control-Expose-Headers: '[Docker-Content-Digest]'
      REGISTRY_STORAGE_DELETE_ENABLED: 'true'
    volumes:
      - ./registry/data:/var/lib/registry
    container_name: registry-server
```

For all the settings, see [Configuration](configuration.md). For the registry side (CORS and deletes), see [Registry configuration](registry.md).

## Run as an unprivileged user

Run the container as the `nginx` user with `--user nginx`. nginx then listens on port `8080`. To use another port, set [`NGINX_LISTEN_PORT`](configuration.md#nginx-proxy) (see [#224](https://github.com/Joxit/docker-registry-ui/issues/224) and [#234](https://github.com/Joxit/docker-registry-ui/pull/234)).

```bash
docker run -d -p 127.0.0.1:8080:8080 --user nginx \
  -e NGINX_PROXY_PASS_URL=http://registry:5000 \
  -e SINGLE_REGISTRY=true \
  docker-registry-ui:local
```

## HTTPS

Put a reverse proxy in front of the UI. The reverse proxy handles the HTTPS connection. See the [HTTPS example](../examples/issue-20/).

If the UI uses HTTPS and the browser connects to the registry directly (`REGISTRY_URL`), the registry must use HTTPS too. Otherwise, the browser blocks the requests with a *Mixed Content* error. With `NGINX_PROXY_PASS_URL`, the browser connects only to the UI.

## More setups

See the [examples](examples.md) for Docker Swarm with Traefik, Kubernetes, Amazon S3 storage, token authentication, and more.
