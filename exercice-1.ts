import * as PImage from "pureimage";
import * as fs from "fs";
import {Bitmap} from "pureimage/types/bitmap";

function invertLine(img: Bitmap): Bitmap {
    const m = Math.round(img.height / 2);

    for (let i = 0; i < img.width; i++) {
        const pixelsBuffer: ArrayBuffer = img.getPixelRGBA_separate(i, m);
        const pixels = new Uint8Array(pixelsBuffer);

        const r = pixels[0] ^ 0b11111111;
        const g = pixels[1] ^ 0b11111111;
        const b = pixels[2] ^ 0b11111111;

        img.setPixelRGBA_i(i, m, r, g, b, 255);
    }

    return img;
}

function invertHalf(img: Bitmap): Bitmap {
    const m = Math.round(img.height / 2);

    for (let j = m; j < img.height; j++) {
        for (let i = 0; i < img.width; i++) {
            const pixelsBuffer: ArrayBuffer = img.getPixelRGBA_separate(i, j);
            const pixels = new Uint8Array(pixelsBuffer);

            const r = pixels[0] ^ 0b11111111;
            const g = pixels[1] ^ 0b11111111;
            const b = pixels[2] ^ 0b11111111;

            img.setPixelRGBA_i(i, j, r, g, b, 255);
        }
    }

    return img;
}

function hideMessage(img: Bitmap, img2: Bitmap, message: string): {img: Bitmap, img2: Bitmap} {
    if(img.width < 32) throw new Error("Image trop petite");

    console.debug("Longueur envoyé : " + message);

    const bytes = new Uint8Array(img.data);

    for(let i = 0; i < 32; i++) {
        const pixelsBuffer: ArrayBuffer = img.getPixelRGBA_separate(i, 0);
        const pixels = new Uint8Array(pixelsBuffer);
        const bytes_len = pixels.length;

        let r = pixels[0];
        let g = pixels[1];
        let b = pixels[2];

        r = r >> 1;
        r = r << 1;
        r = r ^ ((bytes_len >> i) & 1)

        img.setPixelRGBA_i(i, 0, r, g, b, 255);
        if (r !== (r ^ bytes.byteLength >> i & 1)) img2.setPixelRGBA_i(i, 0, 255, 0, 0, 255);
    }


    for(let i = 32; i < bytes.length * 8 + 32; i = i + 8) {
        let temp = bytes[(i-32)/8];
        console.debug(`${i}/${bytes.length * 8 + 32}`);
        for(let j = 0; j < 8; j++) {
            let y = Math.round((i + j) / img.width);
            let x = Math.round((i + j) % img.width);

            const pixelsBuffer: ArrayBuffer = img.getPixelRGBA_separate(x, y);
            const pixels = new Uint8Array(pixelsBuffer);

            let r = pixels[0];
            let g = pixels[1];
            let b = pixels[2];

            r = r >> 1;
            r = r << 1;
            r = r ^ ((temp >> i) & 1)

            img.setPixelRGBA_i(i, 0, r, g, b, 255);
            if (r !== (r ^ bytes.byteLength >> j & 1)) img2.setPixelRGBA_i(i, 0, 255, 0, 0, 255);
        }
    }

    return {img, img2};
}

function showMessage(img: Bitmap): string{
    let bytes_len = 0;
    let bytes: Uint8Array;

    for (let i = 0; i < 32; i++) {
        const pixelsBuffer: ArrayBuffer = img.getPixelRGBA_separate(i, 0);
        const pixels = new Uint8Array(pixelsBuffer);

        const r = pixels[0];

        const a = (r & 1) << i;
        bytes_len += a;
    }

    console.debug("Longueur reçu : " + bytes_len)

    bytes = new Uint8Array(bytes_len);

    for(let i = 32; i < bytes_len * 8 + 32; i = i + 8) {
        let temp = 0;
        console.debug(`${i}/${bytes_len * 8 + 32}`);
        for(let j = 0; j < 8; j++) {
            let y = Math.round((i + j) / img.width);
            let x = Math.round((i + j) % img.width);

            const pixelsBuffer: ArrayBuffer = img.getPixelRGBA_separate(x, y);
            const pixels = new Uint8Array(pixelsBuffer);

            let r = pixels[0];

            const a = (r & 1) << j;
            temp += a;
        }
        bytes[i/8] = temp;
    }

    return new TextDecoder().decode(bytes);
}

