import { config, modules } from '../../config.js';

if(!config.repos.length) {
    console.error("No repos configured.");
    process.exit(1);
}

const repos = [];
config.repos.forEach(repo => {
    repos.push({
        meta: {
            name: repo.name,
            description: repo.description,
          },
      
          filename: repo.repoId,
          modules: (modules.filter(module => module.targetRepo == repo.repoId))
    });
});

export default repos;