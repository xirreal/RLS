const config = {
    repos: [
        {
            name: "RLS Modules",
            description: "Default RLS description.",
            repoId: "modules",
            pgp: {
                privateKey: `./keys/private.key`,
                publicKey: `./keys/public.key`,
                /* Not suggested, enter the passphrase on first startup instead! */
                // Define as an empty string to disable passphrase check
                //passphrase: `./keys/passphrase.key`
            }
        },
        {
            name: "RLS themes",
            description: "Default RLS description.",
            repoId: "themes"
        }
    ],
    web: {
        name: "RLS Web preview",
        description: "Default RLS description.",
        port: "80"
    },
    webhook: {
        path: "/webhooks",
        port: "4456"
    }
};

const modules = [
    {   /* Module template */
        // [Required] means value must not be undefined.
        targetRepo: "", // [Required] Must be a repo id.
        url: "", // [Required] Full url to repo (https://github.com/user/repo)
        subdir: "", // [Required] Subdirectory for modules if necessary, leave "" if not used.
        generateSettings: false, // Whether or not to auto generate settings for themes (true, false)
        preprocessor: "", // Autoport preprocessor (pcTheme, pcPlugin, bdTheme)
        manifestOverrides : {} // Overrides for the manifest of autoports
    }
];

const tokens = {
    webhook: process.env.WEBHOOK, // Webhook secret
    github: process.env.GH_PAT, // GH Private Access Token
    discord: process.env.DISCORD // Discord bot token
}

export { config, modules, tokens };
