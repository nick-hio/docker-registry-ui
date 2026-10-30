# Docker Registry User Interface

[![Stars](https://img.shields.io/github/stars/joxit/docker-registry-ui.svg?logo=github&maxAge=86400)](https://github.com/Joxit/docker-registry-ui/stargazers)
[![Pulls](https://img.shields.io/docker/pulls/joxit/docker-registry-ui.svg?maxAge=86400)](https://hub.docker.com/r/joxit/docker-registry-ui)
[![Sponsor](https://joxit.dev/images/sponsor.svg)](https://github.com/sponsors/Joxit)
[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/joxit)](https://artifacthub.io/packages/search?repo=joxit)
[![Version](https://img.shields.io/github/release/joxit/docker-registry-ui?display_name=tag&sort=semver)](https://github.com/Joxit/docker-registry-ui/releases)

> [!NOTE]
> This fork replaces the original Riot.js interface with a new design built on React and [shadcn/ui](https://ui.shadcn.com). The container, the nginx proxy, and all the settings below work the same way.

## Overview

This project aims to provide a simple and complete user interface for your private docker registry. You can customize the interface with various options. The major option is `SINGLE_REGISTRY` which allows you to disable the dynamic selection of docker registries (same behavior as the old **static** tag).

You may need the [migration guide from 1.x to 2.x](https://github.com/Joxit/docker-registry-ui/wiki/Migrating-from-1.x-to-2.x) or [the 1.x readme](https://github.com/Joxit/docker-registry-ui/blob/8fe3adf12540d1316cb57628ebe86a392a703d90/README.md). The project support both [docker registry v2](https://github.com/distribution/distribution/releases/tag/v2.0.0) and [docker registry v3](https://github.com/distribution/distribution/releases/tag/v3.0.0).

The interface uses [React](https://react.dev), TypeScript, [Vite](https://vite.dev), [Tailwind CSS](https://tailwindcss.com), and [shadcn/ui](https://ui.shadcn.com) components. It builds to static files, and nginx serves them in the Docker image.

- A sidebar explorer lists your repositories by namespace.
- The repository page lists the tags in a table that you can sort, filter, and page through.
- Each tag has its own page. It shows the content digest, the size, the layers, the configuration, and every platform of a multi-arch image.

If you like my work and want to support it, don't hesitate to [sponsor me](https://github.com/sponsors/Joxit).

## Docker image

This fork does not publish a Docker image yet. Build it from source:

```bash
git clone https://github.com/nick-hio/docker-registry-ui.git
cd docker-registry-ui
docker build -t docker-registry-ui:local .
```

Then run it like the upstream image, with the same environment variables:

```bash
docker run -d -p 127.0.0.1:8080:80 \
  -e NGINX_PROXY_PASS_URL=http://registry:5000 \
  -e SINGLE_REGISTRY=true \
  docker-registry-ui:local
```

`debian.dockerfile`, `arm32v7.dockerfile`, and `arm64v8.dockerfile` build the other variants. The upstream images (`joxit/docker-registry-ui`) contain the original interface.

## Screenshots

![Repository catalog](docs/screenshots/catalog.png "Repository catalog")

| Tags | Tag page | Layers (dark theme) |
| --- | --- | --- |
| ![Tag list](docs/screenshots/tags.png "Tag list") | ![Tag page](docs/screenshots/tag-page.png "Tag page") | ![Layers in the dark theme](docs/screenshots/tag-layers-dark.png "Layers in the dark theme") |

Upstream project: [project page](https://joxit.dev/docker-registry-ui), [live demo](https://joxit.dev/docker-registry-ui/demo/) (original interface), [Helm chart](https://helm.joxit.dev/).

## Hidden Features

- Delete many tags at once. Select tags with the checkboxes, or select the whole page with the checkbox in the table header (see [#29](https://github.com/Joxit/docker-registry-ui/issues/29) and [#79](https://github.com/Joxit/docker-registry-ui/pull/79)).
- Sort the tag list by tag, creation date, size, or platform. The tag order sorts numbers correctly (see [#45](https://github.com/Joxit/docker-registry-ui/pull/45) and [#46](https://github.com/Joxit/docker-registry-ui/pull/46)) and follows `TAGLIST_ORDER`.
- Share a link to a tag page. The link keeps the open tab and the selected platform, for example `#/repositories/library%2Falpine/tags/latest?tab=layers&platform=linux/arm64v8`. Links from the original interface (`#!/taglist/...` and `#!/taghistory/...`) still open the right page.
- Share your docker registry UI when you deploy it with `SINGLE_REGISTRY=false`.
  - Open the UI with the query parameter `url` (e.g. `https://registry-ui.example.com/?url=https://registry.example.com`). If you need credentials on your private registry, you must set `Access-Control-Allow-Origin` to the origin of the UI.
  - Use a single interface with many registries. Add them with the registry menu at the top of the sidebar.
- Filter repositories and tags with the filter fields. `CTRL + F` or `F3` selects the repository filter on the catalog page and the tag filter on a repository page. When the filter already has the focus, the shortcut does what the browser does by default (see [#213](https://github.com/Joxit/docker-registry-ui/issues/213)).
- See every platform of a multi-arch image on the tag page. Select a platform with the platform menu or the **Platforms** tab (see [#130](https://github.com/Joxit/docker-registry-ui/issues/130)).
- Copy the `docker pull` command by tag or by digest.
- Show the Dockerfile that the image history describes, and copy it (**Layers** tab, see [#286](https://github.com/Joxit/docker-registry-ui/pull/286)).
- The UI caches requests that cannot change, such as blobs and manifests by digest (URL with `sha256:`).
- Switch between the light and the dark theme with the button at the bottom of the sidebar.

Checkout all options in [Available options](#available-options) section.

## FAQ

-   What is the difference between **`SINGLE_REGISTRY=false`** and **`SINGLE_REGISTRY=true`** options ?
    -   When `SINGLE_REGISTRY` is set to false, a menu appears on the interface allowing you to dynamically change docker registry URLs.
-   Why, when I delete all tags of an image, the image is still in the UI ?
    -   This is a limitation of docker registry, the garbage collector don't remove empty images. If you want to delete dangling images, you will need to delete the folder in your registry data. (see [#77](https://github.com/Joxit/docker-registry-ui/issues/77))
-   Why the image size in the UI is not the same as displayed during `docker images` ?
    -   The UI displays the compressed size of the image and not the extracted size version.
-   Can I use HTTPS on the UI ?
    -   Yes, put your favourite reverse proxy on the front of the UI. Your reverse proxy will take care of HTTPS connection.
-   Does the UI support authentication ?
    -   Yes, but it supports only basic auth. It's a simple standalone frontend, it will use your browser window for authentication.
-   Can I use the UI and docker client with an insecure registry (registry url without https) ?
    -   Yes you can, you must first configure your docker client. (see [#76](https://github.com/Joxit/docker-registry-ui/issues/76))
-   What does Mixed Content error mean ?
    -   This means you are using a UI with HTTPS and your registry is using HTTP (unsecured). When you are on a HTTPS site, you can't get HTTP content. Upgrade you registry with a HTTPS connection.
-   Why the default nginx `Host` is set to `$http_host` ?
    -   This fixes the issue [#88](https://github.com/Joxit/docker-registry-ui/issues/88). More about this in [#113](https://github.com/Joxit/docker-registry-ui/issues/113).
-   Why OPTIONS (aka preflight requests) and DELETE fails with 401 status code (using Basic Auth) or why the UI says to check my `Access-Control-Allow-Origin` ?
    -   This is caused by a bug in docker registry, it returns 401 status requests on preflight requests, this breaks [W3C preflight-request specification](https://www.w3.org/TR/cors/#preflight-request). I contacted docker registry maintainers and this will never be fixed ([distribution/distribution#4458](https://github.com/distribution/distribution/issues/4458)). I suggest to have your UI on the same domain than your registry e.g. registry.example.com/ui/ **or** use `NGINX_PROXY_PASS_URL` **or** configure a nginx/apache/haproxy in front of your registry that returns 200 on each OPTIONS requests. (see [#104](https://github.com/Joxit/docker-registry-ui/issues/104), [#204](https://github.com/Joxit/docker-registry-ui/issues/204), [#207](https://github.com/Joxit/docker-registry-ui/issues/207), [#214](https://github.com/Joxit/docker-registry-ui/issues/214), [#266](https://github.com/Joxit/docker-registry-ui/issues/266), [#278](https://github.com/Joxit/docker-registry-ui/issues/278)).
-   Can I use the docker registry ui as a standalone application (with Electron) ?
    -   Check out the example [here](https://github.com/Joxit/docker-registry-ui/tree/main/examples/electron). (see [#129](https://github.com/Joxit/docker-registry-ui/pull/129)) The example was written for the original interface and is not tested with this one.
-   I deleted images through the UI, but they are still present on the server. How can I delete them?
    - When you delete an image with the UI, only the reference is deleted and not the content. To remove dangling images, you need to run the garbage collector of the registry with the command `registry garbage-collect config.yml` or `docker exec registry registry garbage-collect config.yml`. (see [#77](https://github.com/Joxit/docker-registry-ui/issues/77), [#147](https://github.com/Joxit/docker-registry-ui/issues/147))
-   Why when I delete one tag, all tags with the same SHA are deleted ?
    - This a docker registry API limitation, there is only one way to [delete images with tag](https://docs.docker.com/registry/spec/api/#deleting-an-image), it's by its `name` and its `manifest` (it's a sha of the content). So when you delete a tag, this will delete all tags of this image with the same SHA/manifest.
-   Can I run the container with an unprivileged user ?
    - Yes you can run the container with the `nginx` user with the option `--user nginx`, this will also update the listen port to `8080` (see [#224](https://github.com/Joxit/docker-registry-ui/issues/224) and [#234](https://github.com/Joxit/docker-registry-ui/pull/234)).
-   Can I use the UI with a docker hub mirror and show `library/*` images ?
    - Yes but it is at your own risk using two regstry servers, check the comment [#155](https://github.com/Joxit/docker-registry-ui/issues/155#issuecomment-1286052124).
-   How to fix CORS issue on s3 bucket ?
    - You should add a CORS Policy on your bucket, check the issue [#193](https://github.com/Joxit/docker-registry-ui/issues/193).
-   Why my docker registry server is returning an error `pagination number invalid` ?
    - Since docker registry server 2.8.2 there is default limit of 1000 images in catalog. If you need more images update the configuration `REGISTRY_CATALOG_MAXENTRIES` with your max value and check the issue [#306](https://github.com/Joxit/docker-registry-ui/issues/306).
-   I'm using `NGINX_PROXY_PASS_URL`, my registry server has been recreated and the UI cannot connect with the message `[error] 176#176: *2 connect() failed (111: Connection refused) while connecting to upstream`, what can I do?
    - Nginx get the IP of all addresses only once at runtime, since your container has been recreated, its IP changed too. To prevent this kind of issue, you may use the option `NGINX_RESOLVER` and set to `127.0.0.11`.

Need more information? Try the [examples](https://github.com/Joxit/docker-registry-ui/tree/main/examples) or open an issue.

## Available options

You can run the container with the unprivileged user `nginx`, see the discussion [#224](https://github.com/Joxit/docker-registry-ui/issues/224).

Some env options are available for use this interface for **only one server** (when `SINGLE_REGISTRY=true`).

- `REGISTRY_URL`: The default url of your docker registry. You **may need CORS configuration** on your registry. This is usually the domain name or IP of your registry reachable by your computer (e.g `http://registry.example.com`). (default: derived from the hostname of your UI).
- `REGISTRY_TITLE`: Set a custom title for your user interface. (default: value derived from `REGISTRY_URL`) (see [#28](https://github.com/Joxit/docker-registry-ui/issues/28) and [#32](https://github.com/Joxit/docker-registry-ui/issues/32)). Since 0.3.4
- `PULL_URL`: Set a custom url when you copy the `docker pull` command (see [#71](https://github.com/Joxit/docker-registry-ui/issues/71)). (default: value derived from `REGISTRY_URL`). Since 1.1.0
- `DELETE_IMAGES`: Set if we can delete images from the UI. (default: `false`)
- `SHOW_CONTENT_DIGEST`: Show/Hide content digest in docker tag list (see [#126](https://github.com/Joxit/docker-registry-ui/issues/126) and [#131](https://github.com/Joxit/docker-registry-ui/pull/131)). (default: `false`). Since 1.4.9
- `CATALOG_ELEMENTS_LIMIT`: Number of repositories to request per catalog page. The UI follows the `Link` header of the registry until it has the full catalog (see [#39](https://github.com/Joxit/docker-registry-ui/issues/39), [#127](https://github.com/Joxit/docker-registry-ui/pull/127), [#132](https://github.com/Joxit/docker-registry-ui/pull/132)) and [#306](https://github.com/Joxit/docker-registry-ui/issues/306). (default: `1000`). Since 1.4.9
- `SINGLE_REGISTRY`: Remove the menu that show the dialogs to add, remove and change the endpoint of your docker registry. (default: `false`). Since 2.0.0
- `NGINX_PROXY_PASS_URL`: Update the default Nginx configuration and set the **proxy_pass** to your backend docker registry (this avoid CORS configuration). This is usually the name of your registry container in the form `http://registry:5000`. Since 2.0.0
- `NGINX_PROXY_HEADER_*`: Update the default Nginx configuration and **set custom headers** for your backend docker registry via environment variable and file (`/etc/nginx/.env`). Only when `NGINX_PROXY_PASS_URL` is used (see [#89](https://github.com/Joxit/docker-registry-ui/pull/89)). Since 1.2.3
- `NGINX_PROXY_PASS_HEADER_*`: Update the default Nginx configuration and **forward custom headers** to your backend docker registry via environment variable and file (`/etc/nginx/.env`). Only when `NGINX_PROXY_PASS_URL` is used (see [#206](https://github.com/Joxit/docker-registry-ui/issues/206)). Since 2.1.0
- `NGINX_LISTEN_PORT`: Listen on a port other than 80, you can also change the default user and set to nginx `--user nginx` (see [#224](https://github.com/Joxit/docker-registry-ui/issues/224) and [#234](https://github.com/Joxit/docker-registry-ui/pull/234)). (default: `80` when the user is root, `8080` otherwise). Since 2.2.0
- `NGINX_RESOLVER`: Add [`resolver`](http://nginx.org/en/docs/http/ngx_http_core_module.html#resolver) directive to the nginx configuration for dynamic dns resolving. The value when you are using a docker network is `127.0.0.11`, you can set a custom DNS server too with a valid time. This is not needed when you are using kubernetes. (see [#333](https://github.com/Joxit/docker-registry-ui/issues/333) and [#339](https://github.com/Joxit/docker-registry-ui/issues/339)). (default: ``). Since 2.5.5
- `DEFAULT_REGISTRIES`: List of comma separated registry URLs (e.g `http://registry.example.com,http://registry:5000`), available only when `SINGLE_REGISTRY=false` (see [#219](https://github.com/Joxit/docker-registry-ui/pull/219)). (default: ` `). Since 2.1.0
- `READ_ONLY_REGISTRIES`: Deactivate dialog for remove and add new registries, available only when `SINGLE_REGISTRY=false` (see [#219](https://github.com/Joxit/docker-registry-ui/pull/219)). (default: `false`). Since 2.1.0
- `SHOW_CATALOG_NB_TAGS`: Show number of tags per images on catalog page and hide images with 0 tags. This will produce + nb images requests, **not recommended on large registries** (see [#161](https://github.com/Joxit/docker-registry-ui/issues/161) and [#239](https://github.com/Joxit/docker-registry-ui/pull/239)). (default: `false`). Since 2.2.0
- `HISTORY_CUSTOM_LABELS`: Comma-separated list of labels to show in the **Overview** tab of the tag page, like the maintainer label (see [#160](https://github.com/Joxit/docker-registry-ui/issues/160) and [#240](https://github.com/Joxit/docker-registry-ui/pull/240)). Since 2.2.0
- `USE_CONTROL_CACHE_HEADER`: Use `Control-Cache` header and set to `no-store, no-cache`. This will avoid some issues on multi-arch images (see [#260](https://github.com/Joxit/docker-registry-ui/issues/260) and [#265](https://github.com/Joxit/docker-registry-ui/pull/265)). This option requires registry configuration: `Access-Control-Allow-Headers` with `Cache-Control`. (default: `false`). Since 2.3.0
- `THEME`: Chose your default theme, could be `dark`, `light` or `auto` (see [#283](https://github.com/Joxit/docker-registry-ui/pull/283)). When auto is selected, the UI follows the system theme, and a button at the bottom of the sidebar switches between light and dark (see [#291](https://github.com/Joxit/docker-registry-ui/pull/291)). (default: `auto`). Since 2.4.0
- `THEME_*`: See table in [Theme options](#theme-options) section (see [#283](https://github.com/Joxit/docker-registry-ui/pull/283)). Since 2.4.0
- `TAGLIST_ORDER`: Set the default order for the taglist page, could be `num-asc;alpha-asc`, `num-desc;alpha-asc`, `num-asc;alpha-desc`, `num-desc;alpha-desc`, `alpha-asc;num-asc`, `alpha-asc;num-desc`, `alpha-desc;num-asc` or `alpha-desc;num-desc` (see [#307](https://github.com/Joxit/docker-registry-ui/pull/307)). (default: `alpha-asc;num-desc`). Since 2.5.0
- `CATALOG_DEFAULT_EXPANDED`: Expand by default all repositories in catalog (see [#302](https://github.com/Joxit/docker-registry-ui/issues/302)). (default: `false`). Since 2.5.0
- `CATALOG_MIN_BRANCHES`: Set the minimum repository/namespace to expand (e.g. `joxit/docker-registry-ui` `joxit/` is the repository/namespace). Branching can be disabled if min and max are set to 0. (see [#319](https://github.com/Joxit/docker-registry-ui/pull/319)). (default: `1`). Since 2.5.0
- `CATALOG_MAX_BRANCHES`: Set the maximum repository/namespace to expand (e.g. `joxit/docker-registry-ui` `joxit/` is the repository/namespace). Branching can be disabled if min and max are set to 0. (see [#319](https://github.com/Joxit/docker-registry-ui/pull/319)). (default: `1`). Since 2.5.0
- `TAGLIST_PAGE_SIZE`: Set the number of tags to display in one page. (default: `100`). Since 2.5.0
- `REGISTRY_SECURED`: By default, the UI will check on every requests if your registry is secured or not (you will see `401` responses in your console). Set to `true` if your registry uses Basic Authentication and divide by two the number of call to your registry. (default `false`). Since 2.5.0
- `SHOW_TAG_HISTORY`: Whether to show the tag page or not. When set to `false`, the tag list does not link to the tag pages. (default: `true`).
There are some examples with [docker-compose](https://docs.docker.com/compose/) and docker-registry-ui as proxy [here](https://github.com/Joxit/docker-registry-ui/tree/main/examples/ui-as-proxy/) or docker-registry-ui as standalone [here](https://github.com/Joxit/docker-registry-ui/tree/main/examples/ui-as-standalone/).
- `DOCKER_REGISTRY_UI_TITLE`: Set a custom title displayed in the header bar. (default: `Docker Registry UI`).
- `ENABLE_VERSION_NOTIFICATION`: Not used by this interface. The setting is accepted and ignored. (In the original interface, it displays a notification when a new version is available.)

### Theme options

These options were added in version 2.4.0 (see [#283](https://github.com/Joxit/docker-registry-ui/pull/283)). Each value applies to both the light and the dark theme.

| Environment variable | What it colors | Light default | Dark default |
| --- | --- | --- | --- |
| `THEME_PRIMARY_TEXT` | Main text | `#24252b` | `#e4e5eb` |
| `THEME_NEUTRAL_TEXT` | Secondary text | `#70737e` | `#9a9eac` |
| `THEME_BACKGROUND` | Page, cards, and menus | `#ffffff` | `#17181c` |
| `THEME_HOVER_BACKGROUND` | Hover and selected backgrounds | `#f5f6f8` | `#22242b` |
| `THEME_ACCENT_TEXT` | Links, primary buttons, and focus rings | `#2864e8` | `#80a7ff` |
| `THEME_HEADER_TEXT` | Sidebar text | `#50535e` | `#b1b5c2` |
| `THEME_HEADER_ACCENT_TEXT` | Active sidebar item | `#2864e8` | `#80a7ff` |
| `THEME_HEADER_BACKGROUND` | Sidebar background | `#f8f9fb` | `#1c1d22` |
| `THEME_FOOTER_TEXT` | Status bar text | `#666a77` | `#b1b5c2` |
| `THEME_FOOTER_NEUTRAL_TEXT` | Status bar secondary text | `#777c88` | `#9a9eac` |
| `THEME_FOOTER_BACKGROUND` | Status bar background | `#fbfbfc` | `#1b1c21` |

## Recommended Docker Registry Usage

Here is a simple usage of Docker Registry UI with Docker Registry Server using docker-compose. This example should work for most of your use case and your UI will be on the same domain as you registry. Build the `docker-registry-ui:local` image first (see [Docker image](#docker-image)).

```yml
version: '3.8'

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

## Using CORS

:warning: Before posting issues about CORS, please read the and all created issues.

:warning: If you **are using credentials** and your registry is on a different host than your UI, please read the [FAQ about OPTIONS](https://github.com/Joxit/docker-registry-ui#:~:text=Why%20OPTIONS%20(aka%20preflight%20requests)), all the linked issues and [distribution/distribution#4458](https://github.com/distribution/distribution/issues/4458) first. The best way for the UI to work is using `NGINX_PROXY_PASS_URL` or configure your own proxy (nginx, haproxy...) that will be on top of your **docker registry** (and not the UI!) to override OPTIONS requests.

If your docker registry **does not need credentials**, you will need to send this HEADER:

```yml
http:
  headers:
    Access-Control-Allow-Origin: ['*']
    Access-Control-Allow-Headers: ['Accept', 'Cache-Control']
    Access-Control-Allow-Methods: ['HEAD', 'GET', 'OPTIONS'] # Optional
```

If your docker registry need credentials, you will need to send these HEADERS (you must add the protocol `http`/`https` and the port when not default `80`/`443`):

```yml
http:
  headers:
    Access-Control-Allow-Origin: ['http://registry-ui.example.com']
    Access-Control-Allow-Credentials: [true]
    Access-Control-Allow-Headers: ['Authorization', 'Accept', 'Cache-Control']
    Access-Control-Allow-Methods: ['HEAD', 'GET', 'OPTIONS'] # Optional
```

An alternative for CORS issues is a plugin on your browser, more info [here](https://github.com/Joxit/docker-registry-ui/issues/25#issuecomment-621104846) (thank you [xmontero](https://github.com/xmontero)).

## Using delete

For deleting images, you need to activate the delete feature in the UI with `DELETE_IMAGES=true` and in your registry:

```yml
storage:
    delete:
      enabled: true
```

And you need to add these HEADERS:

```yml
http:
  headers:
    Access-Control-Allow-Methods: ['HEAD', 'GET', 'OPTIONS', 'DELETE']
    Access-Control-Allow-Headers: ['Authorization', 'Accept', 'Cache-Control']
    Access-Control-Expose-Headers: ['Docker-Content-Digest']
```

## Registry example

Example of docker registry configuration file:

```yml
version: 0.1
log:
  fields:
    service: registry
storage:
  delete:
    enabled: true
  cache:
    blobdescriptor: inmemory
  filesystem:
    rootdirectory: /var/lib/registry
http:
  addr: :5000
  headers:
    X-Content-Type-Options: [nosniff]
    Access-Control-Allow-Origin: ['http://127.0.0.1:8000']
    Access-Control-Allow-Methods: ['HEAD', 'GET', 'OPTIONS', 'DELETE']
    Access-Control-Allow-Headers: ['Authorization', 'Accept', 'Cache-Control']
    Access-Control-Max-Age: [1728000]
    Access-Control-Allow-Credentials: [true]
    Access-Control-Expose-Headers: ['Docker-Content-Digest']
auth:
  htpasswd:
    realm: basic-realm
    path: /etc/docker/registry/htpasswd
```

## Standalone Application

If you do not want to install the docker-registry-ui on your server, you may
check out the [Electron](examples/electron/README.md) standalone application (not updated, and not tested with this interface).

## All examples

The examples use the upstream image. Replace it with your local build to use this interface.

- [Use docker-registry-ui as a proxy (use REGISTRY_URL)](https://github.com/Joxit/docker-registry-ui/tree/main/examples/ui-as-proxy)
- [Use docker-registry-ui as standalone (use URL)](https://github.com/Joxit/docker-registry-ui/tree/main/examples/ui-as-standalone)
- [Use docker-registry-ui with traefik](https://github.com/Joxit/docker-registry-ui/tree/main/examples/traefik)
- [Use docker-registry-ui with docker registry and Amazon s3](https://github.com/Joxit/docker-registry-ui/tree/main/examples/issue-75) ([#75](https://github.com/Joxit/docker-registry-ui/issues/75))
- [FIX revproxy to registry does not work when published under non-root url](https://github.com/Joxit/docker-registry-ui/tree/main/examples/issue-73) ([#73](https://github.com/Joxit/docker-registry-ui/issues/73))
- [Use docker-registry-ui with HTTPS](https://github.com/Joxit/docker-registry-ui/tree/main/examples/issue-20) ([#20](https://github.com/Joxit/docker-registry-ui/issues/20))
- [Unable to push image when docker-registry-ui is used as a proxy on non 80 port](https://github.com/Joxit/docker-registry-ui/tree/main/examples/issue-88) ([#88](https://github.com/Joxit/docker-registry-ui/issues/88))
- [Add custom headers bases on environment variable and/or file when the ui is used as proxy](https://github.com/Joxit/docker-registry-ui/tree/main/examples/proxy-headers) ([#89](https://github.com/Joxit/docker-registry-ui/pull/89))
- [UI showing same sha256 content digest for all tags + Delete is not working](https://github.com/Joxit/docker-registry-ui/tree/main/examples/issue-116) ([#116](https://github.com/Joxit/docker-registry-ui/issues/116))
- [Electron-based Standalone Application](https://github.com/Joxit/docker-registry-ui/tree/main/examples/electron) ([#129](https://github.com/Joxit/docker-registry-ui/pull/129))
- [Use docker-registry-ui as proxy with read-only right](https://github.com/Joxit/docker-registry-ui/tree/main/examples/read-only-auth) ([#47](https://github.com/Joxit/docker-registry-ui/issues/47))
- [Use DEFAULT_REGISTRIES and READ_ONLY_REGISTRIES](https://github.com/Joxit/docker-registry-ui/tree/main/examples/pr-219) ([#219](https://github.com/Joxit/docker-registry-ui/issues/219))

## Development

See the [Development section of CONTRIBUTING.md](CONTRIBUTING.md#development) to run the interface on your computer, run the tests, and build the Docker image.
