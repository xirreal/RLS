const config = {
    repo: {
        modules: {
            name: "RLS Modules",
            description: "Default RLS description."
        },
        themes: {
            name: "RLS themes",
            description: "Default RLS description."
        }
    },
    web: {
        name: "RLS Web preview",
        description: "Default RLS description."
    },
    webhook: {
        path: "/api/github/webhooks",
        port: "4456"
    }
};

/* Repo module template */
// type: "" // "module" or "theme" (must be lowercase)
// url: "", // Full url to repo (https://github.com/user/repo)
// subdir: "", // Subdirectory for modules if necessary, leave "" if not used.
// generateSettings: false, // Whether or not to auto generate settings for themes (true, false)
// preprocessor: "" // Autoport preprocessor (pcTheme, pcPlugin, bdTheme)

const repos = [

];

const tokens = {
    webhook: "",
    github: "",
    discord: ""
}

export { config, repos, tokens };
