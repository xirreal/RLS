import { modules, themes } from './parseRepos.js';
import { config } from '../../config.js';

export default [
  {
    meta: {
      name: config.repo.modules.name,
      description: config.repo.modules.description,
    },

    filename: 'modules',
    modules: modules
  },

  {
    meta: {
      name: config.repo.themes.name,
      description: config.repo.themes.description,
    },

    filename: 'themes',
    modules: themes
  }
];