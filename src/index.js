import ModuleRepos from './modules/index.js';

import AutoTag from './autoTag.js';
import ImageCDN from './imageCdn.js';
import AuthorGen from './authorGen.js';
import SiteGen from './siteGen/index.js';
import pgpSign from './pgpSign.js';

import Parcel from 'parcel-bundler';
import axios from 'axios';

import { exec } from 'child_process';

import { rmSync, mkdirSync, readFileSync, writeFileSync, existsSync, readFile } from 'fs';
import { createHash } from 'crypto';

import { dirname, sep, join } from 'path';
import { fileURLToPath } from 'url';

import { config, modules, tokens } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const clonesDir = `${__dirname.replace(`${sep}src`, '')}/clones`;

const distDir = `${__dirname.replace(`${sep}src`, '')}/dist`;
global.distDir = distDir;

const modulesDir = `${distDir}/module`;

const resetDir = (dir) => {
    if(existsSync(dir)) 
        rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
};

// Cleanup old directories on boot
resetDir(clonesDir);
resetDir(distDir);
resetDir(modulesDir);

const parcelOptions = {
  minify: true,
  watch: false,
  sourceMaps: false,
  outDir: modulesDir,
  logLevel: 0
};

const githubCache = {};
const getGithubInfo = async (repo) => {
  if (githubCache[repo]) return githubCache[repo];

  const info = (await axios.get(`https://api.github.com/repos/${repo}`, {
    headers: {
      'Authorization': `token ${tokens.github}`
    }
  })).data;

  githubCache[repo] = info;
  return info;
};

const builtModules = new Map();
const previousManifests = new Map();

const generateDistForRepo = async (parentRepo) => {

    const pgp = config.repos.find(repo => repo.name == parentRepo.meta.name).pgp;

    let moduleJson = {
        modules: [],
        meta: parentRepo.meta
    };
    
    const repoJsonPath = `${distDir}/${parentRepo.filename}.json`;
    
    for (const repo of parentRepo.modules) {
        if(!repo.url) continue;

        const name = repo.url.split(`https://github.com/`).pop();
        const cloneDir = `${clonesDir}/${name}`;

        console.log("[Bundler] Building " + name.concat(repo.subdir))

        const previousBuildCommit = builtModules.get(name.concat(repo.subdir));

        if (existsSync(cloneDir) && previousBuildCommit) {

            process.chdir(cloneDir);
            await new Promise((res) => exec(`git pull`, res));
            
            const currentHash = await new Promise((res) => exec(`git rev-parse HEAD`, (err, stdout) => res(stdout.trim())));
    
            if (currentHash !== previousBuildCommit && currentHash !== '') rmSync(cloneDir, { recursive: true, force: true });
            else {
                console.log("[Bundler] Skipping " + name.concat(repo.subdir) + ". Already up to date.");
                const previousManifest = previousManifests.get(name.concat(repo.subdir));
                moduleJson.modules.push(previousManifest);
                continue;
            }
        }

        console.time("[Bundler] " + name.concat(repo.subdir));

        let githubInfo = getGithubInfo(name);

        process.chdir(distDir); // Incase current wd is broken, in which case exec / git crashes
    
        await new Promise((res) => exec(`git clone ${repo.url}.git ${cloneDir}`, res));
    
        process.chdir(cloneDir);

        const lastHash = await new Promise((res) => exec(`git rev-parse HEAD`, (err, stdout) => res(stdout.trim())));
        const commitTimestamp = await new Promise((res) => exec(`git log -1 --format="%at" | xargs -I{} date -d @{} +%s`, (err, stdout) => res(stdout.trim())));
    
        if (repo.preprocessor) {
            const preOut = await (await import(`./preprocessors/${repo.preprocessor}.js`)).default(`${cloneDir}${repo.subdir}`, repo);
    
            if (preOut !== undefined) {
                repo.subdir = preOut;
            }
        }
    
        const manifest = JSON.parse(readFileSync(`${cloneDir}${repo.subdir}/goosemodModule.json`));

        const outFile = `${manifest.name}.js`;
    
        const bundler = new Parcel(`${cloneDir}${repo.subdir}/${manifest.main}`, Object.assign(parcelOptions, {
            outFile
        }));
    
        const bundle = await bundler.bundle();
    
        const outPath = `${modulesDir}/${outFile}`;
        let jsCode = readFileSync(outPath, 'utf8');

        jsCode = jsCode.replace('typeof define&&define.amd?define(function(){return l}):', ''); // Stop letting Parcel try and use UMD/AMD define, breaks BD compat with modules
    
        jsCode = `${jsCode};parcelRequire('${bundle.entryAsset.basename}').default`; // Make eval return the index module's default export

    
        writeFileSync(outPath, jsCode);
    
        const jsHash = createHash('sha512').update(jsCode).digest('hex');
    
        githubInfo = await githubInfo; // GitHub info is gotten async during other stuff to reduce time
    
        const manifestJson = {
            name: manifest.name,
            description: manifest.description,
        
            version: manifest.version,
        
            tags: AutoTag(jsCode, manifest.tags),
        
            authors: manifest.authors,
        
            hash: jsHash,
        
            github: {
                stars: githubInfo.stargazers_count,
                repo: repo.url
            },
        
            lastUpdated: parseInt(commitTimestamp),

            ...repo.manifestOverrides
        };
    
        if (manifest.images) manifestJson.images = manifest.images;
        if (manifest.dependencies) manifestJson.dependencies = manifest.dependencies;
    
        manifestJson.images = await ImageCDN(manifestJson);
    
        if (Array.isArray(manifestJson.authors)) manifestJson.authors = await Promise.all(manifestJson.authors.map(async (x) => {
        if (x.match(/^[0-9]{17,18}$/)) {
            return await AuthorGen(x);
        }
    
        return x;
        }));
    
        moduleJson.modules.push(manifestJson);
        builtModules.set(name.concat(repo.subdir), lastHash);
        previousManifests.set(name.concat(repo.subdir), manifestJson);
    
        console.timeEnd("[Bundler] " + name.concat(repo.subdir));
    }
    
    moduleJson.modules = moduleJson.modules.filter((x) => x !== null);
    
    process.chdir(join(__dirname, ".."));
    writeFileSync(repoJsonPath, JSON.stringify(moduleJson));
    if(pgp) await pgpSign(`${parentRepo.filename}.json`, repoJsonPath, JSON.stringify(moduleJson), pgp);
}

