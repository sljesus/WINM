// Aplicación principal de WINM
// JavaScript Vanilla - Sin frameworks
// Refactorizado para usar módulos (SOLID + KISS)

// Importar servicios
import { 
    getSupabaseClient, 
    checkSession, 
    signIn, 
    signInWithGoogle,
    signOut, 
    onAuthStateChange 
} from './services/supabaseService.js';

// Importar servicios de transacciones
import { 
    loadTransactions, 
    calculateStats,
    searchTransactions,
    getTransactionsByMonth
} from './services/transactionService.js';

// Importar componentes
import { createStatCard } from './components/StatCard.js';
import { createTransactionItem } from './components/TransactionItem.js';
import { createCategoryExpenseChart } from './components/CategoryExpenseChart.js';
import { createMonthlyTrendChart } from './components/MonthlyTrendChart.js';
import { createTopCategoriesChart } from './components/TopCategoriesChart.js';
import { createTransactionFilters, getCurrentFilters } from './components/TransactionFilters.js';
import { initCategoryModal, showCategoryModal } from './components/CategoryModal.js';

// Importar utilidades de fecha
import { getMonthStart, getMonthEnd } from './utils/dateFormatter.js';

// Importar utilidades de moneda (NUEVO)
import { formatCurrency } from './utils/currencyFormatter.js';

// Importar servicios de gráficos
import { 
    getCategoryExpensesData, 
    getMonthlyTrendsData, 
    getTopCategoriesData 
} from './services/chartDataService.js';

// Importar servicios de Supabase
import { getCurrentUser } from './services/supabaseService.js';

// Importar servicios de presupuestos (NUEVO)
import { 
    loadBudgets, 
    createBudget, 
    updateBudget, 
    deleteBudget,
    loadBudgetAlerts,
    markAlertAsRead
} from './services/budgetService.js';

// Importar componentes de presupuestos (NUEVO)
import { createBudgetCard } from './components/BudgetCard.js';
import { initBudgetModal, showBudgetModal, hideBudgetModal } from './components/BudgetModal.js';

// Importar servicios de categorías (NUEVO)
import { 
    loadCategories, 
    createCategory, 
    updateCategory, 
    deleteCategory,
    getCategoryStats
} from './services/categoryService.js';

// Importar componentes de categorías (NUEVO)
import { createCategoryCard } from './components/CategoryCard.js';
import { initCategoryManagementModal, showCategoryManagementModal, hideCategoryManagementModal } from './components/CategoryManagementModal.js';

// Importar servicios de reglas (NUEVO)
import { 
    loadRules, 
    createRule, 
    updateRule, 
    deleteRule,
    toggleRuleActive
} from './services/ruleService.js';

// Importar componentes de reglas (NUEVO)
import { createRuleCard } from './components/RuleCard.js';
import { initRuleModal, showRuleModal, hideRuleModal } from './components/RuleModal.js';

// Importar componente de importación de transacciones (NUEVO)
import { addTransactionImportButton } from './components/TransactionImportButton.js';

// Importar servicio de importación automática (NUEVO)
import { importTransactionsFromGmail, isImportInProgress } from './services/transactionImportService.js';

// Estado de filtros
let currentFilters = {
    category: null,
    source: null,
    type: null,
    period: 'all',
    search: ''
};

// Transacciones cargadas (sin filtrar)
let allTransactions = [];

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Inicializar aplicación
 */
async function initializeApp() {
    console.log('🚀 Inicializando aplicación WINM...');

    try {
        // Verificar configuración (CONFIG está en window desde config.js)
        const config = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
        if (!config || !config.supabase || !config.supabase.url || !config.supabase.anonKey) {
            console.error('❌ Configuración incompleta de Supabase');
            showError('Configuración incompleta. Por favor, edita config.js con tus credenciales de Supabase.');
            return;
        }

        console.log('✅ Configuración de Supabase OK');

        // Inicializar cliente Supabase (singleton)
        getSupabaseClient();

        // Verificar sesión existente
        console.log('🔐 Verificando sesión de usuario...');
        const hasSession = await checkSession();
        console.log(`🔐 Sesión encontrada: ${hasSession}`);

        if (hasSession) {
            console.log('✅ Usuario autenticado, inicializando aplicación principal...');
            // Limpiar el hash de la URL si existe (por seguridad)
            if (window.location.hash) {
                window.history.replaceState(null, null, window.location.pathname);
            }
            showMainSection();
            // Inicializar modal de categorización
            await initCategoryModal(handleCategoryUpdated);
            // Inicializar modal de presupuestos (NUEVO)
            await initBudgetModal(handleBudgetUpdated);
            // Inicializar modal de gestión de categorías (NUEVO)
            await initCategoryManagementModal(handleCategoryManagementUpdated);
            // Inicializar modal de gestión de reglas (NUEVO)
            await initRuleModal(handleRuleUpdated);
            // Inicializar datos de la aplicación
            console.log('📊 Inicializando datos de la aplicación...');
            await initializeAppData();
            // Renderizar dashboard
            console.log('📈 Renderizando dashboard...');
            await renderDashboard();
        } else {
            console.log('❌ No hay sesión, mostrando pantalla de autenticación');
            showAuthSection();
        }

        // Configurar event listeners
        setupEventListeners();

        // Escuchar cambios de autenticación
        onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                console.log('👋 Usuario cerró sesión');
                showAuthSection();
            } else if (event === 'SIGNED_IN' && session) {
                console.log('✅ Usuario inició sesión');
                // Limpiar el hash de la URL después de la autenticación
                window.history.replaceState(null, null, window.location.pathname);
                showMainSection();
                await initializeAppData();
                await renderDashboard();
            }
        });

        console.log('✅ Inicialización de aplicación completada');
    } catch (error) {
        console.error('❌ Error inicializando aplicación:', error);
        console.error('Stack trace:', error.stack);
        showError('Error al inicializar la aplicación');
    }
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    // Botón de Google OAuth (nuevo método de autenticación)
    const googleSignInBtn = document.getElementById('google-signin-btn');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', handleGoogleSignIn);
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Navegación por tabs
    setupNavigation();

    // AGREGAR: Event listeners de presupuestos (NUEVO)
    const newBudgetBtn = document.getElementById('new-budget-btn');
    if (newBudgetBtn) {
        newBudgetBtn.addEventListener('click', () => {
            showBudgetModal(null);
        });
    }

    // AGREGAR: Event listeners de categorías (NUEVO)
    const newCategoryBtn = document.getElementById('new-category-btn');
    if (newCategoryBtn) {
        newCategoryBtn.addEventListener('click', () => {
            showCategoryManagementModal(null);
        });
    }

    // AGREGAR: Event listeners de reglas (NUEVO)
    const newRuleBtn = document.getElementById('new-rule-btn');
    if (newRuleBtn) {
        newRuleBtn.addEventListener('click', () => {
            showRuleModal(null);
        });
    }
}

