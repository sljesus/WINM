// Servicio de Gmail API
// Principio SOLID: Responsabilidad única - Solo comunicación con Gmail API REST
// KISS: Usar fetch nativo, sin librerías adicionales

import { getGmailToken } from './gmailTokenService.js';

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

/**
 * Busca emails en Gmail usando query de búsqueda
 * @param {string} query - Query de búsqueda de Gmail (ej: "from:banco@bbva.com")
 * @param {number} maxResults - Número máximo de resultados (default: 50)
 * @param {string} pageToken - Token de paginación (opcional)
 * @returns {Promise<Object>} Objeto con messages y nextPageToken
 */
export async function searchBankEmails(query, maxResults = 50, pageToken = null) {
    try {
        const token = await getGmailToken();
        if (!token) {
            throw new Error('No hay token de Gmail disponible. Por favor, inicia sesión con Google.');
        }

        let url = `${GMAIL_API_BASE}/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
        if (pageToken) {
            url += `&pageToken=${encodeURIComponent(pageToken)}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Token de Gmail expirado. Por favor, inicia sesión nuevamente.');
            }
            throw new Error(`Error de Gmail API: ${response.status} ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log('🔍 Respuesta completa de Gmail API (searchBankEmails):', responseData);
        return responseData;
    } catch (error) {
        console.error('Error buscando emails:', error);
        throw error;
    }
}

/**
 * Obtiene el contenido completo de un email
 * @param {string} messageId - ID del mensaje de Gmail
 * @returns {Promise<Object>} Contenido del email con id, subject, from, date, body, snippet
 */
export async function getEmailContent(messageId) {
    try {
        const token = await getGmailToken();
        if (!token) {
            throw new Error('No hay token de Gmail disponible');
        }

        const url = `${GMAIL_API_BASE}/users/me/messages/${messageId}?format=full`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Token de Gmail expirado');
            }
            throw new Error(`Error obteniendo email: ${response.status}`);
        }

        const message = await response.json();
        console.log('📧 Mensaje completo RAW de Gmail API (getEmailContent):', message);

        // Extraer headers
        const headers = message.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const fromEmail = headers.find(h => h.name === 'From')?.value || '';
        const dateStr = headers.find(h => h.name === 'Date')?.value || '';

        // Extraer cuerpo del mensaje
        const body = extractBody(message.payload);

        return {
            id: messageId,
            subject: subject,
            from: fromEmail,
            date: dateStr,
            body: body,
            snippet: message.snippet || '',
            threadId: message.threadId || ''
        };
    } catch (error) {
        console.error(`Error obteniendo email ${messageId}:`, error);
        throw error;
    }
}

/**
 * Extrae el cuerpo del mensaje del payload de Gmail API
 * @param {Object} payload - Payload del mensaje de Gmail API
 * @returns {string} Cuerpo del mensaje como texto plano
 */
function extractBody(payload) {
    if (!payload) return '';

    // Si tiene parts (mensaje multipart)
    if (payload.parts && Array.isArray(payload.parts)) {
        for (const part of payload.parts) {
            // Buscar parte de texto plano primero
            if (part.mimeType === 'text/plain' && part.body?.data) {
                return decodeBase64(part.body.data);
            }
        }
        // Si no hay texto plano, buscar HTML
        for (const part of payload.parts) {
            if (part.mimeType === 'text/html' && part.body?.data) {
                // Extraer texto del HTML (simple)
                const html = decodeBase64(part.body.data);
                return extractTextFromHTML(html);
            }
        }
        // Si tiene sub-parts, buscar recursivamente
        for (const part of payload.parts) {
            if (part.parts && Array.isArray(part.parts)) {
                const body = extractBody(part);
                if (body) return body;
            }
        }
    }

    // Si es mensaje simple (sin parts)
    if (payload.body?.data) {
        if (payload.mimeType === 'text/plain') {
            return decodeBase64(payload.body.data);
        } else if (payload.mimeType === 'text/html') {
            const html = decodeBase64(payload.body.data);
            return extractTextFromHTML(html);
        }
    }

    return '';
}

/**
 * Decodifica base64url (formato usado por Gmail API)
 * @param {string} base64url - String en base64url
 * @returns {string} String decodificado
 */
function decodeBase64(base64url) {
    try {
        // Convertir base64url a base64 estándar
        let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        
        // Agregar padding si es necesario
        while (base64.length % 4) {
            base64 += '=';
        }

        // Decodificar
        const binaryString = atob(base64);
        
        // Convertir a UTF-8
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        return new TextDecoder('utf-8').decode(bytes);
    } catch (error) {
        console.error('Error decodificando base64:', error);
        return '';
    }
}

/**
 * Extrae texto plano de HTML (implementación simple)
 * @param {string} html - HTML a convertir
 * @returns {string} Texto plano extraído
 */
function extractTextFromHTML(html) {
    // Crear elemento temporal para extraer texto
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Obtener texto y limpiar espacios múltiples
    let text = tempDiv.textContent || tempDiv.innerText || '';
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
}

/**
 * Obtiene el mensaje completo RAW sin procesar (para análisis)
 * Similar a get_raw_message() en Python
 * @param {string} messageId - ID del mensaje de Gmail
 * @returns {Promise<Object>} Mensaje completo RAW de Gmail API
 */
export async function getRawMessage(messageId) {
    try {
        const token = await getGmailToken();
        if (!token) {
            throw new Error('No hay token de Gmail disponible');
        }

        const url = `${GMAIL_API_BASE}/users/me/messages/${messageId}?format=full`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Token de Gmail expirado');
            }
            throw new Error(`Error obteniendo mensaje raw: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error obteniendo mensaje raw ${messageId}:`, error);
        throw error;
    }
}

/**
 * Obtiene lista de emails con paginación
 * @param {string} query - Query de búsqueda
 * @param {number} maxResults - Máximo de resultados por página
 * @param {string} pageToken - Token de paginación (opcional)
 * @returns {Promise<Object>} Objeto con messages array y nextPageToken
 */
export async function getEmailList(query, maxResults = 50, pageToken = null) {
    return await searchBankEmails(query, maxResults, pageToken);
}
