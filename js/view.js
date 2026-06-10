import { guessCategory, licenseNames } from './model.js'

export const categoryList = document.getElementById('categoryList')
export const filterCategoria = document.getElementById('filterCategoria')
export const filterLicenca = document.getElementById('filterLicenca')
export const filterOutros = document.getElementById('filterOutros')
export const filterFormato = document.getElementById('filterFormato')
export const grid = document.getElementById('grid')
export const ctxOverlay = document.getElementById('contextOverlay')
export const ctxMenu = document.getElementById('contextMenu')
export const modalOverlay = document.getElementById('modalOverlay')
export const closeBtn = document.getElementById('closeBtn')
export const viewport = document.getElementById('viewport')
export const loadingEl = document.getElementById('loadingOverlay')
export const modalAssetName = document.getElementById('modalAssetName')
export const modalAuthor = document.getElementById('modalAuthor')
export const fileInput = document.getElementById('fileInput')
export const importFab = document.getElementById('importFab')
export const importDialogOverlay = document.getElementById('importDialogOverlay')
export const dialogFileName = document.getElementById('dialogFileName')
export const dialogFileSize = document.getElementById('dialogFileSize')
export const dialogName = document.getElementById('dialogName')
export const dialogCategory = document.getElementById('dialogCategory')
export const dialogLicense = document.getElementById('dialogLicense')
export const dialogCancel = document.getElementById('dialogCancel')
export const dialogConfirm = document.getElementById('dialogConfirm')
export const toast = document.getElementById('toast')
export const themeToggle = document.getElementById('themeToggle')
export const settingsBtn = document.getElementById('settingsBtn')
export const settingsOverlay = document.getElementById('settingsOverlay')
export const settingsClose = document.getElementById('settingsClose')
export const settingsProgramList = document.getElementById('settingsProgramList')
export const programName = document.getElementById('programName')
export const programPath = document.getElementById('programPath')
export const programBrowseBtn = document.getElementById('programBrowseBtn')
export const programAddBtn = document.getElementById('programAddBtn')
export const toolOpenIn = document.getElementById('toolOpenIn')
export const toolOpenInDropdown = document.getElementById('toolOpenInDropdown')
export const toolOpenInList = document.getElementById('toolOpenInList')
export const viewerConvertBtn = document.getElementById('viewerConvertBtn')
export const viewerConfigBtn = document.getElementById('viewerConfigBtn')

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function getIconForFormat(fmt) {
  return { '.blend': '🧊', '.max': '📐', '.fbx': '🔷', '.gltf': '◈', '.obj': '🔶' }[fmt] || '📦'
}

const icons = { success: '✅', error: '❌', loading: '⏳', info: 'ℹ️' }

export function showToast(msg, tipo = 'success') {
  toast.innerHTML = `<span>${icons[tipo] || '✅'}</span> ${msg}`
  toast.classList.add('active')
  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => toast.classList.remove('active'), 3500)
}

export function renderSidebar(categories, models, ativa = 'models') {
  categoryList.innerHTML = ''
  categories.forEach(cat => {
    const el = document.createElement('div')
    el.className = 'cat-item' + (cat.id === ativa ? ' active' : '')
    el.innerHTML = `
      <span class="dot" style="background:${cat.cor}"></span>
      <span>${cat.nome}</span>
      <span class="count">${models.filter(m => m.categoria === cat.id).length}</span>
    `
    el.dataset.categoria = cat.id
    el.addEventListener('click', () => {
      document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'))
      el.classList.add('active')
      filterCategoria.value = cat.id
      filterCategoria.dispatchEvent(new Event('change'))
    })
    categoryList.appendChild(el)
  })
}

export function populateFilters(categories) {
  filterCategoria.innerHTML = '<option value="todas">Todas as categorias</option>'
  categories.forEach(cat => {
    const opt = document.createElement('option')
    opt.value = cat.id
    opt.textContent = cat.nome
    filterCategoria.appendChild(opt)
  })
  filterCategoria.value = 'todas'
}

