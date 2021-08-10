import * as openpgp from 'openpgp';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { questionNewPassword as getPassphrase } from 'readline-sync';

export default async (name, path, content, pgp) => {

    if(!pgp.hasInit) {
        try {
            pgp.hasInit = true;
            pgp.publicKey  = readFileSync(pgp.publicKey,  "utf-8");
            pgp.privateKey = readFileSync(pgp.privateKey, "utf-8");
            pgp.passphrase = readFileSync(pgp.passphrase, "utf-8");
        } catch(e) {};
    }

    if(typeof(pgp.passphrase) === "undefined") {
        console.log(`[PGP] Passphrase required to sign "${name}".`);
        pgp.passphrase = getPassphrase('[PGP] Enter passphrase: ', {
            confirmMessage: "[PGP] Input the passphrase again to confirm: ",
            unmatchMessage: "[PGP] The passphrases do not match. Press ENTER to type a new passphrase.",
            min: 0,
            max: 128
        });
    }

    try {
        const publicKey = await openpgp.readKey({ armoredKey: pgp.publicKey });

        const privateKey = pgp.passphrase == "" ? await openpgp.readPrivateKey({ armoredKey: pgp.privateKey }) : await openpgp.decryptKey({
            privateKey: await openpgp.readPrivateKey({ armoredKey: pgp.privateKey }),
            passphrase: pgp.passphrase
        });

        const message = await openpgp.createMessage({ text: content });
        const detachedSignature = await openpgp.sign({
            message, // Message object
            signingKeys: privateKey,
            detached: true
        });

        console.log(`[PGP] Signed "${name}", verifying signature...`);

        const signature = await openpgp.readSignature({
            armoredSignature: detachedSignature // parse detached signature
        });
        const verificationResult = await openpgp.verify({
            message, // Message object
            signature,
            verificationKeys: publicKey
        });
        const { verified, keyID } = verificationResult.signatures[0];
        await verified; // throws on invalid signature
        console.log(`[PGP] "${name}.sig" verified. Key ID: ${keyID.toHex()}`);
        writeFileSync(path + ".sig", detachedSignature);
    } catch (e) {
        console.error('[PGP] Signing failed: ' + e.message);
        return;
    }
};