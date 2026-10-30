# FAQ

- [What is the difference between `SINGLE_REGISTRY=false` and `SINGLE_REGISTRY=true`?](#what-is-the-difference-between-single_registryfalse-and-single_registrytrue)
- [Why is an image still in the UI after I delete all its tags?](#why-is-an-image-still-in-the-ui-after-i-delete-all-its-tags)
- [Why is the image size in the UI not the same as in `docker images`?](#why-is-the-image-size-in-the-ui-not-the-same-as-in-docker-images)
- [Can I use HTTPS on the UI?](#can-i-use-https-on-the-ui)
- [Does the UI support authentication?](#does-the-ui-support-authentication)
- [Can I use the UI and the Docker client with an insecure registry?](#can-i-use-the-ui-and-the-docker-client-with-an-insecure-registry)
- [What does the Mixed Content error mean?](#what-does-the-mixed-content-error-mean)
- [Why is the default nginx `Host` header `$http_host`?](#why-is-the-default-nginx-host-header-http_host)
- [Why do OPTIONS and DELETE requests fail with a 401 status code?](#why-do-options-and-delete-requests-fail-with-a-401-status-code)
- [I deleted images in the UI, but they are still on the server. How do I remove them?](#i-deleted-images-in-the-ui-but-they-are-still-on-the-server-how-do-i-remove-them)
- [Why does a delete remove all the tags with the same digest?](#why-does-a-delete-remove-all-the-tags-with-the-same-digest)
- [Can I run the container as an unprivileged user?](#can-i-run-the-container-as-an-unprivileged-user)
- [Can I use the UI with a Docker Hub mirror and show `library/*` images?](#can-i-use-the-ui-with-a-docker-hub-mirror-and-show-library-images)
- [How do I fix a CORS issue on an S3 bucket?](#how-do-i-fix-a-cors-issue-on-an-s3-bucket)
- [Why does my registry return the error `pagination number invalid`?](#why-does-my-registry-return-the-error-pagination-number-invalid)
- [The UI cannot connect to a registry that I recreated. What can I do?](#the-ui-cannot-connect-to-a-registry-that-i-recreated-what-can-i-do)

## What is the difference between `SINGLE_REGISTRY=false` and `SINGLE_REGISTRY=true`?

With `SINGLE_REGISTRY=false`, a menu at the top of the sidebar lets you add, remove, and change registries. With `SINGLE_REGISTRY=true`, the UI uses one registry and does not show the menu.

## Why is an image still in the UI after I delete all its tags?

This is a limitation of the registry. The garbage collector does not remove empty repositories. To remove them, delete their folders in the registry data (see [#77](https://github.com/Joxit/docker-registry-ui/issues/77)).

## Why is the image size in the UI not the same as in `docker images`?

The UI shows the compressed size of the image, not the extracted size.

## Can I use HTTPS on the UI?

Yes. Put your reverse proxy in front of the UI. The reverse proxy handles the HTTPS connection (see [Deployment](deployment.md#https)).

## Does the UI support authentication?

Yes. The UI uses your browser for basic authentication. It also supports token authentication (see the [Keycloak example](../examples/token-auth-keycloak/)).

## Can I use the UI and the Docker client with an insecure registry?

Yes, for a registry URL without HTTPS. Configure your Docker client first (see [#76](https://github.com/Joxit/docker-registry-ui/issues/76)).

## What does the Mixed Content error mean?

Your UI uses HTTPS and your registry uses HTTP. A page that uses HTTPS cannot load HTTP content. Use HTTPS on your registry, or use `NGINX_PROXY_PASS_URL`.

## Why is the default nginx `Host` header `$http_host`?

This fixes the issue [#88](https://github.com/Joxit/docker-registry-ui/issues/88). For more, see [#113](https://github.com/Joxit/docker-registry-ui/issues/113).

## Why do OPTIONS and DELETE requests fail with a 401 status code?

This also explains why the UI asks you to check your `Access-Control-Allow-Origin` header when you use basic authentication.

The registry returns a 401 status code on preflight (OPTIONS) requests. This breaks the [W3C preflight request specification](https://www.w3.org/TR/cors/#preflight-request). The registry maintainers will not fix it ([distribution/distribution#4458](https://github.com/distribution/distribution/issues/4458)).

Use one of these solutions:

- Put the UI on the same domain as your registry, for example `registry.example.com/ui/`.
- Use [`NGINX_PROXY_PASS_URL`](configuration.md#nginx-proxy).
- Put nginx, Apache, or HAProxy in front of your registry, and return 200 on each OPTIONS request.

See [#104](https://github.com/Joxit/docker-registry-ui/issues/104), [#204](https://github.com/Joxit/docker-registry-ui/issues/204), [#207](https://github.com/Joxit/docker-registry-ui/issues/207), [#214](https://github.com/Joxit/docker-registry-ui/issues/214), [#266](https://github.com/Joxit/docker-registry-ui/issues/266), and [#278](https://github.com/Joxit/docker-registry-ui/issues/278).

## I deleted images in the UI, but they are still on the server. How do I remove them?

A delete in the UI removes only the reference, not the content. To remove the unused content, run the registry garbage collector: `registry garbage-collect config.yml`, or `docker exec registry registry garbage-collect config.yml` (see [#77](https://github.com/Joxit/docker-registry-ui/issues/77) and [#147](https://github.com/Joxit/docker-registry-ui/issues/147)).

## Why does a delete remove all the tags with the same digest?

This is a limitation of the registry API. The only way to [delete an image](https://docs.docker.com/registry/spec/api/#deleting-an-image) is by its `name` and its `manifest` digest. So a delete removes all the tags of the image that have the same digest.

## Can I run the container as an unprivileged user?

Yes. Run the container as the `nginx` user with `--user nginx`. nginx then listens on port `8080` (see [Deployment](deployment.md#run-as-an-unprivileged-user), [#224](https://github.com/Joxit/docker-registry-ui/issues/224), and [#234](https://github.com/Joxit/docker-registry-ui/pull/234)).

## Can I use the UI with a Docker Hub mirror and show `library/*` images?

Yes, but you use two registry servers at your own risk. See [this comment on #155](https://github.com/Joxit/docker-registry-ui/issues/155#issuecomment-1286052124).

## How do I fix a CORS issue on an S3 bucket?

Add a CORS policy to your bucket (see [#193](https://github.com/Joxit/docker-registry-ui/issues/193)).

## Why does my registry return the error `pagination number invalid`?

Since version 2.8.2, the registry returns at most 1000 repositories in the catalog by default. If you have more, set `REGISTRY_CATALOG_MAXENTRIES` on the registry to a higher value (see [#306](https://github.com/Joxit/docker-registry-ui/issues/306)).

## The UI cannot connect to a registry that I recreated. What can I do?

This happens with `NGINX_PROXY_PASS_URL`. The nginx log shows `connect() failed (111: Connection refused) while connecting to upstream`.

nginx finds the IP address of the registry only once, when it starts. When you recreate the registry container, its IP address changes. To fix this, set [`NGINX_RESOLVER`](configuration.md#nginx-proxy) to `127.0.0.11`.

Need more help? Try the [examples](examples.md).
