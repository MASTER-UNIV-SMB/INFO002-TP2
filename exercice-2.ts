import * as PImage from "pureimage"
import * as fs from 'fs';
import {registerFont} from "pureimage";
import {Bitmap} from "pureimage/types/bitmap";
import {FontRecord} from "pureimage/types/text";
import * as crypto from "crypto";
import QRCode from "qrcode";
import {createCanvas} from "canvas";

const FONT_PATH = __dirname + '/fonts/sans.ttf';
const FONT_2_PATH = __dirname + '/fonts/mono.ttf';
const FONT_3_PATH = __dirname + '/fonts/sdiplome.ttf';

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


async function verify(imgPath: string): Promise<string> {
    const img = await PImage.decodePNGFromStream(fs.createReadStream(imgPath));

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


async function main(filename: string, text: string, output: string) {
    const font = registerFont(FONT_PATH, 'sans', 400, 'normal', 'normal');
    const font2 = registerFont(FONT_2_PATH, 'mono', 400, 'normal', 'normal');
    const font3 = registerFont(FONT_3_PATH, 'sdiplome', 400, 'normal', 'normal');

    const {publicKey, privateKey} = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
    });
    fs.writeFileSync('certs/private.pem', privateKey.export({type: 'pkcs1', format: 'pem'}));
    fs.writeFileSync('certs/public.pem', publicKey.export({type: 'spki', format: 'pem'}));

    const session_key = crypto.randomBytes(32);
    const iv = new Buffer(crypto.randomBytes(12));

    font.load(() => {
        font2.load(() => {
            font3.load(async () => {
                let data = '';
                data += text + '\n';
                const img = await PImage.decodePNGFromStream(fs.createReadStream(filename));
                const img2 = await PImage.decodePNGFromStream(fs.createReadStream(filename));

                const ctx = img.getContext('2d');

                const at = 'Diplôme';
                text += ' à réussi la formation';
                ctx.fillStyle = '#000000';
                ctx.font = '80px sdiplome';
                const {width: w} = ctx.measureText(at);
                ctx.fillStyle = '#000000';
                ctx.fillText(
                    at,
                    (img.width / 2) - (w / 2),
                    (img.height / 2) - 40
                );
                const at2 = 'master informatique';
                ctx.font = '34px sdiplome';

                const {width: w2} = ctx.measureText(at2);
                ctx.fillStyle = '#000000';
                ctx.fillText(
                    at2,
                    (img.width / 2) - (w2 / 2),
                    img.height / 2
                );

                const {width: w10} = ctx.measureText(text);
                ctx.fillStyle = '#000000';
                ctx.fillText(
                    text,
                    (img.width / 2) - (w10 / 2),
                    img.height / 2 + 50
                );

                let mention = '';
                mention += (Math.random() * (20.00 - 15.00) + 15.00).toFixed(2);
                data += at2 + '\n' + mention + '\nNIHCAMCURT';
                console.log(data);
                const at3 = 'avec une moyenne de ' + mention + '/20';
                ctx.font = '17px mono';
                const {width: w12} = ctx.measureText(at3);
                ctx.fillStyle = '#000000';
                ctx.fillText(
                    at3,
                    (img.width / 2) - (w12 / 2),
                    (img.height / 2) + 80
                );

                // QRCode
                const qrCodeCanvas = createCanvas(80, 80);
                QRCode.toCanvas(
                    qrCodeCanvas,
                    data,
                    {
                        margin: 0,
                        color: {
                            dark: "#000000",
                            light: "#ffffff",
                        },
                    }
                );
                const qrCodeImg = await PImage.decodePNGFromStream(qrCodeCanvas.createPNGStream());
                ctx.drawImage(qrCodeImg, 0, 0, 132, 132, 20, 20, 70, 70);

                // -------
                var encrypted = crypto.publicEncrypt(publicKey, session_key);

                const tab = encrypted.toString('hex').match(/.{2}/g);
                const t = [];
                for (let i = 0; i < tab.length; i += 8) {
                    t.push(tab.slice(i, i + 8).join(''));
                }

                ctx.fillStyle = 'black';
                ctx.font = '15px mono';
                const x = img.width / 2;
                // @ts-ignore
                const y = img.height / 2 - 4 * (ctx.measureText('M').height);
                for (let i = 0; i < t.length; i++) {
                    const w = ctx.measureText(t[i]).width;
                    // @ts-ignore
                    const h = ctx.measureText('M').height;
                    ctx.fillText(t[i], x - w / 2, y + i * h - h / 2);
                }

                ctx.fillStyle = 'black';
                ctx.font = '20px mono';
                // @ts-ignore
                ctx.fillText(iv.toString('hex'), x - ctx.measureText(iv.toString('hex')).width / 2, y + 4 * ctx.measureText('M').height - ctx.measureText('M').height / 2);

                const cipher = crypto.createCipheriv('aes-256-gcm', session_key, iv);
                const ciphertext = Buffer.concat([cipher.update(data, 'utf-8'), cipher.final()]);
                const tag = cipher.getAuthTag();

                hideMessage(img, 0, ciphertext);
                hideMessage(img, 3, session_key);
                hideMessage(img, 6, tag);
                hideMessage(img, 9, iv);

                for (let x = 0; x < img.width; x++) {
                    for (let y = 0; y < img.height; y++) {
                        const pixel1 = img.getPixelRGBA(x, y);
                        const pixel2 = img2.getPixelRGBA(x, y);

                        if (pixel1 !== pixel2) {
                            img2.setPixelRGBA(x, y, 0xff0000ff);
                        }
                    }
                }

                PImage.encodePNGToStream(img, fs.createWriteStream(output)).then(()=>{
                    console.log("Image écrite vers : ", output)
                    PImage.encodePNGToStream(img2, fs.createWriteStream("assets/diplome-exercice-2-diff.png")).then(()=>{
                        console.log("Image diff écrite vers : ", output)
                        test();
                    })
                })

            });
        });
    });
}

function test(){
    verify("assets/diplome-exercice-2.png");
}

main("assets/diplome-BG.png", "Haris Coliche","assets/diplome-exercice-2.png");
