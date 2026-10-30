import { DockerRegistryUIError } from './error';
export type RepositoryNode = string | { repo: string; images: RepositoryNode[] };
const ERROR_CODE = 'CATALOG_BRANCHING_CONFIGURATION';

const getRepositoryName = (split: string[], max: number) => {
  let repositoryName = '';
  for (let i = 0; i < Math.min(max, split.length - 1); i++) {
    repositoryName += `${split[i]}/`;
  }
  return repositoryName;
};

const getLatestRepository = (
  repo: Exclude<RepositoryNode, string>,
  repoName: string,
): Exclude<RepositoryNode, string> | undefined => {
  if (!repo.images) {
    return;
  }
  if (repo.repo === repoName) {
    return repo;
  }
  for (let i = 0; i < repo.images.length; i++) {
    const res =
      typeof repo.images[i] !== 'string'
        ? getLatestRepository(repo.images[i] as Exclude<RepositoryNode, string>, repoName)
        : undefined;
    if (res) {
      return res;
    }
  }

  if (repoName.startsWith(repo.repo)) {
    const newRepo: Exclude<RepositoryNode, string> = { repo: repoName, images: [] };
    repo.images.push(newRepo);
    return newRepo;
  }
};

const cleanInt = (n: number | string) => (n === '' ? 1 : parseInt(String(n)));

export const getBranching = (min: number | string = 1, max: number | string = 1) => {
  min = cleanInt(min);
  max = cleanInt(max);
  if (isNaN(min) || isNaN(max)) {
    throw new DockerRegistryUIError(`min and max must be integers: (min: ${min} and max: ${max}))`, ERROR_CODE);
  } else if (min > max) {
    throw new DockerRegistryUIError(`min must be inferior to max (min: ${min} <= max: ${max})`, ERROR_CODE);
  } else if (max < 0 || min < 0) {
    throw new DockerRegistryUIError(
      `min and max must be greater than equals to 0 (min: ${min} >= 0 and max: ${max} >= 0)`,
      ERROR_CODE,
    );
  }
  if (max == 1) {
    min = 1;
  }
  return (repositories: string[]) =>
    [...repositories].sort().reduce<RepositoryNode[]>(function (acc, image) {
      const split = image.split('/');
      if (split.length > (min as number) && (min as number) > 0) {
        const repoName = getRepositoryName(split, max as number);
        const last = acc[acc.length - 1];
        let repo = typeof last !== 'string' && last ? getLatestRepository(last, repoName) : undefined;
        if (!repo) {
          repo = {
            repo: repoName,
            images: [],
          };
          acc.push(repo);
        }
        repo.images.push(image);
        return acc;
      }
      acc.push(image);
      return acc;
    }, []);
};