async function main() {
    const diplomeImage = await PImage.decodePNGFromStream(fs.createReadStream("assets/diplome-BG.png"));
    const mamadouImage = await PImage.decodePNGFromStream(fs.createReadStream("assets/mamadou.png"));

    console.debug ("Exercice : Inversion de la ligne du milieu...")
    const bitmap = invertLine(diplomeImage);
    const out = fs.createWriteStream("assets/diplome-BG-inverted.png");
    await PImage.encodePNGToStream(bitmap, out);
    console.debug("Exercice 1 : OK")

    console.debug("Exercice 1 : Inversion de la moitié de l'image...")
    const bitmap2 = invertHalf(diplomeImage);
    const out2 = fs.createWriteStream("assets/diplome-BG-half-inverted.png");
    await PImage.encodePNGToStream(bitmap2, out2);
    console.debug("Exercice 1 : OK")

    console.debug("Exercice 1 : Inversion de la moitié de l'image...")
    const bitmap3 = invertHalf(mamadouImage);
    const out3 = fs.createWriteStream("assets/mamadou-BG-half-inverted.png");
    await PImage.encodePNGToStream(bitmap3, out3);
    console.debug("Exercice 1 : OK")

    console.debug("Exercice 1 : Cacher un élément dans une image...")
    /*const {img, img2} = hideMessage(diplomeImage, mamadouImage, "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod\n" +
        "tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,\n" +
        "quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo\n" +
        "consequat.  Duis aute irure dolor in reprehenderit in voluptate velit esse\n" +
        "cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non\n" +
        "proident, sunt in culpa qui officia deserunt mollit anim id est laborum.");
    const out4 = fs.createWriteStream("assets/diplome-message-cache.png");
    await PImage.encodePNGToStream(img, out4);
    const out5 = fs.createWriteStream("assets/diplome-message-cache-diff.png");
    await PImage.encodePNGToStream(img2, out5);*/
    console.debug("Exercice 1 : OK")

    console.debug("Exercice 1 : Afficher un texte caché dans une image...");
    const secretImage = await PImage.decodePNGFromStream(fs.createReadStream("assets/diplome-message-cache-diff.png"));
    const text = showMessage(secretImage);
    console.debug("Exercice 1 : Texte caché" + text)
}

main()

// function hideMessage (img1: any, img2: any, message: string){
//     let pixels = img.load()
//
// }


/**
 * def hide_message(img, img2, message):
 *     pixels = img.load()
 *     pixels2 = img2.load()
 *     my_bytes = bytes(message, 'utf-8')
 *     print(message)
 *     longeur_bytes = len(my_bytes)
 *     if(img.width < 32):
 *         print("l'image est trop petite pour tout encoder")
 *         sys.exit(1)
 *     if(longeur_bytes*8 > (img.width * img.height - 32)):
 *         print("l'image est trop petite pour tout encoder")
 *         sys.exit(1)
 *     print("longeur envoyé:", longeur_bytes)
 *     for t in range(0, 32):
 *         r, g, b = pixels[t, 0]
 *         r = r >> 1
 *         r = r << 1
 *         r = r ^ ((longeur_bytes >> t) & 1)
 *         pixels[t, 0] = r, g, b
 *         if (r != r ^ longeur_bytes >> t & 1):
 *             pixels2[t, 0] = 255, 0, 0
 *
 *     for t in range(32, longeur_bytes*8+32, 8):
 *         temp = my_bytes[(t-32)//8]
 *         for m in range(8):
 *             y = (t+m) // img.width
 *             x = (t+m) % img.width
 *             r, g, b = pixels[x, y]
 *             r = r >> 1
 *             r = r << 1
 *             r = r ^ ((temp >> m) & 1)
 *             pixels[x, y] = r, g, b
 *             if (r != r ^ ((temp >> m) & 1)):
 *                 pixels2[x, y] = 255, 0, 0
 */
