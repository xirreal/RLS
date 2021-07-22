import { repos } from '../../config.js';

if(!repos.length) {
    console.error("No repos configured.");
    process.exit(1);
}

const modules = repos.filter(modules => modules.type === "module");
const themes = repos.filter(themes => themes.type === "theme");

export { modules, themes };