# Configuration

Configure the container with environment variables. The container writes the values into the interface when it starts, so you do not have to rebuild the image to change a setting.

- [Registry](#registry)
- [More than one registry](#more-than-one-registry)
- [Catalog](#catalog)
- [Tags](#tags)
- [nginx proxy](#nginx-proxy)
- [Theme](#theme)
- [Other](#other)

## Registry

| Variable | Default | Description |
| --- | --- | --- |
| `REGISTRY_URL` | The host of the UI | The URL of your registry, for example `http://registry.example.com`. Your browser must be able to reach it. You may need to [configure CORS](registry.md#cors) on the registry. |
| `REGISTRY_TITLE` | Derived from `REGISTRY_URL` | A custom title for the registry (see [#28](https://github.com/Joxit/docker-registry-ui/issues/28) and [#32](https://github.com/Joxit/docker-registry-ui/issues/32)). |
| `PULL_URL` | Derived from `REGISTRY_URL` | The registry address in the `docker pull` command that you copy (see [#71](https://github.com/Joxit/docker-registry-ui/issues/71)). |
| `SINGLE_REGISTRY` | `false` | Set to `true` to remove the registry menu. The menu adds, removes, and changes registries. |
| `REGISTRY_SECURED` | `false` | Set to `true` if your registry uses basic authentication. By default, the UI checks on every request if the registry is secured, and you see `401` responses in the browser console. With `true`, the UI sends half as many requests. |
| `USE_CONTROL_CACHE_HEADER` | `false` | Send the `Cache-Control: no-store, no-cache` header. This prevents some issues with multi-arch images (see [#260](https://github.com/Joxit/docker-registry-ui/issues/260) and [#265](https://github.com/Joxit/docker-registry-ui/pull/265)). The registry must allow `Cache-Control` in `Access-Control-Allow-Headers`. |

## More than one registry

These settings work only when `SINGLE_REGISTRY=false`. See the [pr-219 example](../examples/pr-219/).

| Variable | Default | Description |
| --- | --- | --- |
| `DEFAULT_REGISTRIES` | Empty | A comma-separated list of registry URLs, for example `http://registry.example.com,http://registry:5000` (see [#219](https://github.com/Joxit/docker-registry-ui/pull/219)). The UI uses this list when the browser has no saved registries. |
| `READ_ONLY_REGISTRIES` | `false` | Set to `true` to remove the dialogs that add and remove registries. The UI then always uses `DEFAULT_REGISTRIES` (see [#219](https://github.com/Joxit/docker-registry-ui/pull/219)). |

## Catalog

| Variable | Default | Description |
| --- | --- | --- |
| `CATALOG_ELEMENTS_LIMIT` | `1000` | The number of repositories to request per catalog page. The UI follows the `Link` header of the registry until it has the full catalog (see [#39](https://github.com/Joxit/docker-registry-ui/issues/39), [#127](https://github.com/Joxit/docker-registry-ui/pull/127), [#132](https://github.com/Joxit/docker-registry-ui/pull/132), and [#306](https://github.com/Joxit/docker-registry-ui/issues/306)). |
| `SHOW_CATALOG_NB_TAGS` | `false` | Show the number of tags of each repository, and hide repositories with no tags. The UI sends one more request per repository, so **do not use it on large registries** (see [#161](https://github.com/Joxit/docker-registry-ui/issues/161) and [#239](https://github.com/Joxit/docker-registry-ui/pull/239)). |
| `CATALOG_DEFAULT_EXPANDED` | `false` | Expand all namespaces in the sidebar by default (see [#302](https://github.com/Joxit/docker-registry-ui/issues/302)). |
| `CATALOG_MIN_BRANCHES` | `1` | The minimum number of namespace levels to group in the sidebar. In `joxit/docker-registry-ui`, `joxit/` is the namespace. Set both `CATALOG_MIN_BRANCHES` and `CATALOG_MAX_BRANCHES` to `0` to turn off grouping (see [#319](https://github.com/Joxit/docker-registry-ui/pull/319)). |
| `CATALOG_MAX_BRANCHES` | `1` | The maximum number of namespace levels to group in the sidebar. See `CATALOG_MIN_BRANCHES`. |

## Tags

| Variable | Default | Description |
| --- | --- | --- |
| `TAGLIST_ORDER` | `alpha-asc;num-desc` | The default order of the tag list. Use `num-asc;alpha-asc`, `num-desc;alpha-asc`, `num-asc;alpha-desc`, `num-desc;alpha-desc`, `alpha-asc;num-asc`, `alpha-asc;num-desc`, `alpha-desc;num-asc`, or `alpha-desc;num-desc` (see [#307](https://github.com/Joxit/docker-registry-ui/pull/307)). |
| `TAGLIST_PAGE_SIZE` | `100` | The number of tags on one page. |
| `SHOW_CONTENT_DIGEST` | `false` | Show the content digest in the tag list (see [#126](https://github.com/Joxit/docker-registry-ui/issues/126) and [#131](https://github.com/Joxit/docker-registry-ui/pull/131)). |
| `SHOW_TAG_HISTORY` | `true` | Set to `false` to remove the links from the tag list to the tag pages. |
| `HISTORY_CUSTOM_LABELS` | Empty | A comma-separated list of image labels to show in the **Overview** tab of the tag page, for example the maintainer label (see [#160](https://github.com/Joxit/docker-registry-ui/issues/160) and [#240](https://github.com/Joxit/docker-registry-ui/pull/240)). |
| `DELETE_IMAGES` | `false` | Set to `true` to delete tags from the UI. The registry must allow deletes too (see [Delete images](registry.md#delete-images)). |

## nginx proxy

With `NGINX_PROXY_PASS_URL`, the UI sends the registry requests to its own `/v2` path, and nginx forwards them to the registry. The browser and the registry then use the same origin, so you do not need CORS.

| Variable | Default | Description |
| --- | --- | --- |
| `NGINX_PROXY_PASS_URL` | Empty | The registry URL for the nginx `proxy_pass`. This is usually the name of the registry container, for example `http://registry:5000`. |
| `NGINX_PROXY_HEADER_*` | `NGINX_PROXY_HEADER_Host=$http_host` | Set custom headers on the requests to the registry. Put them in environment variables or in the file `/etc/nginx/.env`. Replace the hyphens in header names with underscores. Works only with `NGINX_PROXY_PASS_URL` (see [#89](https://github.com/Joxit/docker-registry-ui/pull/89) and the [proxy-headers example](../examples/proxy-headers/)). |
| `NGINX_PROXY_PASS_HEADER_*` | Empty | Pass a registry response header to the browser that nginx hides by default (`proxy_pass_header`). The variable name sets the header, for example `NGINX_PROXY_PASS_HEADER_X_Custom` for `X-Custom`. Put them in environment variables or in `/etc/nginx/.env`. Works only with `NGINX_PROXY_PASS_URL` (see [#206](https://github.com/Joxit/docker-registry-ui/issues/206)). |
| `NGINX_LISTEN_PORT` | `80` as root, `8080` otherwise | The port nginx listens on. To run the container as the unprivileged `nginx` user, see [Deployment](deployment.md#run-as-an-unprivileged-user) (see [#224](https://github.com/Joxit/docker-registry-ui/issues/224) and [#234](https://github.com/Joxit/docker-registry-ui/pull/234)). |
| `NGINX_RESOLVER` | Empty | Add a [`resolver`](http://nginx.org/en/docs/http/ngx_http_core_module.html#resolver) directive, so nginx finds the registry again when its IP address changes. On a Docker network, use `127.0.0.11`. You can also set your own DNS server with a `valid` time. You do not need it on Kubernetes (see [#333](https://github.com/Joxit/docker-registry-ui/issues/333) and [#339](https://github.com/Joxit/docker-registry-ui/issues/339)). |

## Theme

| Variable | Default | Description |
| --- | --- | --- |
| `THEME` | `auto` | The default theme: `light`, `dark`, or `auto`. With `auto`, the UI follows the system theme. A button at the bottom of the sidebar switches between light and dark (see [#283](https://github.com/Joxit/docker-registry-ui/pull/283) and [#291](https://github.com/Joxit/docker-registry-ui/pull/291)). |

### Theme colors

Each color applies to both the light and the dark theme (see [#283](https://github.com/Joxit/docker-registry-ui/pull/283)).

| Variable | What it colors | Light default | Dark default |
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

## Other

| Variable | Default | Description |
| --- | --- | --- |
| `DOCKER_REGISTRY_UI_TITLE` | `Docker Registry UI` | The title at the top of the sidebar and in the browser tab. |
| `ENABLE_VERSION_NOTIFICATION` | Not used | This interface accepts the setting and ignores it. In the original interface, it shows a notification when a new version is available. |
