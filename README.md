# RLS - Repo Live Server

Bundler and webserver to host GooseMod repos.
Supports live updating using GitHub webhooks.

# Features over ms2builder

- Easier setup, only a single configuration file.
- Built in webserver, no additional setup needed.
- Automatic updates when a webhook event is received
    - When a webhook event is received it will trigger a full rebuild, updating modules from other repos too.
- No commit hash freezing. (Less safe, RCE risk when not using trusted repos.)

## Usage

To get this working you'll need to:

1. Install [Node 15 or newer](https://nodejs.org/) and install [git](https://git-scm.com/).
2. [Get your own GitHub Personal Access Token](https://docs.github.com/en/articles/creating-a-personal-access-token-for-the-command-line).
3. [Get a Discord bot token](https://discord.com/developers).
4. Choose a secret for your webhooks.
5. Configure `config.js`.
    - You'll need to add some modules and add the tokens.
6. (Optional) Setup a webhook on your repo.
    - Use the secret you used in the config file (`config.js`).
    - Set `Content type` to `application/json`
    - Set the URL accordingly to what you configured in the `config.js` file. (Default value: `http://example.com:4456/api/github/webhooks`)
7. To run, simply do `npm run server`

> Note: For full functionality you'll need to install "ImageMagick" since it's used to generate the images to show on the website. ms2builder requirement.

# Available `npm scripts`

1. `npm run server`, main script used to start RLS.
2. `npm run check <repoName>`, used to check if a Powercord Plugin can be ported to GooseMod.
3. `npm run clonegm`, clones GooseMod, required for using PC Compat Check.
4. `npm run updategm`, updates GooseMod.
