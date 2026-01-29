require('dotenv').config({path: '.env.local'});
const admin = require('firebase-admin');

const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCvlrQkSoF9xdXC
btpQIipwihvXZMkNTEB2VRsraJM3ziuBOWC64w7y5MDbvF2MGhmwZBH8BUevNxhR
SrcAWlTPSxRc8K76KxsdUWmB3MspT8Kwn1FIV3MECYAKmuC4tP+BQYrT1eOiTvSj
tf82UUqCtT22TFejQChO71kB2nzM3Zn0CkhuaSbv5ZPiXIaUNuSyv4V/tFjHC2Fd
jFJs9Eet9OaOyddS+BvW94eYMrbMawmRH3/5epiHb4J3tkJ4SRVPnxPT+0VwBDf1
eG/y00BjLhXnlhbDMPDk7L4JQ6/ozkHoCWI2Qwyz4ICDL9Uirs7NCOKzcOPOzspR
xJvVeRFFAgMBAAECggEAGOVlEt02iYr+sUQO87w4aL8ITgzF/frxC+YqxUedUhUL
MZYdWzo9AR8ColVNrUL5H/u8Wg+0l4kYC1Ss6GGmc0LZtwjQQnvQqyJDM6zG6Itc
1zarq3ZswiaHr1lA4ieVr7HHmZwS281Wngy8zCqQBkLk5l9iMK002eZRaDQerFxF
/AHDIRqxbWFbi1taoTq/srY0LjMBkb5kDoG5GVj8/PVD8nYo3XggTmTeQKCO+RF5
PQvsU4bumDgLjbNbHtlSc6d6dq77BfVRlSJD4uIyewEM3JByyNOiNa0HChW5RJR0
pYl7OeUXjCXqdMP1Pb3v+PunZmI/5qyPkmW8SWuWMQKBgQDlYPfx8yhp65TiPzaP
BiWx7mFR/S2zv2niSziKwnmd8CAqkv37Wcz/w2K+z1DLmYTJ+VVWjPbnHboQUpqG
YlAZlzr27AkZNpUC4cEDdrWOz0s6V6heIXunNE/4rcIjcyqx/847ABd4Qyi6R9NG
/LUasv9yHX4RIp+fpCdsgCD5FQKBgQDD95ZaV5SrBliWyLjiP+6qpPa/ZZfugVca
gPPsm7sO9gvdORzI6YNwzjLxpCgpQ98gDgBpNACpogDF/jXgpxC+XhBfNsuQFlqi
JCk7Sl2V4nGVU+AMAPF9eZ3KjewBW+FrR6O33Y3mYXTOALldFV1kwqb1j5ZYE/Hj
m42yYjhjcQKBgQDgmCPuyjImFD/BkDexr0k1gb3U89vOBnx80T5Zz7YZSUeVqDv7
4p/xRrTnNENeN8FnqjU+++O9xMOsu9UGBDl99TANGmyGPYWGPtootBFt9dcpFy+K
i6pxu60aR7ix0VBa3ahm6N4SKWA1laJv/Xyu2dl5ORt5V7eILslTWdnvSQKBgCI/
GWJuXcfJkx++sjivzYi6zXhDS9rddZhnIrmduYHy0730ZihiTpsfHd4GvxH/D3Yt
nDrGYLtEWXhAZa/94joyfA/3pnlmvq4JPb9jzpkL+qeLAeN3Iry3zTCBvtW59dnm
qiDOsiapr1z02W//9NNQBRdy4WZBDguluoyLB6mxAoGAZ92lAEVN9Mk+dOC7wdsJ
krYVCeIJ2+hSDkcrE0+CQ93KEvpDvteWjmIBKw6O4HIEnXFrZXVm+7pEwcKM4Fcg
65YYhiuLqPUYYghNw7PowVCjgA3S62pD/RXp0/4jEWhnZ44TvKPSll6dbecjJ8pZ
sqHgicBe+GZjAAMJIQ+cXlY=
-----END PRIVATE KEY-----`;

const serviceAccount = {
  projectId: 'pharmacare-dfa3c',
  clientEmail: 'firebase-adminsdk-fbsvc@pharmacare-dfa3c.iam.gserviceaccount.com',
  privateKey: privateKey
};

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();

// Beállítjuk a legutóbbi kép URL-t az egyik usernek
const testImageUrl = 'https://res.cloudinary.com/dyoq9pcdx/image/upload/v1769695336/profiles/r5qe3rnawpouvwenyyxi.png';

// sVTPWBZm0XVMHXZanrOP6dH5Bha2 - Epres Bettina
db.collection('users').doc('sVTPWBZm0XVMHXZanrOP6dH5Bha2').update({
  photoURL: testImageUrl
}).then(() => {
  console.log('photoURL beallitva Epres Bettina usernek!');
  console.log('URL:', testImageUrl);
  process.exit(0);
}).catch(err => {
  console.error('Hiba:', err);
  process.exit(1);
});
