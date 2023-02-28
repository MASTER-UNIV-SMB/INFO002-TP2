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

    for (let j = 0; m < img.height; j++) {
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

async function main() {
    const diplomeImage = await PImage.decodePNGFromStream(fs.createReadStream("assets/diplome-BG.png"));

    // Exercice 1
    const bitmap = invertLine(diplomeImage);
    const out = fs.createWriteStream("assets/diplome-BG-inverted.png");
    await PImage.encodePNGToStream(bitmap, out);

    // Exercice 2
    const bitmap2 = invertHalf(diplomeImage);
    const out2 = fs.createWriteStream("assets/diplome-BG-half-inverted.png");
    await PImage.encodePNGToStream(bitmap2, out2);
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
