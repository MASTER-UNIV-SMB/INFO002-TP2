import * as PImage from "pureimage"
import * as fs from 'fs';
import {Bitmap} from "pureimage/types/bitmap";
import {FontRecord} from "pureimage/types/text";
const { createCanvas, loadImage, registerFont } = require('canvas');
import {promisify} from "util";
import * as crypto from "crypto";

const { readPrivateKey } = require('crypto-io-utils');

const FONT_PATH = __dirname + '/fonts/sans.ttf';
const CERT_PRIVATE_CERT = fs.readFileSync(__dirname + '/certs/certificat.pem');
const CERT_PRIVATE_KEY = fs.readFileSync(__dirname + '/certs/certificat.key');

// @ts-ignore
const CUSTOM_FONT: FontRecord = PImage.registerFont(__dirname + '/fonts/sans.ttf','Sans');

function hideMessage(img: Bitmap, l: number, bytes: Uint8Array): Bitmap {
    const len_bytes = bytes.byteLength;
    if(img.width < 32) throw new Error("Image trop petite");

    console.debug("Longueur envoyé : " + len_bytes);

    for(let i = img.width * l; i < img.width * l + 32; i++) {
        const y = Math.floor(i / img.width);
        const x = i % img.width;

        const pixelsBuffer: ArrayBuffer = img.getPixelRGBA_separate(x, y);
        const pixels = new Uint8Array(pixelsBuffer);

        let r = pixels[0];
        let g = pixels[1];
        let b = pixels[2];

        r = r >> 1;
        r = r << 1;
        r = r ^ ((len_bytes >> i) & 1)
    }

    let index_my_bytes = 0
    for (let i = img.width * (300 + l); i < img.width * (300 + l) + len_bytes * 8; i = i + 8) {
        let temps = bytes[index_my_bytes];
        console.debug(`${img.width * (300 + l)}/${img.width * (300 + l) + len_bytes * 8}`);
        for (let j = 0; j < 8; j++) {
            const x = Math.round((i + j) / img.width);
            const y = Math.round((i + j) % img.width);

            const pixelsBuffer: ArrayBuffer = img.getPixelRGBA_separate(x, y);
            const pixels = new Uint8Array(pixelsBuffer);

            let r = pixels[0];
            r = r >> 1;
            r = r << 1;
            r = r ^ ((len_bytes >> j) & 1)

            img.setPixelRGBA_i(x, y, r, pixels[1], pixels[2], 255);
        }
        index_my_bytes++;
    }

    return img;
}

function addText(img: Bitmap, text: string, x: number, y: number, size: number, color: string): Bitmap {
    const ctx = img.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = `${size}px Sans`;
    ctx.fillText(text, x, y);
    return img;
}

function showMessage(img: Bitmap, l: any){
    const pixels = img.data;
    let my_bytes = Buffer.alloc(0);
    let longeur_bytes = 0;
    let h = 0;

    for (let t = img.width * l * 4; t < img.width * l * 4 + 32 * 4; t += 4) {
        const x = Math.floor((t / 4) % img.width);
        const r = pixels[t];
        h = (r & 1) << x;
        longeur_bytes += h;
    }

    console.log("longeur recue :", longeur_bytes);

    for (let t = img.width * (300 + l) * 4; t < img.width * (300 + l) * 4 + longeur_bytes * 8; t += 8) {
        let temp = 0;
        for (let m = 0; m < 8; m++) {
            const x = Math.floor((t / 4 + m) % img.width);
            const r = pixels[t + m * 4];
            h = (r & 1) << m;
            temp += h;
        }
        my_bytes = Buffer.concat([my_bytes, Buffer.from([temp])]);
    }

    return my_bytes;
}


async function verify(img: Bitmap): Promise<string> {
    const ciphertext = showMessage(img, 0);
    const enc_session_key = showMessage(img, 3);
    const tag = showMessage(img, 6);
    const nonce = showMessage(img, 9);

    // Decrypt the session key with the private RSA key
    const session_key = crypto.privateDecrypt(
        {
            key: CERT_PRIVATE_KEY,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        enc_session_key
    );

    const decipher = crypto.createDecipheriv('aes-256-gcm', session_key, nonce);
    decipher.setAuthTag(tag);

    const data = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return data.toString('utf8');
}


async function main(filename: string, text: string, output: string){
    const GEN = true;
    let data = '';

    if (GEN) {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });
        fs.writeFileSync('private.pem', privateKey.export());
        fs.writeFileSync('public.pem', publicKey.export());
    }

    data += text + '\n';
    const img = await PImage.decodePNGFromStream(fs.createReadStream(filename));
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const at = 'Diplôme';
    text += ' à réussi la formation';
    registerFont(FONT_PATH, { family: 'sans' });
    ctx.font = '80px sans';
    const { width: w, height: h } = ctx.measureText(at);
    ctx.fillStyle = '#000';
    ctx.fillText(
        at,
        (img.width / 2) - (w / 2),
        (img.height / 2) - h - 40
    );
    const at2 = 'master informatique';
    ctx.font = '34px sans';

    const { width: w2, height: h2 } = ctx.measureText(at2);
    ctx.fillStyle = '#EEE';
    ctx.fillText(
        at2,
        (img.width / 2) - (w2 / 2),
        img.height / 2
    );

    let mention = '';
    mention += (Math.random() * (20.00 - 15.00) + 15.00).toFixed(2);
    data += at2 + '\n' + mention + '\nNIHCAMCURT';
    console.log(data);
    const at3 = 'avec une';
    ctx.font = '34px sans';

    const { width: w3, height: h3 } = ctx.measureText(at3);
    ctx.fillStyle = '#EEE';
    ctx.fillText(
        at3,
        (img.width / 2) - (w3 / 2),
        (img.height / 2) + h3 + 40
    );

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(output, buffer);
}

main('assets/diplome-BG.png', 'Haris Coliche aka Chef', 'assets/diplome-exercice-2.png');