/**
 * Configurar navegación por tabs
 */
function setupNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const sectionName = tab.getAttribute('data-section');
            switchSection(sectionName);
        });
    });
}

/**
 * Cambiar a una sección específica
 */
function switchSection(sectionName) {
    // Ocultar todas las secciones
    const allSections = document.querySelectorAll('.content-section');
    allSections.forEach(section => {
        section.classList.remove('active');
    });

    // Remover active de todos los tabs
    const allTabs = document.querySelectorAll('.nav-tab');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // Mostrar sección seleccionada
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Activar tab seleccionado
    const activeTab = document.querySelector(`.nav-tab[data-section="${sectionName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Cargar datos específicos de la sección si es necesario
    if (sectionName === 'dashboard') {
        // Renderizar dashboard si no está renderizado
        renderStats(allTransactions);
        renderCharts();
    } else if (sectionName === 'transactions') {
        // Las transacciones ya están cargadas, solo aplicar filtros
        const filteredTransactions = applyFilters(allTransactions);
        renderTransactions(filteredTransactions);
    } else if (sectionName === 'budgets') {
        renderBudgets();
        renderBudgetAlerts();
    } else if (sectionName === 'categories') {
        renderCategories();
    } else if (sectionName === 'rules') {
        renderRules();
    }
}

/**
 * Manejar login con Google OAuth
 */
async function handleGoogleSignIn() {
    const errorElement = document.getElementById('auth-error');
    errorElement.textContent = '';

    try {
        const { data, error } = await signInWithGoogle();
        
        if (error) throw error;
        
        // El redirect de OAuth manejará el resto del flujo
        // onAuthStateChange se encargará de inicializar la app cuando regrese
        // No necesitamos hacer nada más aquí, el flujo OAuth redirige automáticamente
    } catch (error) {
        errorElement.textContent = error.message || 'Error al iniciar sesión con Google';
        console.error('Error en login con Google:', error);
    }
}

/**
 * Manejar login con email y contraseña
 * @deprecated Usar handleGoogleSignIn() en su lugar. Mantenida para backward compatibility.
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('auth-error');

    try {
        const { data, error } = await signIn(email, password);

        if (error) throw error;

        // Login exitoso
        errorElement.textContent = '';
        showMainSection();
        // Inicializar datos de la aplicación
        await initializeAppData();
        // Renderizar dashboard
        await renderDashboard();
    } catch (error) {
        errorElement.textContent = error.message || 'Error al iniciar sesión';
        console.error('Error en login:', error);
    }
}

/**
 * Manejar logout
 */
async function handleLogout() {
    try {
        const { error } = await signOut();
        if (error) throw error;

        showAuthSection();
    } catch (error) {
        console.error('Error en logout:', error);
        alert('Error al cerrar sesión');
    }
}

/**
 * Mostrar sección de autenticación
 */
function showAuthSection() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('main-section').classList.add('hidden');
}

/**
 * Mostrar sección principal
 */
function showMainSection() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('main-section').classList.remove('hidden');
    // Activar dashboard por defecto
    switchSection('dashboard');
}

/**
 * Renderizar dashboard completo (solo stats y charts)
 */
async function renderDashboard() {
    try {
        // Cargar transacciones si no están cargadas
        if (allTransactions.length === 0) {
            allTransactions = await loadTransactions({ limit: 200 });
        }

        // Renderizar estadísticas (con todas las transacciones)
        renderStats(allTransactions);

        // Renderizar gráficos
        await renderCharts();

        // Agregar botón de importación de transacciones (NUEVO)
        await renderImportButton();
    } catch (error) {
        console.error('Error renderizando dashboard:', error);
    }
}

/**
 * Inicializar datos de la aplicación (cargar transacciones y configurar secciones)
 */
async function initializeAppData() {
    try {
        // Cargar transacciones
        allTransactions = await loadTransactions({ limit: 200 });

        // Renderizar filtros (para sección de transacciones)
        await renderFilters();

        // Configurar búsqueda
        setupSearch();

        // Renderizar transacciones iniciales si estamos en esa sección
        const transactionsSection = document.getElementById('section-transactions');
        if (transactionsSection && transactionsSection.classList.contains('active')) {
            const filteredTransactions = applyFilters(allTransactions);
            renderTransactions(filteredTransactions);
        }

        // Importar transacciones automáticamente al iniciar la app (NUEVO)
        await autoImportTransactions();
    } catch (error) {
        console.error('Error inicializando datos de la aplicación:', error);
    }
}

/**
 * Renderizar filtros
 */
async function renderFilters() {
    const filtersContainer = document.getElementById('filters-container');
    if (!filtersContainer) return;

    try {
        const filtersElement = await createTransactionFilters(handleFilterChange);
        filtersContainer.innerHTML = '';
        filtersContainer.appendChild(filtersElement);
    } catch (error) {
        console.error('Error renderizando filtros:', error);
        filtersContainer.innerHTML = '<p class="error-message">Error cargando filtros</p>';
    }
}

/**
 * Configurar campo de búsqueda
 */
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        currentFilters.search = e.target.value.trim();
        const filteredTransactions = applyFilters(allTransactions);
        renderTransactions(filteredTransactions);
    });
}

/**
 * Manejar cambio de filtros
 */
function handleFilterChange(filters) {
    currentFilters = { ...currentFilters, ...filters };
    const filteredTransactions = applyFilters(allTransactions);
    renderTransactions(filteredTransactions);
}

/**
 * Aplicar filtros a las transacciones
 */
function applyFilters(transactions) {
    let filtered = [...transactions];
    
    // Filtro por categoría
    if (currentFilters.category) {
        filtered = filtered.filter(t => t.category_id === currentFilters.category);
    }
    
    // Filtro por fuente
    if (currentFilters.source) {
        filtered = filtered.filter(t => t.source === currentFilters.source);
    }
    
    // Filtro por tipo
    if (currentFilters.type) {
        if (currentFilters.type === 'income') {
            filtered = filtered.filter(t => parseFloat(t.amount || 0) > 0);
        } else if (currentFilters.type === 'expense') {
            filtered = filtered.filter(t => parseFloat(t.amount || 0) < 0);
        } else if (currentFilters.type === 'withdrawal') {
            filtered = filtered.filter(t => t.transaction_type === 'retiro');
        }
    }
    
    // Filtro por período
    if (currentFilters.period !== 'all') {
        filtered = filterByPeriod(filtered, currentFilters.period);
    }
    
    // Búsqueda por texto
    if (currentFilters.search) {
        filtered = searchTransactions(filtered, currentFilters.search);
    }
    
    return filtered;
}

/**
 * Filtra transacciones por período
 */
function filterByPeriod(transactions, period) {
    const now = new Date();
    let startDate = null;
    let endDate = now;

    switch (period) {
        case 'last7':
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            break;
        case 'last30':
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 30);
            break;
        case 'currentMonth':
            startDate = getMonthStart(now);
            endDate = getMonthEnd(now);
            break;
        default:
            return transactions;
    }

    return transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
    });
}

/**
 * Manejar actualización de categoría
 */
function handleCategoryUpdated(updatedTransaction) {
    // Actualizar la transacción en allTransactions
    const index = allTransactions.findIndex(t => t.id === updatedTransaction.id);
    if (index !== -1) {
        allTransactions[index] = updatedTransaction;
    }
    
    // Re-renderizar con filtros aplicados
    const filteredTransactions = applyFilters(allTransactions);
    renderTransactions(filteredTransactions);
    
    // Re-renderizar estadísticas
    renderStats(allTransactions);
}

/**
 * Renderizar lista de transacciones
 */
function renderTransactions(transactions) {
    const transactionsList = document.getElementById('transactions-list');
    
    if (!transactions || transactions.length === 0) {
        transactionsList.innerHTML = '<p class="loading">No hay transacciones que coincidan con los filtros.</p>';
        return;
    }

    // Limpiar contenedor
    transactionsList.innerHTML = '';

    // Mostrar contador de resultados
    const countInfo = document.createElement('p');
    countInfo.className = 'loading';
    countInfo.style.marginBottom = '1rem';
    countInfo.textContent = `Mostrando ${transactions.length} transacción${transactions.length !== 1 ? 'es' : ''}`;
    transactionsList.appendChild(countInfo);

    // Crear items usando componente con callback de categorizar
    transactions.forEach(transaction => {
        const item = createTransactionItem(transaction, async (trans) => {
            await showCategoryModal(trans);
        });
        transactionsList.appendChild(item);
    });
}

/**
 * Renderizar estadísticas mejoradas
 */
function renderStats(transactions) {
    const stats = calculateStats(transactions);
    const statsContainer = document.getElementById('stats-container');

    if (!statsContainer) {
        console.error('Elemento stats-container no encontrado en el DOM');
        return;
    }

    // Limpiar contenedor
    statsContainer.innerHTML = '';

    // Calcular balance neto
    const balanceNet = stats.totalIncome + stats.totalExpenses; // expenses ya es negativo
    const monthBalanceNet = stats.monthIncome + stats.monthExpenses;

    // Calcular promedio mensual de gastos (solo si hay datos)
    const avgMonthlyExpenses = stats.count > 0 
        ? Math.abs(stats.totalExpenses) / Math.max(1, Math.ceil(stats.count / 30)) 
        : 0;

    // Crear tarjetas usando componente
    const totalCard = createStatCard('Total', stats.total, {
        isPositive: stats.total >= 0
    });
    statsContainer.appendChild(totalCard);

    const monthCard = createStatCard('Este Mes', stats.monthTotal, {
        isPositive: stats.monthTotal >= 0
    });
    statsContainer.appendChild(monthCard);

    // Ingresos totales
    const incomeCard = createStatCard('Ingresos', stats.totalIncome, {
        isPositive: true
    });
    statsContainer.appendChild(incomeCard);

    // Gastos totales (mostrar como positivo para claridad visual)
    const expensesCard = createStatCard('Gastos', Math.abs(stats.totalExpenses), {
        isPositive: false
    });
    statsContainer.appendChild(expensesCard);

    // Balance neto
    const balanceCard = createStatCard('Balance Neto', balanceNet, {
        isPositive: balanceNet >= 0
    });
    statsContainer.appendChild(balanceCard);

    // Promedio mensual de gastos
    if (avgMonthlyExpenses > 0) {
        const avgCard = createStatCard('Promedio Mensual', avgMonthlyExpenses, {
            isPositive: false
        });
        statsContainer.appendChild(avgCard);
    }
}

/**
 * Renderizar gráficos
 */
async function renderCharts() {
    const chartsContainer = document.getElementById('charts-container');
    if (!chartsContainer) {
        console.warn('Elemento charts-container no encontrado en el DOM');
        return;
    }
    
    chartsContainer.innerHTML = '<p class="loading">Cargando gráficos...</p>';
    
    try {
        // Obtener usuario actual
        const user = await getCurrentUser();
        if (!user) {
            chartsContainer.innerHTML = '<p class="error-message">Usuario no autenticado</p>';
            return;
        }
        
        // Calcular fechas (últimos 6 meses)
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        
        // Cargar datos en paralelo
        const [categoryData, trendData, topData] = await Promise.all([
            getCategoryExpensesData(user.id, sixMonthsAgo, now, 8).catch(err => {
                console.error('Error cargando datos de categorías:', err);
                return null;
            }),
            getMonthlyTrendsData(user.id, 6).catch(err => {
                console.error('Error cargando datos de tendencias:', err);
                return null;
            }),
            getTopCategoriesData(user.id, 5, sixMonthsAgo, now).catch(err => {
                console.error('Error cargando datos de top categorías:', err);
                return null;
            })
        ]);
        
        chartsContainer.innerHTML = '';
        
        const pairedContainer = document.createElement('div');
        pairedContainer.className = 'paired-charts-container';
        
        if (categoryData) {
            pairedContainer.appendChild(createCategoryExpenseChart('category-chart', categoryData));
        }
        
        if (topData) {
            pairedContainer.appendChild(createTopCategoriesChart('top-chart', topData));
        }
        
        if (pairedContainer.children.length > 0) {
            chartsContainer.appendChild(pairedContainer);
        }
        
        if (trendData) {
            chartsContainer.appendChild(createMonthlyTrendChart('trend-chart', trendData));
        }
        
        if (pairedContainer.children.length === 0 && !trendData) {
            chartsContainer.innerHTML = '<p class="loading">No hay datos suficientes para mostrar gráficos</p>';
        }
    } catch (error) {
        console.error('Error renderizando gráficos:', error);
        chartsContainer.innerHTML = '<p class="error-message">Error al cargar gráficos</p>';
    }
}

/**
 * Renderizar botón de importación de transacciones (NUEVO)
 */
async function renderImportButton() {
    try {
        const dashboardSection = document.getElementById('section-dashboard');
        if (!dashboardSection) {
            console.warn('Sección de dashboard no encontrada');
            return;
        }

        // Buscar contenedor de acciones del dashboard
        let actionsContainer = dashboardSection.querySelector('.dashboard-actions');
        if (!actionsContainer) {
            // Crear contenedor de acciones si no existe
            actionsContainer = document.createElement('div');
            actionsContainer.className = 'dashboard-actions';

            // Insertar después del título del dashboard
            const dashboardTitle = dashboardSection.querySelector('h2, h1');
            if (dashboardTitle) {
                dashboardTitle.insertAdjacentElement('afterend', actionsContainer);
            } else {
                dashboardSection.insertBefore(actionsContainer, dashboardSection.firstChild);
            }
        }

        // Limpiar contenedor
        actionsContainer.innerHTML = '';

        // Agregar botón de importación
        const importButton = addTransactionImportButton(
            actionsContainer,
            (result) => {
                // Callback cuando la importación se complete exitosamente
                console.log('Importación completada:', result);

                // Recargar transacciones para mostrar las nuevas
                reloadTransactionsAfterImport();
            },
            (error) => {
                // Callback cuando hay error
                console.error('Error en importación:', error);
                alert('Error durante la importación: ' + error.message);
            }
        );

        if (!importButton) {
            console.error('Error creando botón de importación');
        }
    } catch (error) {
        console.error('Error renderizando botón de importación:', error);
    }
}

/**
 * Recargar transacciones después de una importación
 */
async function reloadTransactionsAfterImport() {
    try {
        console.log('Recargando transacciones después de importación...');

        // Recargar transacciones
        allTransactions = await loadTransactions({ limit: 200 });

        // Actualizar dashboard
        renderStats(allTransactions);
        await renderCharts();

        // Actualizar sección de transacciones si está visible
        const transactionsSection = document.getElementById('section-transactions');
        if (transactionsSection && transactionsSection.classList.contains('active')) {
            const filteredTransactions = applyFilters(allTransactions);
            renderTransactions(filteredTransactions);
        }

        console.log('Transacciones recargadas exitosamente');
    } catch (error) {
        console.error('Error recargando transacciones:', error);
        alert('Error al recargar las transacciones');
    }
}

/**
 * Importar transacciones automáticamente al iniciar la aplicación (NUEVO)
 */
async function autoImportTransactions() {
    console.log('🔄 Verificando si ejecutar importación automática...');

    try {
        // Verificar si ya hay una importación en progreso
        if (isImportInProgress()) {
            console.log('❌ Importación automática omitida: ya hay una importación en progreso');
            return;
        }

        console.log(`📊 Total de transacciones cargadas: ${allTransactions.length}`);

        // Verificar si el usuario tiene transacciones recientes (últimas 24 horas)
        // Si tiene transacciones recientes, probablemente ya importó recientemente
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        console.log(`📅 Verificando transacciones desde: ${yesterday.toISOString()}`);

        const recentTransactions = allTransactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate >= yesterday;
        });

        console.log(`⏰ Transacciones recientes encontradas: ${recentTransactions.length}`);

        if (recentTransactions.length > 0) {
            console.log('❌ Importación automática omitida: hay transacciones recientes (últimas 24 horas)');
            console.log('📋 Últimas transacciones recientes:', recentTransactions.slice(0, 3).map(t => ({
                description: t.description,
                date: t.date,
                amount: t.amount
            })));
            return;
        }

        console.log('✅ No hay transacciones recientes, procediendo con importación automática...');
        console.log('🚀 Iniciando importación automática de transacciones...');

        // Mostrar indicador de carga en el dashboard
        const dashboardSection = document.getElementById('section-dashboard');
        if (dashboardSection) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'auto-import-indicator';
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.innerHTML = `
                <div class="loading-spinner"></div>
                <span>Importando transacciones recientes...</span>
            `;
            loadingIndicator.style.cssText = `
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem;
                background: #f0f8ff;
                border: 1px solid #add8e6;
                border-radius: 4px;
                margin: 1rem 0;
                font-size: 0.9rem;
                color: #2c5aa0;
            `;

            // Insertar después del título del dashboard
            const dashboardTitle = dashboardSection.querySelector('h2, h1');
            if (dashboardTitle) {
                dashboardTitle.insertAdjacentElement('afterend', loadingIndicator);
            }
        }

        console.log('⚙️ Configuración de importación:', {
            daysBack: 7,
            maxEmails: 50,
            skipDuplicates: true
        });

        // Ejecutar importación automática
        const result = await importTransactionsFromGmail(
            {
                daysBack: 7,  // Buscar emails de los últimos 7 días
                maxEmails: 50, // Máximo 50 emails
                skipDuplicates: true
            },
            (message, data) => {
                // Callback de progreso - actualizar indicador
                const indicator = document.getElementById('auto-import-indicator');
                if (indicator) {
                    const span = indicator.querySelector('span');
                    if (span) {
                        span.textContent = message;
                    }
                }
                console.log(`📊 Auto-import progreso: ${message}`, data || '');
            },
            (error) => {
                // Callback de error - mostrar pero no alertar
                console.error('❌ Error en importación automática:', error);
                const indicator = document.getElementById('auto-import-indicator');
                if (indicator) {
                    indicator.innerHTML = `
                        <span style="color: #d32f2f;">⚠️ Error al importar transacciones automáticamente</span>
                    `;
                    // Remover indicador después de 3 segundos
                    setTimeout(() => {
                        if (indicator.parentNode) {
                            indicator.parentNode.removeChild(indicator);
                        }
                    }, 3000);
                }
            }
        );

        console.log('📋 Resultado de importación automática:', result);

        // Remover indicador de carga
        const indicator = document.getElementById('auto-import-indicator');
        if (indicator) {
            indicator.parentNode.removeChild(indicator);
        }

        // Si se importaron transacciones, recargar datos
        if (result && result.transactionsImported > 0) {
            console.log(`✅ Importación automática completada: ${result.transactionsImported} transacciones importadas`);
            console.log('🔄 Recargando datos de la aplicación...');

            // Recargar transacciones y actualizar UI
            await reloadTransactionsAfterImport();

            // Mostrar notificación de éxito discreta
            showAutoImportSuccess(result.transactionsImported);
        } else {
            console.log('ℹ️ Importación automática completada: no se encontraron nuevas transacciones');
            if (result) {
                console.log(`   - Emails encontrados: ${result.emailsFound || 0}`);
                console.log(`   - Transacciones encontradas: ${result.transactionsFound || 0}`);
                console.log(`   - Duplicados omitidos: ${result.skippedDuplicates || 0}`);
            }
        }

    } catch (error) {
        console.error('❌ Error general en importación automática:', error);
        console.error('Stack trace:', error.stack);

        // Remover indicador de carga si existe
        const indicator = document.getElementById('auto-import-indicator');
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }

        // No mostrar alertas para errores de importación automática
        // Solo loggear para no interrumpir la experiencia del usuario
    }

    console.log('🏁 Fin del proceso de importación automática');
}

/**
 * Mostrar notificación de éxito de importación automática
 */
function showAutoImportSuccess(count) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = 'auto-import-success';
    notification.innerHTML = `
        <span>✅ ${count} transacción${count !== 1 ? 'es' : ''} importada${count !== 1 ? 's' : ''} automáticamente</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 1000;
        font-size: 0.9rem;
        animation: slideIn 0.3s ease-out;
    `;

    // Agregar animación CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remover después de 4 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideIn 0.3s ease-in reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 4000);
}

/**
 * Mostrar error
 */
function showError(message) {
    const errorElement = document.getElementById('auth-error');
    if (errorElement) {
        errorElement.textContent = message;
    } else {
        alert(message);
    }
}

/**
 * Renderizar lista de presupuestos (NUEVA FUNCIÓN)
 */
async function renderBudgets() {
    try {
        const budgetsList = document.getElementById('budgets-list');
        if (!budgetsList) {
            console.warn('Elemento budgets-list no encontrado en el DOM');
            return;
        }

        budgetsList.innerHTML = '<p class="loading">Cargando presupuestos...</p>';

        // Cargar presupuestos desde budgetService
        const budgets = await loadBudgets();

        // Limpiar contenedor
        budgetsList.innerHTML = '';

        if (!budgets || budgets.length === 0) {
            budgetsList.innerHTML = '<p class="loading">No hay presupuestos activos. Crea uno nuevo para comenzar.</p>';
            return;
        }

        // Renderizar usando createBudgetCard
        budgets.forEach(budget => {
            const card = createBudgetCard(
                budget,
                async (budget) => {
                    // Callback para editar
                    await handleEditBudget(budget);
                },
                async (budgetId) => {
                    // Callback para eliminar
                    await handleDeleteBudget(budgetId);
                }
            );
            budgetsList.appendChild(card);
        });
    } catch (error) {
        console.error('Error renderizando presupuestos:', error);
        const budgetsList = document.getElementById('budgets-list');
        if (budgetsList) {
            budgetsList.innerHTML = '<p class="error-message">Error al cargar presupuestos</p>';
        }
    }
}

/**
 * Renderizar alertas de presupuesto (NUEVA FUNCIÓN)
 */
async function renderBudgetAlerts() {
    try {
        const alertsContainer = document.getElementById('budget-alerts-container');
        if (!alertsContainer) {
            console.warn('Elemento budget-alerts-container no encontrado en el DOM');
            return;
        }

        // Cargar alertas desde budgetService
        const alerts = await loadBudgetAlerts();

        // Limpiar contenedor
        alertsContainer.innerHTML = '';

        if (!alerts || alerts.length === 0) {
            // No mostrar nada si no hay alertas
            return;
        }

        // Crear título
        const title = document.createElement('h3');
        title.className = 'budget-alerts-title';
        title.textContent = 'Alertas de Presupuesto';
        alertsContainer.appendChild(title);

        // Renderizar lista simple
        alerts.forEach(alert => {
            const alertItem = document.createElement('div');
            alertItem.className = 'budget-alert-item';
            
            if (alert.alert_type === 'exceeded') {
                alertItem.classList.add('budget-alert-item--exceeded');
            }

            const budget = alert.budgets;
            const category = budget?.categories;
            const categoryName = category?.name || 'Categoría desconocida';
            const budgetAmount = budget?.amount || 0;
            const alertTypeText = alert.alert_type === 'exceeded' ? 'excedido' : 'alcanzado el umbral';

            const message = document.createElement('div');
            message.className = 'budget-alert-message';
            message.textContent = `Presupuesto de ${categoryName} (${formatCurrency(budgetAmount)}) ${alertTypeText}`;

            const actions = document.createElement('div');
            actions.className = 'budget-alert-actions';

            const markReadButton = document.createElement('button');
            markReadButton.className = 'btn btn-secondary';
            markReadButton.textContent = 'Marcar como leída';
            markReadButton.addEventListener('click', async () => {
                try {
                    await markAlertAsRead(alert.id);
                    // Re-renderizar alertas
                    await renderBudgetAlerts();
                } catch (error) {
                    console.error('Error marcando alerta como leída:', error);
                    alert('Error al marcar la alerta como leída');
                }
            });

            actions.appendChild(markReadButton);
            alertItem.appendChild(message);
            alertItem.appendChild(actions);
            alertsContainer.appendChild(alertItem);
        });
    } catch (error) {
        console.error('Error renderizando alertas de presupuesto:', error);
        // No mostrar error en UI para no interrumpir la experiencia
    }
}

/**
 * Manejar creación de presupuesto (NUEVA FUNCIÓN)
 */
async function handleCreateBudget(budgetData) {
    try {
        // Llamar a createBudget
        const createdBudget = await createBudget(budgetData);
        
        // Actualizar vista
        await renderBudgets();
        await renderBudgetAlerts();
        
        return createdBudget;
    } catch (error) {
        console.error('Error creando presupuesto:', error);
        throw error;
    }
}

/**
 * Manejar edición de presupuesto (NUEVA FUNCIÓN)
 */
async function handleEditBudget(budget) {
    try {
        // Mostrar modal con datos del presupuesto
        await showBudgetModal(budget);
    } catch (error) {
        console.error('Error editando presupuesto:', error);
        alert('Error al editar el presupuesto');
    }
}

/**
 * Manejar eliminación de presupuesto (NUEVA FUNCIÓN)
 */
async function handleDeleteBudget(budgetId) {
    try {
        // Llamar a deleteBudget
        await deleteBudget(budgetId);
        
        // Actualizar vista
        await renderBudgets();
        await renderBudgetAlerts();
    } catch (error) {
        console.error('Error eliminando presupuesto:', error);
        alert('Error al desactivar el presupuesto');
    }
}

/**
 * Manejar actualización de presupuesto (NUEVA FUNCIÓN)
 */
function handleBudgetUpdated(updatedBudget) {
    // Actualizar vista de presupuestos
    renderBudgets();
    renderBudgetAlerts();
}

/**
 * Renderizar lista de categorías (NUEVA FUNCIÓN)
 */
async function renderCategories() {
    try {
        const categoriesList = document.getElementById('categories-list');
        if (!categoriesList) {
            console.warn('Elemento categories-list no encontrado en el DOM');
            return;
        }

        categoriesList.innerHTML = '<p class="loading">Cargando categorías...</p>';

        // Cargar categorías desde categoryService
        const categories = await loadCategories();

        // Limpiar contenedor
        categoriesList.innerHTML = '';

        if (!categories || categories.length === 0) {
            categoriesList.innerHTML = '<p class="loading">No hay categorías disponibles.</p>';
            return;
        }

        // Separar categorías del sistema y personalizadas
        const systemCategories = categories.filter(cat => cat.is_system);
        const customCategories = categories.filter(cat => !cat.is_system);

        // Renderizar categorías del sistema con sección colapsable
        if (systemCategories.length > 0) {
            const systemSection = document.createElement('div');
            systemSection.className = 'categories-section';

            const systemTitle = document.createElement('button');
            systemTitle.className = 'categories-section-title categories-section-toggle';
            systemTitle.setAttribute('aria-expanded', 'true');
            systemTitle.innerHTML = `
                <span class="section-title-text">Categorías del Sistema</span>
                <span class="section-toggle-icon">▼</span>
            `;
            
            const systemContent = document.createElement('div');
            systemContent.className = 'categories-section-content';
            systemContent.style.display = 'grid';

            // Cargar estadísticas para categorías del sistema (opcional, puede ser lento)
            const systemCategoriesWithStats = await Promise.all(
                systemCategories.map(async (category) => {
                    try {
                        const stats = await getCategoryStats(category.id);
                        return { category, stats };
                    } catch (error) {
                        console.error(`Error cargando stats para categoría ${category.id}:`, error);
                        return { category, stats: null };
                    }
                })
            );

            systemCategoriesWithStats.forEach(({ category, stats }) => {
                const card = createCategoryCard(category, stats);
                systemContent.appendChild(card);
            });

            // Toggle functionality
            systemTitle.addEventListener('click', () => {
                const isExpanded = systemTitle.getAttribute('aria-expanded') === 'true';
                systemTitle.setAttribute('aria-expanded', !isExpanded);
                systemContent.style.display = isExpanded ? 'none' : 'grid';
                const icon = systemTitle.querySelector('.section-toggle-icon');
                icon.textContent = isExpanded ? '▶' : '▼';
            });

            systemSection.appendChild(systemTitle);
            systemSection.appendChild(systemContent);
            categoriesList.appendChild(systemSection);
        }

        // Renderizar categorías personalizadas con sección colapsable
        if (customCategories.length > 0) {
            const customSection = document.createElement('div');
            customSection.className = 'categories-section';

            const customTitle = document.createElement('button');
            customTitle.className = 'categories-section-title categories-section-toggle';
            customTitle.setAttribute('aria-expanded', 'true');
            customTitle.innerHTML = `
                <span class="section-title-text">Mis Categorías</span>
                <span class="section-toggle-icon">▼</span>
            `;
            
            const customContent = document.createElement('div');
            customContent.className = 'categories-section-content';
            customContent.style.display = 'grid';

            // Cargar estadísticas para categorías personalizadas
            const customCategoriesWithStats = await Promise.all(
                customCategories.map(async (category) => {
                    try {
                        const stats = await getCategoryStats(category.id);
                        return { category, stats };
                    } catch (error) {
                        console.error(`Error cargando stats para categoría ${category.id}:`, error);
                        return { category, stats: null };
                    }
                })
            );

            customCategoriesWithStats.forEach(({ category, stats }) => {
                const card = createCategoryCard(
                    category,
                    stats,
                    async (category) => {
                        // Callback para editar
                        await handleEditCategory(category);
                    },
                    async (categoryId) => {
                        // Callback para eliminar
                        await handleDeleteCategory(categoryId);
                    }
                );
                customContent.appendChild(card);
            });

            // Toggle functionality
            customTitle.addEventListener('click', () => {
                const isExpanded = customTitle.getAttribute('aria-expanded') === 'true';
                customTitle.setAttribute('aria-expanded', !isExpanded);
                customContent.style.display = isExpanded ? 'none' : 'grid';
                const icon = customTitle.querySelector('.section-toggle-icon');
                icon.textContent = isExpanded ? '▶' : '▼';
            });

            customSection.appendChild(customTitle);
            customSection.appendChild(customContent);
            categoriesList.appendChild(customSection);
        }

        // Si no hay categorías personalizadas, mostrar mensaje
        if (customCategories.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'loading';
            emptyMessage.style.marginTop = '1rem';
            emptyMessage.textContent = 'No tienes categorías personalizadas. Crea una nueva para comenzar.';
            categoriesList.appendChild(emptyMessage);
        }
    } catch (error) {
        console.error('Error renderizando categorías:', error);
        const categoriesList = document.getElementById('categories-list');
        if (categoriesList) {
            categoriesList.innerHTML = '<p class="error-message">Error al cargar categorías</p>';
        }
    }
}

/**
 * Manejar creación de categoría (NUEVA FUNCIÓN)
 */
async function handleCreateCategory(categoryData) {
    try {
        // Llamar a createCategory
        const createdCategory = await createCategory(categoryData);
        
        // Actualizar vista
        await renderCategories();
        
        return createdCategory;
    } catch (error) {
        console.error('Error creando categoría:', error);
        throw error;
    }
}

/**
 * Manejar edición de categoría (NUEVA FUNCIÓN)
 */
async function handleEditCategory(category) {
    try {
        // Validar que no sea categoría del sistema
        if (category.is_system) {
            alert('No se pueden editar las categorías del sistema');
            return;
        }

        // Mostrar modal con datos de la categoría
        await showCategoryManagementModal(category);
    } catch (error) {
        console.error('Error editando categoría:', error);
        alert('Error al editar la categoría');
    }
}

/**
 * Manejar eliminación de categoría (NUEVA FUNCIÓN)
 */
async function handleDeleteCategory(categoryId) {
    try {
        // Obtener la categoría para validar
        const categories = await loadCategories();
        const category = categories.find(cat => cat.id === categoryId);
        
        if (!category) {
            alert('Categoría no encontrada');
            return;
        }

        // Validar que no sea categoría del sistema
        if (category.is_system) {
            alert('No se pueden eliminar las categorías del sistema');
            return;
        }

        // Verificar si hay transacciones usando esta categoría
        try {
            const stats = await getCategoryStats(categoryId);
            if (stats.transactionCount > 0) {
                const confirmMessage = `Esta categoría tiene ${stats.transactionCount} transacción(es) asociada(s). ` +
                    `¿Estás seguro de que deseas eliminarla? Las transacciones perderán su categoría.`;
                if (!confirm(confirmMessage)) {
                    return;
                }
            }
        } catch (error) {
            console.error('Error verificando estadísticas:', error);
            // Continuar con la eliminación aunque falle la verificación
        }

        // Llamar a deleteCategory
        await deleteCategory(categoryId);
        
        // Actualizar vista
        await renderCategories();
    } catch (error) {
        console.error('Error eliminando categoría:', error);
        alert(error.message || 'Error al eliminar la categoría');
    }
}

/**
 * Manejar actualización de categoría (NUEVA FUNCIÓN)
 */
function handleCategoryManagementUpdated(updatedCategory) {
    // Actualizar vista de categorías
    renderCategories();
    // Opcional: actualizar selects de categorías en otros componentes
    // Los modales ya cargan categorías cuando se abren, así que no es crítico
}

/**
 * Renderizar lista de reglas (NUEVA FUNCIÓN)
 */
async function renderRules() {
    try {
        const rulesList = document.getElementById('rules-list');
        if (!rulesList) {
            console.warn('Elemento rules-list no encontrado en el DOM');
            return;
        }

        rulesList.innerHTML = '<p class="loading">Cargando reglas...</p>';

        // Cargar reglas desde ruleService
        const rules = await loadRules();

        // Limpiar contenedor
        rulesList.innerHTML = '';

        if (!rules || rules.length === 0) {
            rulesList.innerHTML = '<p class="loading">No hay reglas configuradas. Crea una nueva regla para comenzar a auto-categorizar transacciones.</p>';
            return;
        }

        // Separar reglas activas e inactivas
        const activeRules = rules.filter(rule => rule.is_active);
        const inactiveRules = rules.filter(rule => !rule.is_active);

        // Renderizar reglas activas
        if (activeRules.length > 0) {
            const activeTitle = document.createElement('div');
            activeTitle.className = 'rules-section-title';
            activeTitle.textContent = `Reglas Activas (${activeRules.length})`;
            rulesList.appendChild(activeTitle);

            const activeContainer = document.createElement('div');
            activeContainer.className = 'rules-section-content';

            activeRules.forEach(rule => {
                const card = createRuleCard(
                    rule,
                    async (rule) => {
                        // Callback para editar
                        await handleEditRule(rule);
                    },
                    async (ruleId) => {
                        // Callback para eliminar
                        await handleDeleteRule(ruleId);
                    },
                    async (ruleId, isActive) => {
                        // Callback para activar/desactivar
                        await handleToggleRule(ruleId, isActive);
                    }
                );
                activeContainer.appendChild(card);
            });

            rulesList.appendChild(activeContainer);
        }

        // Renderizar reglas inactivas
        if (inactiveRules.length > 0) {
            const inactiveTitle = document.createElement('div');
            inactiveTitle.className = 'rules-section-title';
            inactiveTitle.textContent = `Reglas Inactivas (${inactiveRules.length})`;
            rulesList.appendChild(inactiveTitle);

            const inactiveContainer = document.createElement('div');
            inactiveContainer.className = 'rules-section-content';

            inactiveRules.forEach(rule => {
                const card = createRuleCard(
                    rule,
                    async (rule) => {
                        // Callback para editar
                        await handleEditRule(rule);
                    },
                    async (ruleId) => {
                        // Callback para eliminar
                        await handleDeleteRule(ruleId);
                    },
                    async (ruleId, isActive) => {
                        // Callback para activar/desactivar
                        await handleToggleRule(ruleId, isActive);
                    }
                );
                inactiveContainer.appendChild(card);
            });

            rulesList.appendChild(inactiveContainer);
        }

        // Si no hay reglas, mostrar mensaje
        if (activeRules.length === 0 && inactiveRules.length === 0) {
            const emptyMessage = document.createElement('p');
            emptyMessage.className = 'loading';
            emptyMessage.style.marginTop = '1rem';
            emptyMessage.textContent = 'No tienes reglas configuradas. Crea una nueva regla para comenzar.';
            rulesList.appendChild(emptyMessage);
        }
    } catch (error) {
        console.error('Error renderizando reglas:', error);
        const rulesList = document.getElementById('rules-list');
        if (rulesList) {
            rulesList.innerHTML = '<p class="error-message">Error al cargar reglas</p>';
        }
    }
}

/**
 * Manejar creación de regla (NUEVA FUNCIÓN)
 */
async function handleCreateRule(ruleData) {
    try {
        // Llamar a createRule
        const createdRule = await createRule(ruleData);
        
        // Actualizar vista
        await renderRules();
        
        return createdRule;
    } catch (error) {
        console.error('Error creando regla:', error);
        throw error;
    }
}

/**
 * Manejar edición de regla (NUEVA FUNCIÓN)
 */
async function handleEditRule(rule) {
    try {
        // Mostrar modal con datos de la regla
        await showRuleModal(rule);
    } catch (error) {
        console.error('Error editando regla:', error);
        alert('Error al editar la regla');
    }
}

/**
 * Manejar eliminación de regla (NUEVA FUNCIÓN)
 */
async function handleDeleteRule(ruleId) {
    try {
        // Llamar a deleteRule
        await deleteRule(ruleId);
        
        // Actualizar vista
        await renderRules();
    } catch (error) {
        console.error('Error eliminando regla:', error);
        alert(error.message || 'Error al eliminar la regla');
    }
}

/**
 * Manejar activar/desactivar regla (NUEVA FUNCIÓN)
 */
async function handleToggleRule(ruleId, isActive) {
    try {
        // Llamar a toggleRuleActive
        await toggleRuleActive(ruleId, isActive);
        
        // Actualizar vista
        await renderRules();
    } catch (error) {
        console.error('Error cambiando estado de regla:', error);
        alert(error.message || 'Error al cambiar el estado de la regla');
    }
}

/**
 * Manejar actualización de regla (NUEVA FUNCIÓN)
 */
function handleRuleUpdated(updatedRule) {
    // Actualizar vista de reglas
    renderRules();
}

/**
 * Función global para analizar estructura RAW de Gmail API
 * Ejecutar desde consola del navegador: window.testGmailAPI()
 */
window.testGmailAPI = async function() {
    try {
        // Importar servicios dinámicamente
        const { searchBankEmails } = await import('./services/gmailAPIService.js');
        const { getRawMessage } = await import('./services/gmailAPIService.js');
        
        console.log('🔍 Buscando emails de bancos...');
        
        // Buscar emails de bancos
        const query = "from:bbva.com OR from:mercadopago.com OR from:nu.com.mx OR from:plata.com.mx newer_than:7d";
        const results = await searchBankEmails(query, 1);
        
        if (!results.messages || results.messages.length === 0) {
            console.log('❌ No se encontraron emails de bancos');
            return;
        }
        
        const messageId = results.messages[0].id;
        console.log(`✅ Email encontrado. ID: ${messageId}`);
        console.log('📧 Obteniendo estructura RAW completa...\n');
        
        // Obtener mensaje RAW completo
        const rawMessage = await getRawMessage(messageId);
        
        // Mostrar estructura completa en consola
        console.log('='.repeat(80));
        console.log('ESTRUCTURA COMPLETA DEL MENSAJE RAW DE GMAIL API');
        console.log('='.repeat(80));
        console.log(JSON.stringify(rawMessage, null, 2));
        
        // También guardar en variable global para inspección
        window.lastGmailRawMessage = rawMessage;
        console.log('\n✅ Mensaje RAW guardado en: window.lastGmailRawMessage');
        console.log('   Puedes inspeccionarlo en la consola escribiendo: window.lastGmailRawMessage');
        
        return rawMessage;
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
};
