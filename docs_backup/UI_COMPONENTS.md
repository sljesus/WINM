# Componentes UI Reutilizables - WINM

Definición de componentes UI reutilizables para el desarrollo del frontend. Principio SOLID: cada componente tiene responsabilidad única y es extensible.

---

## 1. StatCard - Card de Estadísticas

**Descripción:** Card que muestra un título y un valor numérico formateado como moneda.

**Props/Parámetros:**
- `title` (string): Título de la estadística
- `value` (number): Valor numérico a mostrar
- `currency` (string, opcional): Código de moneda (default: 'MXN')
- `positive` (boolean, opcional): Si es true, muestra en verde; si es false, en rojo

**HTML/CSS:**

```html
<div class="stat-card">
  <h3 class="stat-card-title">Total</h3>
  <p class="stat-card-value positive">$1,234.56</p>
</div>
```

```css
.stat-card {
  background: var(--surface);
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: var(--shadow);
  text-align: center;
}

.stat-card-title {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-card-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-card-value.positive {
  color: var(--success-color);
}

.stat-card-value.negative {
  color: var(--danger-color);
}
```

**JavaScript:**

```javascript
function createStatCard(title, value, isPositive = null) {
  const card = document.createElement('div')
  card.className = 'stat-card'
  
  const titleEl = document.createElement('h3')
  titleEl.className = 'stat-card-title'
  titleEl.textContent = title
  
  const valueEl = document.createElement('p')
  valueEl.className = 'stat-card-value'
  if (isPositive !== null) {
    valueEl.classList.add(isPositive ? 'positive' : 'negative')
  }
  valueEl.textContent = formatCurrency(value)
  
  card.appendChild(titleEl)
  card.appendChild(valueEl)
  
  return card
}

function formatCurrency(amount, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency
  }).format(amount)
}
```

**Ejemplo de Uso:**

```javascript
const totalCard = createStatCard('Total', -1500.50, false)
document.getElementById('stats-container').appendChild(totalCard)
```

---

## 2. TransactionItem - Item de Transacción

**Descripción:** Componente que muestra una transacción individual con descripción, fecha, fuente y monto.

**Props/Parámetros:**
- `transaction` (object): Objeto de transacción con:
  - `description` (string)
  - `date` (string, ISO 8601)
  - `source` (string)
  - `amount` (number)
  - `needs_categorization` (boolean, opcional)
  - `category` (string, opcional)

**HTML/CSS:**

```html
<div class="transaction-item">
  <div class="transaction-info">
    <div class="transaction-description">Compra en Supermercado</div>
    <div class="transaction-meta">31/12/2025 • BBVA</div>
  </div>
  <div class="transaction-amount negative">-$150.50</div>
</div>
```

```css
.transaction-item {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
}

.transaction-item:hover {
  background-color: var(--background);
}

.transaction-item:last-child {
  border-bottom: none;
}

.transaction-info {
  flex: 1;
}

.transaction-description {
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: var(--text-primary);
}

.transaction-meta {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.transaction-amount {
  font-size: 1.25rem;
  font-weight: 700;
}

.transaction-amount.positive {
  color: var(--success-color);
}

.transaction-amount.negative {
  color: var(--danger-color);
}
```

**JavaScript:**

```javascript
function createTransactionItem(transaction) {
  const item = document.createElement('div')
  item.className = 'transaction-item'
  
  const info = document.createElement('div')
  info.className = 'transaction-info'
  
  const description = document.createElement('div')
  description.className = 'transaction-description'
  description.textContent = escapeHtml(transaction.description)
  
  const date = new Date(transaction.date).toLocaleDateString('es-MX')
  const meta = document.createElement('div')
  meta.className = 'transaction-meta'
  meta.textContent = `${date} • ${escapeHtml(transaction.source)}`
  
  info.appendChild(description)
  info.appendChild(meta)
  
  const amount = document.createElement('div')
  amount.className = 'transaction-amount'
  const amountValue = parseFloat(transaction.amount)
  amount.classList.add(amountValue >= 0 ? 'positive' : 'negative')
  amount.textContent = formatCurrency(Math.abs(amountValue))
  if (amountValue < 0) {
    amount.textContent = '-' + amount.textContent
  } else {
    amount.textContent = '+' + amount.textContent
  }
  
  item.appendChild(info)
  item.appendChild(amount)
  
  // Agregar botón de categorizar si es necesario
  if (transaction.needs_categorization) {
    const categorizeBtn = document.createElement('button')
    categorizeBtn.className = 'btn btn-secondary btn-sm'
    categorizeBtn.textContent = 'Categorizar'
    categorizeBtn.onclick = () => openCategorizeModal(transaction)
    item.appendChild(categorizeBtn)
  }
  
  return item
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
```

