# How to contribute to Docker Registry UI

I ([Jones Magloire](https://joxit.dev/)) created the Docker Registry UI from scratch, but I can't succeed without contributions from community members like you! Contributions come in many different shapes and sizes. In this file we provide guidance around two of the most common types of contributions: opening issues and opening pull requests.

Please read also the [Code Of Conduct](https://github.com/Joxit/docker-registry-ui/blob/main/CODE_OF_CONDUCT.md).

## Submitting Issues

### Did you find a bug?

* **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/joxit/docker-registry-ui/issues).

* If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/joxit/docker-registry-ui/issues/new). Be sure to
  * Use the [**Bug Report Template**](https://github.com/Joxit/docker-registry-ui/issues/new?assignees=&labels=&template=bug_report.md&title=)
  * Include a **title and clear description**
  * Write as much relevant information as possible
  * Add your **full configuration** (Docker Registry UI **AND** Docker Server) or a **screenshots** demonstrating the expected behavior that is not occurring

## Submitting Pull Request

### Do you intend to add a new feature or change an existing one?

* Suggest your change in a new issue using the [**Feature Request Template**](https://github.com/Joxit/docker-registry-ui/issues/new?assignees=&labels=&template=feature_request.md&title=) and start writing code.

* Run the interface on your computer first with `npm run dev` (see [Development](#development)).

### Did you write a patch that fixes a bug?

* Open a new [GitHub pull request](https://github.com/Joxit/docker-registry-ui/compare) with the patch.

* Ensure the PR description clearly describes the problem and solution. Include the relevant issue number if applicable.

* Before submitting, please read the [Coding conventions](#coding-conventions) first.

### Did you fix whitespace, format code, or make a purely cosmetic patch?

Changes that are cosmetic in nature and do not add anything substantial to the stability, functionality, or testability of Docker Registry UI will generally not be accepted.

## Development

### Requirements

- Node.js 22.12 or later, and npm
- Docker, to build the image
- A Docker registry to browse. For a local one: `docker run -d -p 127.0.0.1:5000:5000 --name registry registry:3`

### Install and run

```bash
git clone https://github.com/nick-hio/docker-registry-ui.git
cd docker-registry-ui
npm install
REGISTRY_PROXY_URL=http://localhost:5000 npm run dev
```

Open <http://127.0.0.1:5173>. The development server forwards `/v2` requests to `REGISTRY_PROXY_URL`, so the registry needs no CORS configuration. Set `PORT` to use another port.

In development, the settings in `index.html` are unset, so the UI uses the default values. To try a setting, replace its placeholder in `index.html` for a moment, for example `data-delete-images="true"`. Do not commit that change: the Docker image replaces the placeholders with the environment variables when the container starts (`bin/90-docker-registry-ui.sh`).

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite development server with hot reload. `npm start` does the same. |
| `npm test` | Runs the tests with Vitest. |
| `npm run build` | Checks the types, then builds the static files to `dist/`. |
| `npm run format` | Formats the code with Prettier. |
| `docker build -t docker-registry-ui:local .` | Builds the Docker image. The build runs `npm run build` in a Node stage, so `dist/` is not committed. |

### Project layout

| Path | Contents |
| --- | --- |
| `src/App.tsx` | Application state, routes, the catalog page, and the repository page |
| `src/components/explorer-sidebar.tsx` | The sidebar: registry menu, repository filter, and namespace tree |
| `src/components/tag-page.tsx` | The tag page and its tabs |
| `src/components/ui/` | [shadcn/ui](https://ui.shadcn.com) components. Add more with `npx shadcn@latest add <component>`. |
| `src/lib/` | Registry client, manifest and image config parsing, routes, settings, and theme |
| `src/style.css` | Tailwind CSS, theme colors, and the application styles |
| `test/` | Vitest tests and registry fixtures |
| `nginx/`, `bin/` | nginx configuration and the container start script |

## Coding conventions

* I use prettier with custom preset, use `npm run format` before any PR

* I use [semver](https://semver.org/) for package versioning

* I use Github Actions for publishing docker images and releases

* I indent with two spaces

Thank you for your help! :heart:

[Joxit](https://joxit.dev/)