for(const parentRepo of ModuleRepos) {
    await generateDistForRepo(parentRepo);
}
await SiteGen();

console.log("[Website] Deploying webservers...");

import http from "http";
if(tokens.webhook) {
    const { Webhooks, createNodeMiddleware} = await import("@octokit/webhooks");
    const webhooks = new Webhooks({ secret: tokens.webhook });
    webhooks.on("push", async ({ id, name, payload }) => {
        console.log("[Webhook] Received webhook message from " + payload.repository.full_name)
        const module = modules.find(module => module.url.split(`https://github.com/`).pop() == payload.repository.full_name);
        if(!module) return console.log("[Webhook] Repository not found in configuration file.");
        await generateDistForRepo(ModuleRepos.find(repo => repo.filename == module.targetRepo));
        await SiteGen();
    });

    http.createServer(createNodeMiddleware(webhooks, { path: config.webhook.path })).listen(config.webhook.port);
}
http.createServer((req, res) => {

    const ip = (req.headers['x-forwarded-for'] || '').split(',').pop().trim() || req.socket.remoteAddress || req.connection.remoteAddress;
    const URI = decodeURI(req.url);
    var query = URI.split('?').shift().replace(/\.\./g, '');
    if(query == "/") query += "index.html";
    const basedPath = `${distDir}${query}`;
  
    let contentType = 'text/plain';
  
    switch (query.split('.').pop()) {
      case 'js':
        contentType = 'text/javascript';
        break;
  
      case 'json':
        contentType = 'application/json';
        break;
      case 'html':
        contentType = 'text/html';
        break;
    }
  
    console.log("[Website]", ip + " requested:", query, contentType);
  
    readFile(basedPath, (err, content) => {
      if (err) {
          
        res.writeHead(400, { 'Content-Type': contentType });
        res.end('Request error', 'utf-8');
  
        return;
      }
  
      res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
      res.end(content, 'utf-8');
    });
  }).listen(config.web.port).on("listening", () => console.log("[Website] Done!"));