**Ejemplo de Uso:**

```javascript
const transactions = [
  { description: 'Compra en Supermercado', date: '2025-12-31T10:00:00Z', source: 'BBVA', amount: -150.50 },
  { description: 'Ingreso de salario', date: '2025-12-30T10:00:00Z', source: 'BBVA', amount: 5000.00 }
]

transactions.forEach(tx => {
  const item = createTransactionItem(tx)
  document.getElementById('transactions-list').appendChild(item)
})
```

---

## 3. Modal - Modal Genérico

**Descripción:** Modal reutilizable para formularios y contenido adicional.

**Props/Parámetros:**
- `title` (string): Título del modal
- `content` (HTMLElement | string): Contenido del modal
- `onClose` (function, opcional): Callback al cerrar
- `showCloseButton` (boolean, opcional): Mostrar botón de cerrar (default: true)

**HTML/CSS:**

```html
<div class="modal-overlay">
  <div class="modal">
    <div class="modal-header">
      <h2 class="modal-title">Título del Modal</h2>
      <button class="modal-close" aria-label="Cerrar">×</button>
    </div>
    <div class="modal-body">
      <!-- Contenido -->
    </div>
    <div class="modal-footer">
      <!-- Botones de acción -->
    </div>
  </div>
</div>
```

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.modal-close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
```

**JavaScript:**

```javascript
function createModal(title, content, onClose = null) {
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  
  const modal = document.createElement('div')
  modal.className = 'modal'
  
  const header = document.createElement('div')
  header.className = 'modal-header'
  
  const titleEl = document.createElement('h2')
  titleEl.className = 'modal-title'
  titleEl.textContent = title
  
  const closeBtn = document.createElement('button')
  closeBtn.className = 'modal-close'
  closeBtn.setAttribute('aria-label', 'Cerrar')
  closeBtn.textContent = '×'
  closeBtn.onclick = () => {
    overlay.remove()
    if (onClose) onClose()
  }
  
  header.appendChild(titleEl)
  header.appendChild(closeBtn)
  
  const body = document.createElement('div')
  body.className = 'modal-body'
  if (typeof content === 'string') {
    body.innerHTML = content
  } else {
    body.appendChild(content)
  }
  
  modal.appendChild(header)
  modal.appendChild(body)
  overlay.appendChild(modal)
  
  // Cerrar al hacer click fuera del modal
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove()
      if (onClose) onClose()
    }
  }
  
  // Cerrar con ESC
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      overlay.remove()
      document.removeEventListener('keydown', handleEsc)
      if (onClose) onClose()
    }
  }
  document.addEventListener('keydown', handleEsc)
  
  return overlay
}

function openModal(title, content, onClose = null) {
  const modal = createModal(title, content, onClose)
  document.body.appendChild(modal)
  return modal
}

function closeModal(modal) {
  if (modal && modal.parentNode) {
    modal.remove()
  }
}
```

**Ejemplo de Uso:**

```javascript
// Modal simple con texto
openModal('Confirmación', '¿Estás seguro de eliminar este presupuesto?')

