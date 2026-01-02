// Aplicación principal de WINM
// JavaScript Vanilla - Sin frameworks
// Refactorizado para usar módulos (SOLID + KISS)

// Importar servicios
import { 
    getSupabaseClient, 
    checkSession, 
    signIn, 
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

// Importar servicios de gráficos
import { 
    getCategoryExpensesData, 
    getMonthlyTrendsData, 
    getTopCategoriesData 
} from './services/chartDataService.js';

// Importar servicios de Supabase
import { getCurrentUser } from './services/supabaseService.js';

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
    try {
        // Verificar configuración (CONFIG está en window desde config.js)
        const config = window.CONFIG || (typeof CONFIG !== 'undefined' ? CONFIG : null);
        if (!config || !config.supabase || !config.supabase.url || !config.supabase.anonKey) {
            showError('Configuración incompleta. Por favor, edita config.js con tus credenciales de Supabase.');
            return;
        }

        // Inicializar cliente Supabase (singleton)
        getSupabaseClient();

        // Verificar sesión existente
        const hasSession = await checkSession();
        if (hasSession) {
            showMainSection();
            // Inicializar modal de categorización
            await initCategoryModal(handleCategoryUpdated);
            await renderDashboard();
        } else {
            showAuthSection();
        }

        // Configurar event listeners
        setupEventListeners();

        // Escuchar cambios de autenticación
        onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                showAuthSection();
            } else if (event === 'SIGNED_IN' && session) {
                showMainSection();
                renderDashboard();
            }
        });
    } catch (error) {
        console.error('Error inicializando aplicación:', error);
        showError('Error al inicializar la aplicación');
    }
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

/**
 * Manejar login
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
}

/**
 * Renderizar dashboard completo
 */
async function renderDashboard() {
    try {
        const transactionsList = document.getElementById('transactions-list');
        transactionsList.innerHTML = '<p class="loading">Cargando transacciones...</p>';

        // Cargar transacciones
        allTransactions = await loadTransactions({ limit: 200 }); // Cargar más para filtrado

        // Renderizar filtros
        await renderFilters();

        // Configurar búsqueda
        setupSearch();

        if (allTransactions && allTransactions.length > 0) {
            // Aplicar filtros y renderizar
            const filteredTransactions = applyFilters(allTransactions);
            renderTransactions(filteredTransactions);
            
            // Renderizar estadísticas mejoradas (con todas las transacciones)
            renderStats(allTransactions);
            
            // Renderizar gráficos
            await renderCharts();
        } else {
            transactionsList.innerHTML = '<p class="loading">No hay transacciones registradas aún.</p>';
            renderStats([]);
            // Intentar renderizar gráficos aunque no haya transacciones (puede haber datos históricos)
            await renderCharts();
        }
    } catch (error) {
        console.error('Error renderizando dashboard:', error);
        const transactionsList = document.getElementById('transactions-list');
        transactionsList.innerHTML = '<p class="error-message">Error al cargar transacciones</p>';
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
