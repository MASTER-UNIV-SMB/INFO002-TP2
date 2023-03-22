const fs = require('fs');
const crypto = require('crypto');
const qrcode = require('qrcode');
const { createCanvas, loadImage, registerFont } = require('canvas');
const { privateEncrypt } = require('crypto').webcrypto;