export function renderGrid(data, { onMenuClick, onCardClick }) {
  if (data.length === 0) {
    grid.className = 'empty-state'
    grid.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>Nenhum modelo encontrado</span>`
    return
  }
  grid.className = ''
  grid.innerHTML = ''
  data.forEach(model => {
    const card = document.createElement('div')
    card.className = 'model-card'
    card.innerHTML = `
      <div class="thumb" style="background:${model.thumbnailGrad}">
        <span class="format-tag">${model.formato}</span>
        <span class="placeholder-icon">${getIconForFormat(model.formato)}</span>
      </div>
      <div class="info">
        <div class="name">${model.nome}</div>
        <div class="author">${model.autor}</div>
      </div>
      <button class="menu-btn" data-id="${model.id}">⋯</button>`
    card.querySelector('.menu-btn').addEventListener('click', e => {
      e.stopPropagation()
      onMenuClick(model, e)
    })
    card.addEventListener('click', () => onCardClick(model))
    grid.appendChild(card)
  })
}

export function renderProgramList(programs, { onRemove }) {
  settingsProgramList.innerHTML = ''
  programs.forEach((prog, i) => {
    const item = document.createElement('div')
    item.className = 'program-item'
    item.innerHTML = `
      <div class="program-item-info">
        <div class="program-item-name">${escapeHtml(prog.nome)}</div>
        <div class="program-item-path" title="${escapeHtml(prog.caminho)}">${escapeHtml(prog.caminho)}</div>
      </div>
      <button class="program-item-remove" data-index="${i}" title="Remover">✕</button>`
    item.querySelector('.program-item-remove').addEventListener('click', () => onRemove(i, prog))
    settingsProgramList.appendChild(item)
  })
}

export function updateProgramAddBtn() {
  programAddBtn.disabled = !programName.value.trim() || !programPath.value.trim()
}

export function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema)
  const s = document.documentElement.style
  if (tema === 'light') {
    s.setProperty('--bg-app', '#f5f5f7')
    s.setProperty('--bg-sidebar', '#fff')
    s.setProperty('--bg-card', '#fff')
    s.setProperty('--bg-hover', 'rgba(0,0,0,0.04)')
    s.setProperty('--border', '1px solid rgba(0,0,0,0.08)')
    s.setProperty('--border-hover', '1px solid rgba(0,0,0,0.15)')
    s.setProperty('--text', '#1a1a1e')
    s.setProperty('--text-sec', 'rgba(0,0,0,0.55)')
    s.setProperty('--text-ter', 'rgba(0,0,0,0.35)')
    themeToggle.textContent = '☀️'
  } else {
    s.setProperty('--bg-app', '#0a0a0c')
    s.setProperty('--bg-sidebar', '#121216')
    s.setProperty('--bg-card', '#1a1a1e')
    s.setProperty('--bg-hover', 'rgba(255,255,255,0.04)')
    s.setProperty('--border', '1px solid rgba(255,255,255,0.06)')
    s.setProperty('--border-hover', '1px solid rgba(255,255,255,0.12)')
    s.setProperty('--text', '#fff')
    s.setProperty('--text-sec', 'rgba(255,255,255,0.55)')
    s.setProperty('--text-ter', 'rgba(255,255,255,0.35)')
    themeToggle.textContent = '🌙'
  }
}

export function showViewerMessage(msg, formato) {
  const el = document.getElementById('viewerMessage')
  el.querySelector('.msg-icon').textContent = formato === '.blend' ? '📦' : '⚠️'
  el.querySelector('.msg-text').textContent = msg
  viewerConvertBtn.style.display = formato === '.blend' ? 'inline-flex' : 'none'
  viewerConfigBtn.style.display = formato === '.blend' ? 'inline-flex' : 'none'
  el.classList.add('active')
}

export function hideViewerMessage() {
  document.getElementById('viewerMessage').classList.remove('active')
}

export function openImportDialog(file, categories) {
  const parts = file.name.split('.')
  const ext = parts.pop().toLowerCase()
  dialogFileName.textContent = file.name
  dialogFileSize.textContent = formatFileSize(file.size)
  dialogName.value = parts.join('.')

  dialogCategory.innerHTML = ''
  categories.forEach(cat => {
    const opt = document.createElement('option')
    opt.value = cat.id
    opt.textContent = cat.nome
    if (cat.id === guessCategory(ext)) opt.selected = true
    dialogCategory.appendChild(opt)
  })

  dialogLicense.innerHTML = ''
  Object.entries(licenseNames).forEach(([val, label]) => {
    const opt = document.createElement('option')
    opt.value = val
    opt.textContent = label
    dialogLicense.appendChild(opt)
  })

  importDialogOverlay.classList.add('active')
  setTimeout(() => dialogName.focus(), 100)
}

export function closeImportDialog() {
  importDialogOverlay.classList.remove('active')
}

export function closeOpenInDropdown() {
  toolOpenInDropdown.classList.remove('active')
}

export function openOpenInDropdown(programs, { onSelect }) {
  toolOpenInList.innerHTML = ''
  if (programs.length === 0) {
    toolOpenInList.innerHTML = '<div class="dropdown-empty">Nenhum programa configurado</div>'
  } else {
    programs.forEach(prog => {
      const item = document.createElement('div')
      item.className = 'dropdown-item'
      item.innerHTML = `
        <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        <div class="dropdown-item-info">
          <div class="dropdown-item-name">${escapeHtml(prog.nome)}</div>
          <div class="dropdown-item-path">${escapeHtml(prog.caminho)}</div>
        </div>`
      item.addEventListener('click', () => {
        onSelect(prog)
        closeOpenInDropdown()
      })
      toolOpenInList.appendChild(item)
    })
  }
  toolOpenInDropdown.classList.add('active')
}

export function updateContextMenuPrograms(programs, ctxOverlay, ctxMenu, { onSelect }) {
  const oldItems = ctxMenu.querySelectorAll('.ctx-item[data-action="openin"]')
  oldItems.forEach(el => el.remove())
  if (programs.length === 0) return
  const divider = ctxMenu.querySelector('.ctx-divider')
  programs.forEach(prog => {
    const item = document.createElement('div')
    item.className = 'ctx-item'
    item.dataset.action = 'openin'
    item.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      <span>Abrir em ${escapeHtml(prog.nome)}</span>`
    item.addEventListener('click', () => {
      onSelect(prog)
      ctxOverlay.classList.remove('active')
      ctxMenu.classList.remove('active')
    })
    ctxMenu.insertBefore(item, divider)
  })
}
