import * as PImage from "pureimage"
import * as fs from 'fs';
import {Bitmap} from "pureimage/types/bitmap";
import {FontRecord} from "pureimage/types/text";

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

async function main(){

}

main();
