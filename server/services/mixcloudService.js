/**
 * Mixcloud Service
 * Gestisce l'upload di episodi su Mixcloud
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();  // ← PRIMA RIGA! Carica .env subito
// Configurazione Mixcloud
const MIXCLOUD_API_URL = 'https://api.mixcloud.com';
const MIXCLOUD_USERNAME = process.env.MIXCLOUD_USERNAME || 'OnAirOnSite';
const MIXCLOUD_ACCESS_TOKEN = process.env.MIXCLOUD_ACCESS_TOKEN;
console.log('TOKEN USATO:', MIXCLOUD_ACCESS_TOKEN);
/**
 * Genera uno slug URL-friendly dal titolo
 */
const generateSlug = (title) => {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // rimuovi accenti
        .replace(/[^a-z0-9]+/g, '-')     // sostituisci non-alfanumerici con -
        .replace(/(^-|-$)/g, '')          // rimuovi - iniziali/finali
        .substring(0, 80);                 // limita lunghezza
};

/**
 * Scarica un'immagine da URL e la converte in buffer
 */
const downloadImage = async (imageUrl) => {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        console.error('Error downloading image:', error);
        return null;
    }
};

/**
 * Upload di un episodio su Mixcloud
 *
 * @param {Object} episode - Documento Episode con audioFile e opzionalmente image
 * @param {Object} show - Documento Show con image e tags (fallback)
 * @param {String} audioFilePath - Path del file audio locale (scaricato temporaneamente da B2)
 * @returns {Object} - { success, key, url, error }
 */
const uploadToMixcloud = async (episode, show, audioFilePath) => {
    if (!MIXCLOUD_ACCESS_TOKEN) {
        return { success: false, error: 'MIXCLOUD_ACCESS_TOKEN non configurato' };
    }

    // Verifica che sia stato fornito il path del file
    if (!audioFilePath) {
        return { success: false, error: 'Path del file audio non fornito' };
    }

    // Verifica che il file esista
    if (!fs.existsSync(audioFilePath)) {
        return { success: false, error: `File audio non trovato: ${audioFilePath}` };
    }

    console.log(`📁 File audio da caricare: ${audioFilePath}`);

    try {
        const FormData = (await import('form-data')).default;
        const axios = require('axios');
        const form = new FormData();

        // File MP3 - usa il path fornito
        const audioFileName = episode.audioFile?.filename || path.basename(audioFilePath) || 'episode.mp3';
        form.append('mp3', fs.createReadStream(audioFilePath), {
            filename: audioFileName,
            contentType: 'audio/mpeg'
        });

        console.log(`🎵 Caricamento audio: ${audioFileName}`);

        // Campi obbligatori
        form.append('name', episode.title);

        // Descrizione
        if (episode.description) {
            form.append('description', episode.description);
        }

        // Tags dallo show
        if (show.tags && show.tags.length > 0) {
            show.tags.slice(0, 5).forEach((tag, index) => {
                form.append(`tags-${index}-tag`, tag);
            });
        } else {
            // Tag di default se lo show non ne ha
            form.append('tags-0-tag', 'radio');
        }

        // Immagine: priorità episodio, fallback show
        // Con il nuovo sistema B2, le immagini sono su URL, non path locali
        let imageUrl = null;

        if (episode.image?.exists && episode.image.url) {
            console.log(`📷 Usando immagine episodio da URL: ${episode.image.url}`);
            imageUrl = episode.image.url;
        } else if (show.image?.url) {
            console.log(`📷 Usando immagine show da URL: ${show.image.url}`);
            imageUrl = show.image.url;
        }

        // Scarica e allega l'immagine se disponibile
        if (imageUrl) {
            const imageBuffer = await downloadImage(imageUrl);
            if (imageBuffer) {
                form.append('picture', imageBuffer, {
                    filename: 'cover.jpg',
                    contentType: 'image/jpeg'
                });
                console.log('✔ Immagine allegata al form');
            } else {
                console.warn('⚠️ Impossibile scaricare immagine, procedo senza');
            }
        }

        // Pubblica subito (non lasciare in draft)
        form.append('publish', '1');

        console.log(`📤 Uploading to Mixcloud: ${episode.title}`);

        const response = await axios.post(
            `${MIXCLOUD_API_URL}/upload/?access_token=${MIXCLOUD_ACCESS_TOKEN}`,
            form,
            {
                headers: form.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        console.log('✅ Response:', response.data);

        if (response.data.result?.key) {
            return {
                success: true,
                key: response.data.result.key,
                url: `https://www.mixcloud.com${response.data.result.key}`
            };
        } else {
            return {
                success: false,
                error: response.data.error?.message || 'Upload fallito'
            };
        }

    } catch (error) {
        console.error('❌ Errore:', error.response?.data || error.message);
        const errorMsg = error.response?.data?.error?.message || error.message || 'Errore upload';
        return { success: false, error: errorMsg };
    }
};


/**
 * Genera l'URL embed di Mixcloud
 *
 * @param {String} key - La key del cloudcast (es: /OnAirOnSite/episode-slug/)
 * @returns {String} - URL per l'iframe embed
 */
const getMixcloudEmbedUrl = (key) => {
    if (!key) return null;
    const encodedKey = encodeURIComponent(key);
    return `https://www.mixcloud.com/widget/iframe/?feed=${encodedKey}&hide_cover=1&light=1`;
};

/**
 * Genera il codice HTML dell'embed
 *
 * @param {String} key - La key del cloudcast
 * @returns {String} - Codice HTML iframe
 */
const getMixcloudEmbedHtml = (key) => {
    if (!key) return null;
    const embedUrl = getMixcloudEmbedUrl(key);
    return `<iframe width="100%" height="120" src="${embedUrl}" frameborder="0" allow="autoplay"></iframe>`;
};

/**
 * Verifica se un cloudcast esiste ed è disponibile
 *
 * @param {String} key - La key del cloudcast
 * @returns {Object} - { available, data }
 */
const checkCloudcastStatus = async (key) => {
    try {
        const response = await fetch(`${MIXCLOUD_API_URL}${key}`);
        if (response.ok) {
            const data = await response.json();
            return {
                available: true,
                data: {
                    name: data.name,
                    url: data.url,
                    pictures: data.pictures,
                    playCount: data.play_count
                }
            };
        }
        return { available: false };
    } catch (error) {
        return { available: false, error: error.message };
    }
};

module.exports = {
    uploadToMixcloud,
    getMixcloudEmbedUrl,
    getMixcloudEmbedHtml,
    checkCloudcastStatus,
    generateSlug,
    MIXCLOUD_USERNAME
};