# Examples

The [`examples`](../examples/) directory has ready-to-run setups.

> [!NOTE]
> The examples use the upstream image `joxit/docker-registry-ui`, which has the original interface. To use this interface, [build the image](deployment.md#build-the-image) and replace the image name with `docker-registry-ui:local`.

| Example | What it shows |
| --- | --- |
| [ui-as-proxy](../examples/ui-as-proxy/) | The UI as a proxy to the registry, with `NGINX_PROXY_PASS_URL` |
| [ui-as-standalone](../examples/ui-as-standalone/) | The UI and the registry on different ports, with `REGISTRY_URL` |
| [pr-219](../examples/pr-219/) | More than one registry, with `DEFAULT_REGISTRIES` and `READ_ONLY_REGISTRIES` ([#219](https://github.com/Joxit/docker-registry-ui/pull/219)) |
| [proxy-headers](../examples/proxy-headers/) | Custom headers on the proxy requests, from environment variables and a file ([#89](https://github.com/Joxit/docker-registry-ui/pull/89)) |
| [read-only-auth](../examples/read-only-auth/) | A proxy with a read-only user and a read-write user ([#47](https://github.com/Joxit/docker-registry-ui/issues/47)) |
| [token-auth-keycloak](../examples/token-auth-keycloak/) | Token authentication with Keycloak |
| [issue-20](../examples/issue-20/) | HTTPS on the UI ([#20](https://github.com/Joxit/docker-registry-ui/issues/20)) |
| [issue-73](../examples/issue-73/) | The UI behind a reverse proxy, on a path other than `/` ([#73](https://github.com/Joxit/docker-registry-ui/issues/73)) |
| [issue-75](../examples/issue-75/) | A registry with Amazon S3 storage ([#75](https://github.com/Joxit/docker-registry-ui/issues/75)) |
| [issue-88](../examples/issue-88/) | Pushing images when the UI is a proxy on a port other than 80 ([#88](https://github.com/Joxit/docker-registry-ui/issues/88)) |
| [issue-116](../examples/issue-116/) | A registry with basic authentication and deletes ([#116](https://github.com/Joxit/docker-registry-ui/issues/116)) |
| [traefik](../examples/traefik/) | The UI behind Traefik, with Docker Swarm |
| [kubernetes](../examples/kubernetes/) | The registry and the UI on Kubernetes |

To fill a test registry with a few `alpine` tags, run [`examples/populate-registry`](../examples/populate-registry) with the registry address, for example `examples/populate-registry localhost:5000`.

The upstream project also has a [Helm chart](https://helm.joxit.dev/). It installs the upstream image.