// Modal con contenido HTML
const form = document.createElement('form')
form.innerHTML = `
  <div class="form-group">
    <label>Nombre</label>
    <input type="text" name="name" required>
  </div>
  <button type="submit">Guardar</button>
`
openModal('Nueva Categoría', form)
```

---

## 4. FilterForm - Formulario de Filtros

**Descripción:** Formulario reutilizable para filtrar transacciones.

**Props/Parámetros:**
- `onFilter` (function): Callback con los filtros aplicados
- `categories` (array, opcional): Lista de categorías disponibles
- `sources` (array, opcional): Lista de fuentes disponibles

**HTML/CSS:**

```html
<div class="filter-form">
  <div class="filter-group">
    <label>Categoría</label>
    <select name="category">
      <option value="">Todas</option>
      <option value="cat-1">Supermercado</option>
    </select>
  </div>
  <div class="filter-group">
    <label>Fuente</label>
    <select name="source">
      <option value="">Todas</option>
      <option value="BBVA">BBVA</option>
    </select>
  </div>
  <div class="filter-group">
    <label>Fecha desde</label>
    <input type="date" name="date_from">
  </div>
  <div class="filter-group">
    <label>Fecha hasta</label>
    <input type="date" name="date_to">
  </div>
  <button type="button" class="btn btn-primary" onclick="applyFilters()">Aplicar Filtros</button>
</div>
```

```css
.filter-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  padding: 1.5rem;
  background: var(--surface);
  border-radius: 8px;
  box-shadow: var(--shadow);
  margin-bottom: 1.5rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.filter-group select,
.filter-group input {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
}

@media (max-width: 768px) {
  .filter-form {
    grid-template-columns: 1fr;
  }
}
```

**JavaScript:**

```javascript
function createFilterForm(categories = [], sources = [], onFilter = null) {
  const form = document.createElement('div')
  form.className = 'filter-form'
  
  // Categoría
  const categoryGroup = document.createElement('div')
  categoryGroup.className = 'filter-group'
  const categoryLabel = document.createElement('label')
  categoryLabel.textContent = 'Categoría'
  const categorySelect = document.createElement('select')
  categorySelect.name = 'category'
  const categoryOptionAll = document.createElement('option')
  categoryOptionAll.value = ''
  categoryOptionAll.textContent = 'Todas'
  categorySelect.appendChild(categoryOptionAll)
  categories.forEach(cat => {
    const option = document.createElement('option')
    option.value = cat.id
    option.textContent = cat.name
    categorySelect.appendChild(option)
  })
  categoryGroup.appendChild(categoryLabel)
  categoryGroup.appendChild(categorySelect)
  
  // Fuente
  const sourceGroup = document.createElement('div')
  sourceGroup.className = 'filter-group'
  const sourceLabel = document.createElement('label')
  sourceLabel.textContent = 'Fuente'
  const sourceSelect = document.createElement('select')
  sourceSelect.name = 'source'
  const sourceOptionAll = document.createElement('option')
  sourceOptionAll.value = ''
  sourceOptionAll.textContent = 'Todas'
  sourceSelect.appendChild(sourceOptionAll)
  sources.forEach(src => {
    const option = document.createElement('option')
    option.value = src
    option.textContent = src
    sourceSelect.appendChild(option)
  })
  sourceGroup.appendChild(sourceLabel)
  sourceGroup.appendChild(sourceSelect)
  
  // Fecha desde
  const dateFromGroup = document.createElement('div')
  dateFromGroup.className = 'filter-group'
  const dateFromLabel = document.createElement('label')
  dateFromLabel.textContent = 'Fecha desde'
  const dateFromInput = document.createElement('input')
  dateFromInput.type = 'date'
  dateFromInput.name = 'date_from'
  dateFromGroup.appendChild(dateFromLabel)
  dateFromGroup.appendChild(dateFromInput)
  
  // Fecha hasta
  const dateToGroup = document.createElement('div')
  dateToGroup.className = 'filter-group'
  const dateToLabel = document.createElement('label')
  dateToLabel.textContent = 'Fecha hasta'
  const dateToInput = document.createElement('input')
  dateToInput.type = 'date'
  dateToInput.name = 'date_to'
  dateToGroup.appendChild(dateToLabel)
  dateToGroup.appendChild(dateToInput)
  
  // Botón aplicar
  const applyBtn = document.createElement('button')
  applyBtn.type = 'button'
  applyBtn.className = 'btn btn-primary'
  applyBtn.textContent = 'Aplicar Filtros'
  applyBtn.onclick = () => {
    const filters = {
      category: categorySelect.value,
      source: sourceSelect.value,
      date_from: dateFromInput.value,
      date_to: dateToInput.value
    }
    if (onFilter) onFilter(filters)
  }
  
  form.appendChild(categoryGroup)
  form.appendChild(sourceGroup)
  form.appendChild(dateFromGroup)
  form.appendChild(dateToGroup)
  form.appendChild(applyBtn)
  
  return form
}
```

**Ejemplo de Uso:**

```javascript
const filterForm = createFilterForm(
  categories,
  ['BBVA', 'Mercado Pago', 'NU', 'Plata Card'],
  (filters) => {
    console.log('Filtros aplicados:', filters)
    // Aplicar filtros a la consulta
  }
)
document.getElementById('filters-container').appendChild(filterForm)
```

---

## 5. Button - Botones Estilizados

**Descripción:** Botones con diferentes variantes de estilo.

**Variantes:**
- `primary`: Botón principal (azul)
- `secondary`: Botón secundario (gris)
- `danger`: Botón de acción destructiva (rojo)
- `success`: Botón de éxito (verde)

**HTML/CSS:**

```html
<button class="btn btn-primary">Guardar</button>
<button class="btn btn-secondary">Cancelar</button>
<button class="btn btn-danger">Eliminar</button>
<button class="btn btn-success">Confirmar</button>
```

```css
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background-color: #1d4ed8;
}

