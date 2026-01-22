// Script de prueba para los analizadores de email
// Ejecutar en consola del navegador: import('./services/analyzers/test-analyzers.js')

import { EmailAnalyzerFactory } from './EmailAnalyzerFactory.js';

/**
 * Prueba los analizadores con datos de ejemplo
 */
async function testAnalyzers() {
    console.log('🧪 Iniciando pruebas de analizadores...');

    // Configuración de prueba
    const testConfig = {
        useOpenAI: true,
        openaiApiKey: window.CONFIG?.ai?.openaiApiKey || 'test-key',
        useRegex: true
    };

    // Crear analizador
    const analyzer = EmailAnalyzerFactory.create(testConfig);
    console.log('✅ Analizador creado:', analyzer.constructor.name);

    // Email de prueba con contenido "sucio"
    const testEmail = {
        id: 'test-123',
        subject: 'Notificación de pago - Mercado Pago',
        body: `
        <style>
        .header { display: none !important; }
        body { font-family: 'Proxima Nova'; color: #333; }
        </style>

        <div class="header">
            ght text align right iortant Ya está disponible en
        </div>

        <p>Hola,</p>

        <p>Te informamos que se realizó un cargo a tu tarjeta por $63.00 MXN</p>
        <p>Concepto: Compra en Starbucks</p>
        <p>Fecha: 07/01/2026</p>

        <div style="display: none;">
            MessageViewBody,#MessageWebViewDiv
        </div>
        `,
        from: 'no-reply@mercadopago.com',
        date: '2026-01-07T21:44:19.000Z'
    };

    console.log('📧 Probando con email de ejemplo...');

    try {
        const result = await analyzer.analyzeEmail(testEmail);

        if (result) {
            console.log('✅ Resultado obtenido:');
            console.log('   Monto:', result.amount);
            console.log('   Descripción:', result.description);
            console.log('   Fuente:', result.source);
            console.log('   Tipo:', result.transaction_type);
            console.log('   Analizador usado:', result.analyzer_used || 'N/A');
        } else {
            console.log('❌ No se pudo analizar el email');
        }

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

// Función para probar solo regex
async function testRegexOnly() {
    console.log('🧪 Probando solo analizador regex...');

    const analyzer = EmailAnalyzerFactory.createRegexOnly();

    const testEmail = {
        id: 'test-regex',
        subject: 'Pago realizado',
        body: 'Se realizó un pago por $50.00 en tienda XYZ',
        from: 'banco@test.com',
        date: '2024-01-01T00:00:00Z'
    };

    const result = await analyzer.analyzeEmail(testEmail);
    console.log('Resultado regex:', result);
}

// Exponer funciones globalmente para pruebas en consola
window.testAnalyzers = testAnalyzers;
window.testRegexOnly = testRegexOnly;

console.log('🎯 Funciones de prueba disponibles:');
console.log('   testAnalyzers() - Prueba analizadores completos');
console.log('   testRegexOnly() - Prueba solo regex');

// Ejecutar prueba automática si se carga el script
if (window.CONFIG?.ai?.openaiApiKey) {
    console.log('🔄 Ejecutando prueba automática...');
    testAnalyzers();
} else {
    console.log('⚠️ No hay API key configurada. Ejecuta testRegexOnly() para probar regex únicamente.');
}