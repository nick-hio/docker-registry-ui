# Registry configuration

The UI runs in your browser and sends its requests to the registry from there. When the UI and the registry have different origins, the registry must send CORS headers.

> [!TIP]
> With [`NGINX_PROXY_PASS_URL`](configuration.md#nginx-proxy), the UI and the registry have the same origin, and you do not need CORS. This is the easiest setup.

## CORS

> [!WARNING]
> Before you open an issue about CORS, read the existing CORS issues first.
>
> If you **use credentials** and your registry is on a different host than your UI, first read [Why do OPTIONS and DELETE requests fail with a 401 status code?](faq.md#why-do-options-and-delete-requests-fail-with-a-401-status-code), the linked issues, and [distribution/distribution#4458](https://github.com/distribution/distribution/issues/4458). The best solution is `NGINX_PROXY_PASS_URL`. You can also put your own proxy (nginx, HAProxy, and so on) in front of your **registry** (not the UI) to answer the OPTIONS requests.

If your registry **does not need credentials**, send these headers:

```yml
http:
  headers:
    Access-Control-Allow-Origin: ['*']
    Access-Control-Allow-Headers: ['Accept', 'Cache-Control']
    Access-Control-Allow-Methods: ['HEAD', 'GET', 'OPTIONS'] # Optional
```

If your registry **needs credentials**, send these headers. Write the origin of the UI with its protocol (`http` or `https`), and with its port when it is not `80` or `443`:

```yml
http:
  headers:
    Access-Control-Allow-Origin: ['http://registry-ui.example.com']
    Access-Control-Allow-Credentials: [true]
    Access-Control-Allow-Headers: ['Authorization', 'Accept', 'Cache-Control']
    Access-Control-Allow-Methods: ['HEAD', 'GET', 'OPTIONS'] # Optional
```

Another option for CORS issues is a browser extension. See [this comment](https://github.com/Joxit/docker-registry-ui/issues/25#issuecomment-621104846) (thank you [xmontero](https://github.com/xmontero)).

## Delete images

To delete images, set `DELETE_IMAGES=true` on the UI, and turn on deletes in your registry:

```yml
storage:
  delete:
    enabled: true
```

Then add these headers:

```yml
http:
  headers:
    Access-Control-Allow-Methods: ['HEAD', 'GET', 'OPTIONS', 'DELETE']
    Access-Control-Allow-Headers: ['Authorization', 'Accept', 'Cache-Control']
    Access-Control-Expose-Headers: ['Docker-Content-Digest']
```

A delete removes only the reference to the image. To free the disk space, run the registry garbage collector (see the [FAQ](faq.md#i-deleted-images-in-the-ui-but-they-are-still-on-the-server-how-do-i-remove-them)).

## Full example

A registry configuration file with CORS, deletes, and basic authentication:

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