.btn-secondary {
  background-color: var(--secondary-color);
  color: white;
}

.btn-secondary:hover {
  background-color: #475569;
}

.btn-danger {
  background-color: var(--danger-color);
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
}

.btn-success {
  background-color: var(--success-color);
  color: white;
}

.btn-success:hover {
  background-color: #059669;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}
```

---

## 6. Input - Inputs con Validación Visual

**Descripción:** Inputs con estados de validación visual.

**Estados:**
- `default`: Estado normal
- `error`: Estado de error (borde rojo)
- `success`: Estado de éxito (borde verde)

**HTML/CSS:**

```html
<div class="form-group">
  <label>Email</label>
  <input type="email" class="input" placeholder="usuario@ejemplo.com">
  <span class="input-error">Este campo es requerido</span>
</div>
```

```css
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-weight: 500;
}

.input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.input.error {
  border-color: var(--danger-color);
}

.input.success {
  border-color: var(--success-color);
}

.input-error {
  display: none;
  color: var(--danger-color);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.input.error + .input-error {
  display: block;
}
```

---

## 7. LoadingSpinner - Indicador de Carga

**Descripción:** Spinner de carga reutilizable.

**HTML/CSS:**

```html
<div class="loading-spinner"></div>
```

```css
.loading-spinner {
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 2rem auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-spinner.small {
  width: 20px;
  height: 20px;
  border-width: 2px;
}
```

**JavaScript:**

```javascript
function createLoadingSpinner(size = 'normal') {
  const spinner = document.createElement('div')
  spinner.className = 'loading-spinner'
  if (size === 'small') {
    spinner.classList.add('small')
  }
  return spinner
}
```

---

## 8. ErrorMessage - Mensaje de Error

**Descripción:** Mensaje de error estilizado.

**HTML/CSS:**

```html
<div class="error-message">
  Error al cargar los datos. Por favor, intenta nuevamente.
</div>
```

```css
.error-message {
  background-color: #fee2e2;
  border: 1px solid var(--danger-color);
  color: #991b1b;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.success-message {
  background-color: #d1fae5;
  border: 1px solid var(--success-color);
  color: #065f46;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}
```

**JavaScript:**

```javascript
function createErrorMessage(message) {
  const error = document.createElement('div')
  error.className = 'error-message'
  error.textContent = message
  return error
}

function createSuccessMessage(message) {
  const success = document.createElement('div')
  success.className = 'success-message'
  success.textContent = message
  return success
}
```

---

## Notas de Implementación

### Principios SOLID Aplicados:

1. **Single Responsibility**: Cada componente tiene una única responsabilidad
2. **Open/Closed**: Componentes extensibles mediante clases CSS y props
3. **Dependency Inversion**: Componentes independientes de implementación específica

### Reutilización:

- Todos los componentes usan variables CSS del sistema (`--primary-color`, etc.)
- Componentes modulares que se pueden combinar
- Funciones helper reutilizables (`formatCurrency`, `escapeHtml`)

### Responsive:

- Componentes adaptables con CSS Grid y Flexbox
- Media queries para móvil en componentes complejos
- Diseño mobile-first
