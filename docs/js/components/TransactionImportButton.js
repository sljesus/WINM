// Componente del botón de importación de transacciones
// Principio SOLID: Single Responsibility - Solo maneja la UI de importación
// Principio KISS: Simple y directo

import { importTransactionsFromGmail, isImportInProgress } from '../services/transactionImportService.js';

/**
 * Crea el componente del botón de importación de transacciones
 * @param {Function} onImportComplete - Callback cuando la importación se complete
 * @param {Function} onImportError - Callback cuando haya un error
 * @returns {HTMLElement} Elemento del botón
 */
export function createTransactionImportButton(onImportComplete = null, onImportError = null) {
    // Contenedor principal
    const container = document.createElement('div');
    container.className = 'transaction-import-container';

    // Botón de importación
    const importButton = document.createElement('button');
    importButton.className = 'btn btn-primary transaction-import-btn';
    importButton.innerHTML = `
        <span class="btn-icon">📧</span>
        <span class="btn-text">Importar Transacciones</span>
    `;

    // Estado de carga
    const loadingState = document.createElement('div');
    loadingState.className = 'import-loading-state hidden';
    loadingState.innerHTML = `
        <div class="loading-spinner"></div>
        <span class="loading-text">Importando transacciones...</span>
    `;

    // Mensajes de progreso
    const progressMessages = document.createElement('div');
    progressMessages.className = 'import-progress-messages hidden';

    // Mensaje de resultado
    const resultMessage = document.createElement('div');
    resultMessage.className = 'import-result-message hidden';

    // Agregar elementos al contenedor
    container.appendChild(importButton);
    container.appendChild(loadingState);
    container.appendChild(progressMessages);
    container.appendChild(resultMessage);

    // Estado interno
    let isImporting = false;

    /**
     * Actualiza el estado del botón
     * @param {boolean} importing - Si está importando
     */
    function updateButtonState(importing) {
        isImporting = importing;

        if (importing) {
            importButton.disabled = true;
            importButton.classList.add('btn-disabled');
            importButton.innerHTML = `
                <span class="btn-icon">⏳</span>
                <span class="btn-text">Importando...</span>
            `;

            loadingState.classList.remove('hidden');
            progressMessages.classList.remove('hidden');
            resultMessage.classList.add('hidden');
        } else {
            importButton.disabled = false;
            importButton.classList.remove('btn-disabled');
            importButton.innerHTML = `
                <span class="btn-icon">📧</span>
                <span class="btn-text">Importar Transacciones</span>
            `;

            loadingState.classList.add('hidden');
            progressMessages.classList.add('hidden');
        }
    }

    /**
     * Muestra mensaje de progreso
     * @param {string} message - Mensaje a mostrar
     * @param {Object} data - Datos adicionales
     */
    function showProgressMessage(message, data = {}) {
        const messageElement = document.createElement('div');
        messageElement.className = 'progress-message';
        messageElement.textContent = message;

        // Agregar datos adicionales si existen
        if (data && Object.keys(data).length > 0) {
            const dataElement = document.createElement('div');
            dataElement.className = 'progress-data';
            dataElement.textContent = JSON.stringify(data, null, 2);
            messageElement.appendChild(dataElement);
        }

        // Mantener solo los últimos 5 mensajes
        while (progressMessages.children.length >= 5) {
            progressMessages.removeChild(progressMessages.firstChild);
        }

        progressMessages.appendChild(messageElement);
        progressMessages.scrollTop = progressMessages.scrollHeight;
    }

    /**
     * Muestra mensaje de resultado
     * @param {Object} result - Resultado de la importación
     * @param {boolean} isError - Si es un error
     */
    function showResultMessage(result, isError = false) {
        resultMessage.className = `import-result-message ${isError ? 'error' : 'success'}`;
        resultMessage.classList.remove('hidden');

        if (isError) {
            resultMessage.innerHTML = `
                <div class="result-icon">❌</div>
                <div class="result-text">Error: ${result.message || 'Error desconocido'}</div>
            `;
        } else {
            resultMessage.innerHTML = `
                <div class="result-icon">✅</div>
                <div class="result-text">
                    Importación completada:<br>
                    ${result.emailsFound || 0} emails encontrados<br>
                    ${result.transactionsImported || 0} transacciones importadas
                </div>
            `;
        }

        // Ocultar automáticamente después de 10 segundos
        setTimeout(() => {
            resultMessage.classList.add('hidden');
        }, 10000);
    }

    /**
     * Maneja el clic del botón de importación
     */
    async function handleImportClick() {
        if (isImporting) {
            return; // Ya está importando
        }

        try {
            updateButtonState(true);
            progressMessages.innerHTML = ''; // Limpiar mensajes anteriores

            showProgressMessage('Iniciando importación de transacciones...');

            // Ejecutar importación
            const result = await importTransactionsFromGmail(
                {
                    daysBack: 7,
                    maxEmails: 50,
                    skipDuplicates: true
                },
                showProgressMessage, // Progress callback
                (errorMessage, error) => { // Error callback
                    showProgressMessage(`Error: ${errorMessage}`, { error: error?.message });
                }
            );

            // Mostrar resultado exitoso
            showResultMessage(result, false);

            // Llamar callback de éxito
            if (onImportComplete) {
                onImportComplete(result);
            }

        } catch (error) {
            console.error('Error en importación:', error);
            showResultMessage({ message: error.message || 'Error desconocido' }, true);

            // Llamar callback de error
            if (onImportError) {
                onImportError(error);
            }
        } finally {
            updateButtonState(false);
        }
    }

    // Event listener
    importButton.addEventListener('click', handleImportClick);

    // Verificar estado inicial
    if (isImportInProgress()) {
        updateButtonState(true);
    }

    return container;
}

/**
 * Función de conveniencia para agregar el botón a un contenedor
 * @param {string|HTMLElement} container - Contenedor donde agregar el botón
 * @param {Function} onImportComplete - Callback de éxito
 * @param {Function} onImportError - Callback de error
 * @returns {HTMLElement} El botón creado
 */
export function addTransactionImportButton(container, onImportComplete = null, onImportError = null) {
    const containerElement = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    if (!containerElement) {
        console.error('Contenedor no encontrado:', container);
        return null;
    }

    const importButton = createTransactionImportButton(onImportComplete, onImportError);
    containerElement.appendChild(importButton);

    return importButton;
}