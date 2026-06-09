// ================================================================
//  STREAMLINE 3D — App completo em 1 arquivo
//  Tudo junto pra ficar mais fácil de entender
// ================================================================

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

window.THREE = THREE

// ================================================================
//  1. DADOS
//  Aqui ficam as informações que o programa usa:
//  categorias, modelos (assets), configurações, etc.
// ================================================================

const categories = [
  { id: 'hdri', nome: 'HDRI', cor: '#5B8DEF' },
  { id: 'textures', nome: 'Textures', cor: '#4CAF50' },
  { id: 'models', nome: 'Models', cor: '#6C5CE7' },
  { id: 'materials', nome: 'Materials', cor: '#FF7043' },
  { id: 'brushes', nome: 'Brushes', cor: '#FFC107' },
  { id: 'plugins', nome: 'Plugins', cor: '#AB47BC' },
]

const thumbnailGradients = [
  'linear-gradient(135deg, #2d1b69, #6C5CE7)',
  'linear-gradient(135deg, #1a3a4a, #3498db)',
  'linear-gradient(135deg, #3d1f00, #e67e22)',
  'linear-gradient(135deg, #1a3a2a, #27ae60)',
  'linear-gradient(135deg, #4a1a1a, #e74c3c)',
  'linear-gradient(135deg, #2a2a2a, #7f8c8d)',
  'linear-gradient(135deg, #3a2a1a, #d4a056)',
  'linear-gradient(135deg, #1a2a4a, #2980b9)',
  'linear-gradient(135deg, #2a1a3a, #9b59b6)',
  'linear-gradient(135deg, #1a3a3a, #1abc9c)',
  'linear-gradient(135deg, #4a2a1a, #c0392b)',
  'linear-gradient(135deg, #2a2a4a, #34495e)',
]

const models = []

const licenseNames = {
  'cc0': 'CC0 (Domínio Público)',
  'cc-by': 'CC BY (Atribuição)',
  'cc-by-nc': 'CC BY-NC (NãoComercial)',
  'cc-by-sa': 'CC BY-SA (CompartilhaIgual)',
  'royalty-free': 'Royalty Free',
}

// Programas externos (ex: Blender, 3ds Max)
const PROGRAMS_KEY = 'streamline3d_programs'
let externalPrograms = []

function carregarProgramas() {
  try {
    const salvo = localStorage.getItem(PROGRAMS_KEY)
    if (salvo) externalPrograms = JSON.parse(salvo)
  } catch (e) {}
}
function salvarProgramas() {
  try { localStorage.setItem(PROGRAMS_KEY, JSON.stringify(externalPrograms)) } catch (e) {}
}

// Configurações salvam no navegador (localStorage)
const SETTINGS_KEY = 'streamline3d_settings'
let settings = { theme: 'dark' }

function carregarConfig() {
  try {
    const salvo = localStorage.getItem(SETTINGS_KEY)
    if (salvo) settings = { theme: 'dark', ...JSON.parse(salvo) }
  } catch (e) {}
}
function salvarConfig() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch (e) {}
}

carregarConfig()
carregarProgramas()

// ================================================================
//  2. ELEMENTOS DA TELA (DOM)
//  Atalhos para os elementos HTML
// ================================================================

const categoryList = document.getElementById('categoryList')
const filterCategoria = document.getElementById('filterCategoria')
const filterLicenca = document.getElementById('filterLicenca')
const filterOutros = document.getElementById('filterOutros')
const filterFormato = document.getElementById('filterFormato')
const grid = document.getElementById('grid')
const ctxOverlay = document.getElementById('contextOverlay')
const ctxMenu = document.getElementById('contextMenu')
const modalOverlay = document.getElementById('modalOverlay')
const closeBtn = document.getElementById('closeBtn')
const viewport = document.getElementById('viewport')
const loadingEl = document.getElementById('loadingOverlay')
const modalAssetName = document.getElementById('modalAssetName')
const modalAuthor = document.getElementById('modalAuthor')
const fileInput = document.getElementById('fileInput')
const importFab = document.getElementById('importFab')
const importDialogOverlay = document.getElementById('importDialogOverlay')
const dialogFileName = document.getElementById('dialogFileName')
const dialogFileSize = document.getElementById('dialogFileSize')
const dialogName = document.getElementById('dialogName')
const dialogCategory = document.getElementById('dialogCategory')
const dialogLicense = document.getElementById('dialogLicense')
const dialogCancel = document.getElementById('dialogCancel')
const dialogConfirm = document.getElementById('dialogConfirm')
const toast = document.getElementById('toast')
const themeToggle = document.getElementById('themeToggle')
const settingsBtn = document.getElementById('settingsBtn')
const settingsOverlay = document.getElementById('settingsOverlay')
const settingsClose = document.getElementById('settingsClose')
const settingsProgramList = document.getElementById('settingsProgramList')
const programName = document.getElementById('programName')
const programPath = document.getElementById('programPath')
const programBrowseBtn = document.getElementById('programBrowseBtn')
const programAddBtn = document.getElementById('programAddBtn')
const toolOpenIn = document.getElementById('toolOpenIn')
const toolOpenInDropdown = document.getElementById('toolOpenInDropdown')
const toolOpenInList = document.getElementById('toolOpenInList')
const viewerConvertBtn = document.getElementById('viewerConvertBtn')
const viewerConfigBtn = document.getElementById('viewerConfigBtn')

// Estado da interface (coisas temporárias)
let ctxModel = null        // modelo clicado no ⋮
let viewerModel = null     // modelo sendo visto no 3D
let pendingFile = null     // arquivo esperando confirmação
let isOpen = false         // modal 3D aberto?
let animId = null          // controle da animação
let cameraReset = false    // resetando câmera?
let viewerLoaded = false   // Three.js já iniciou?
let hideViewerTimeout = null
const resetProgress = { value: 0 }
const initialCamPos = new THREE.Vector3(3.8, 2.6, 4.8)

// ================================================================
//  3. CENA 3D (Three.js)
//  Configuração do visualizador 3D
// ================================================================

const scene = new THREE.Scene()
const modelContainer = new THREE.Group()
scene.add(modelContainer)

const camera = new THREE.PerspectiveCamera(40, viewport.clientWidth / viewport.clientHeight, 0.1, 50)
camera.position.copy(initialCamPos)

const renderer = new THREE.WebGLRenderer({
  antialias: true, alpha: true, powerPreference: 'high-performance',
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(viewport.clientWidth, viewport.clientHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
viewport.prepend(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 0.55, 0)
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.rotateSpeed = 0.8
controls.zoomSpeed = 1.0
controls.panSpeed = 0.5
controls.minDistance = 1.8
controls.maxDistance = 12
controls.maxPolarAngle = Math.PI * 0.85
controls.autoRotate = true
controls.autoRotateSpeed = 1.8
controls.update()

new ResizeObserver(() => {
  const w = viewport.clientWidth
  const h = viewport.clientHeight
  if (w === 0 || h === 0) return
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h, false)
}).observe(viewport)

// Luzes da cena
const keyLight = new THREE.DirectionalLight(0xffeedd, 1.6)
keyLight.position.set(5, 7, 5)
keyLight.castShadow = true
keyLight.shadow.mapSize.width = 2048
keyLight.shadow.mapSize.height = 2048
keyLight.shadow.camera.near = 0.5
keyLight.shadow.camera.far = 18
keyLight.shadow.camera.left = -4
keyLight.shadow.camera.right = 4
keyLight.shadow.camera.top = 4
keyLight.shadow.camera.bottom = -4
keyLight.shadow.bias = -0.0005
keyLight.shadow.radius = 4
scene.add(keyLight)

scene.add(new THREE.DirectionalLight(0xccddff, 0.5).position.set(-4, 2, -3))
scene.add(new THREE.DirectionalLight(0xffffff, 0.35).position.set(0, -1, 7))
scene.add(new THREE.DirectionalLight(0xffffff, 0.25).position.set(0, 9, 0))
scene.add(new THREE.AmbientLight(0x333344, 0.2))
scene.add(new THREE.HemisphereLight(0x444466, 0x222222, 0.35))

function addShadowGround() {
  const g = new THREE.Mesh(
    new THREE.CircleGeometry(4.5, 32),
    new THREE.ShadowMaterial({ opacity: 0.35, color: 0x000000 })
  )
  g.rotation.x = -Math.PI / 2
  g.position.y = -0.03
  g.receiveShadow = true
  scene.add(g)
}

function clearProceduralModel() {
  while (modelContainer.children.length > 0) {
    const c = modelContainer.children[0]
    if (c.geometry) c.geometry.dispose()
    if (c.material) c.material.dispose()
    modelContainer.remove(c)
  }
}

function buildProceduralSofa() {
  const g = new THREE.Group()
  const dk = new THREE.MeshPhysicalMaterial({ color: 0x2C2824, roughness: 0.6, metalness: 0 })
  const md = new THREE.MeshPhysicalMaterial({ color: 0x4A4036, roughness: 0.7, metalness: 0 })
  const lt = new THREE.MeshPhysicalMaterial({ color: 0x3D352E, roughness: 0.65, metalness: 0 })
  const ml = new THREE.MeshPhysicalMaterial({ color: 0x1a1a1a, roughness: 0.2, metalness: 0.9 })
  const p1 = new THREE.MeshPhysicalMaterial({ color: 0x8B7355, roughness: 0.75, metalness: 0, clearcoat: 0.1 })
  const p2 = new THREE.MeshPhysicalMaterial({ color: 0x5C6B5A, roughness: 0.75, metalness: 0, clearcoat: 0.1 })

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 1.6), dk)
  base.position.y = 0.1
  base.castShadow = true; base.receiveShadow = true
  g.add(base)

  const seatGeo = new RoundedBoxGeometry(0.8, 0.28, 1.22, 4, 0.08)
  for (const x of [-0.86, 0, 0.86]) {
    const s = new THREE.Mesh(seatGeo, md)
    s.position.set(x, 0.38, 0)
    s.castShadow = true; s.receiveShadow = true
    g.add(s)
  }

  const back = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.85, 0.26, 4, 0.06), lt)
  back.position.set(0, 0.74, -0.67)
  back.castShadow = true; back.receiveShadow = true
  g.add(back)

  const armGeo = new RoundedBoxGeometry(0.2, 0.5, 1.32, 4, 0.05)
  for (const x of [-1.35, 1.35]) {
    const a = new THREE.Mesh(armGeo, dk)
    a.position.set(x, 0.45, 0)
    a.castShadow = true; a.receiveShadow = true
    g.add(a)
  }

  const legGeo = new THREE.CylinderGeometry(0.055, 0.07, 0.14, 12)
  for (const p of [[-1.25, 0.07, -0.7], [1.25, 0.07, -0.7], [-1.25, 0.07, 0.7], [1.25, 0.07, 0.7]]) {
    const l = new THREE.Mesh(legGeo, ml)
    l.position.set(p[0], p[1], p[2])
    l.castShadow = true; l.receiveShadow = true
    g.add(l)
  }

  const pg = new RoundedBoxGeometry(0.36, 0.36, 0.1, 4, 0.07)
  const a = new THREE.Mesh(pg, p1)
  a.position.set(-0.5, 0.6, 0.48)
  a.rotation.z = 0.06
  a.castShadow = true; a.receiveShadow = true
  g.add(a)

  const b = new THREE.Mesh(pg, p2)
  b.position.set(0.5, 0.6, 0.48)
  b.rotation.z = -0.04
  b.castShadow = true; b.receiveShadow = true
  g.add(b)

  return g
}

// ================================================================
//  4. FUNÇÕES DA TELA
//  Renderizar sidebar, grid, menu, etc.
// ================================================================

function renderSidebar(ativa = 'models') {
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
      applyFilters()
    })
    categoryList.appendChild(el)
  })
}

function populateFilters() {
  filterCategoria.innerHTML = '<option value="todas">Todas as categorias</option>'
  categories.forEach(cat => {
    const opt = document.createElement('option')
    opt.value = cat.id
    opt.textContent = cat.nome
    filterCategoria.appendChild(opt)
  })
  filterCategoria.value = 'todas'
}

function getIconForFormat(fmt) {
  return { '.blend': '🧊', '.max': '📐', '.fbx': '🔷', '.gltf': '◈', '.obj': '🔶' }[fmt] || '📦'
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function renderGrid(data) {
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
      ctxModel = model
      updateContextMenuPrograms()
      const convertItem = ctxMenu.querySelector('.ctx-item[data-action="convert"]')
      if (convertItem) convertItem.classList.toggle('show', model.formato === '.blend' && !!model.importedFile)
      const x = Math.min(e.clientX, innerWidth - 160)
      const y = Math.min(e.clientY, innerHeight - 100)
      ctxMenu.style.left = x + 'px'
      ctxMenu.style.top = y + 'px'
      ctxOverlay.classList.add('active')
      ctxMenu.classList.add('active')
    })
    card.addEventListener('click', () => openViewer3D(model))
    grid.appendChild(card)
  })
}

function showToast(msg, tipo = 'success') {
  const icons = { success: '✅', error: '❌', loading: '⏳', info: 'ℹ️' }
  toast.innerHTML = `<span>${icons[tipo] || '✅'}</span> ${msg}`
  toast.classList.add('active')
  clearTimeout(toast._timer)
  toast._timer = setTimeout(() => toast.classList.remove('active'), 3500)
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function renderProgramList() {
  settingsProgramList.innerHTML = ''
  externalPrograms.forEach((prog, i) => {
    const item = document.createElement('div')
    item.className = 'program-item'
    item.innerHTML = `
      <div class="program-item-info">
        <div class="program-item-name">${escapeHtml(prog.nome)}</div>
        <div class="program-item-path" title="${escapeHtml(prog.caminho)}">${escapeHtml(prog.caminho)}</div>
      </div>
      <button class="program-item-remove" data-index="${i}" title="Remover">✕</button>`
    item.querySelector('.program-item-remove').addEventListener('click', () => {
      externalPrograms.splice(i, 1)
      salvarProgramas()
      renderProgramList()
      showToast(`"${prog.nome}" removido`)
      updateProgramAddBtn()
    })
    settingsProgramList.appendChild(item)
  })
}

function updateProgramAddBtn() {
  programAddBtn.disabled = !programName.value.trim() || !programPath.value.trim()
}

function guessCategory(ext) {
  const map = {
    blend: 'models', max: 'models', fbx: 'models', gltf: 'models', glb: 'models',
    obj: 'models', '3ds': 'models', dae: 'models', stl: 'models', ply: 'models',
    hdr: 'hdri', exr: 'hdri',
    png: 'textures', jpg: 'textures', jpeg: 'textures', tga: 'textures', psd: 'textures',
  }
  return map[ext] || 'models'
}

// Mensagem no visualizador 3D
function showViewerMessage(msg, formato) {
  const el = document.getElementById('viewerMessage')
  el.querySelector('.msg-icon').textContent = formato === '.blend' ? '📦' : '⚠️'
  el.querySelector('.msg-text').textContent = msg
  const convertBtn = document.getElementById('viewerConvertBtn')
  const configBtn = document.getElementById('viewerConfigBtn')
  convertBtn.style.display = formato === '.blend' ? 'inline-flex' : 'none'
  configBtn.style.display = formato === '.blend' ? 'inline-flex' : 'none'
  el.classList.add('active')
}
function hideViewerMessage() {
  document.getElementById('viewerMessage').classList.remove('active')
}

// Adicionar programas externos no menu de contexto
function updateContextMenuPrograms() {
  const oldItems = ctxMenu.querySelectorAll('.ctx-item[data-action="openin"]')
  oldItems.forEach(el => el.remove())
  if (externalPrograms.length === 0) return
  const divider = ctxMenu.querySelector('.ctx-divider')
  externalPrograms.forEach(prog => {
    const item = document.createElement('div')
    item.className = 'ctx-item'
    item.dataset.action = 'openin'
    item.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      <span>Abrir em ${escapeHtml(prog.nome)}</span>`
    item.addEventListener('click', () => {
      if (!ctxModel) return
      generateOpenScript(prog, ctxModel)
      ctxOverlay.classList.remove('active')
      ctxMenu.classList.remove('active')
      ctxModel = null
    })
    ctxMenu.insertBefore(item, divider)
  })
}

// Dropdown "Abrir em" no modal
function closeOpenInDropdown() {
  toolOpenInDropdown.classList.remove('active')
}

function openOpenInDropdown() {
  toolOpenInList.innerHTML = ''
  if (externalPrograms.length === 0) {
    toolOpenInList.innerHTML = '<div class="dropdown-empty">Nenhum programa configurado</div>'
  } else {
    externalPrograms.forEach(prog => {
      const item = document.createElement('div')
      item.className = 'dropdown-item'
      item.innerHTML = `
        <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        <div class="dropdown-item-info">
          <div class="dropdown-item-name">${escapeHtml(prog.nome)}</div>
          <div class="dropdown-item-path">${escapeHtml(prog.caminho)}</div>
        </div>`
      item.addEventListener('click', () => {
        if (viewerModel) generateOpenScript(prog, viewerModel)
        closeOpenInDropdown()
      })
      toolOpenInList.appendChild(item)
    })
  }
  toolOpenInDropdown.classList.add('active')
}

// Tema
function aplicarTema(tema) {
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

// ================================================================
//  5. FUNÇÕES DE CONTROLE
//  Lógica: filtrar, importar, visualizar 3D
// ================================================================

function applyFilters() {
  const cat = filterCategoria.value
  const lic = filterLicenca.value
  const fmt = filterFormato.value
  const outros = filterOutros.value

  const filtrados = models.filter(m => {
    if (cat !== 'todas' && m.categoria !== cat) return false
    if (lic !== 'todas' && m.licenca !== lic) return false
    if (fmt !== 'todos' && m.formato !== fmt) return false
    if (outros === 'download' && !m.disponivelDownload) return false
    if (outros === 'animacao' && !m.animacao) return false
    return true
  })
  renderGrid(filtrados)
}

function confirmImport() {
  if (!pendingFile) return
  const name = dialogName.value.trim() || 'Sem nome'
  const cat = dialogCategory.value
  const lic = dialogLicense.value
  const parts = pendingFile.name.split('.')
  const ext = '.' + parts.pop().toLowerCase()
  const grad = thumbnailGradients[models.length % thumbnailGradients.length]

  models.unshift({
    id: Date.now(),
    nome: name,
    autor: 'importado',
    categoria: cat,
    licenca: lic,
    formato: ext,
    disponivelDownload: true,
    animacao: false,
    thumbnailGrad: grad,
    importedFile: pendingFile,
  })

  closeImportDialog()
  filterCategoria.value = 'todas'
  filterFormato.value = 'todos'
  filterLicenca.value = 'todas'
  filterOutros.value = 'todos'
  applyFilters()
  const ativa = document.querySelector('.cat-item.active')
  renderSidebar(ativa ? ativa.dataset.categoria : 'models')
  showToast(`"${name}${ext}" importado com sucesso`)
  document.getElementById('gridWrapper').scrollTop = 0
}

function openImportDialog(file) {
  pendingFile = file
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

  importDialogOverlay.classList.add('active')
  setTimeout(() => dialogName.focus(), 100)
}

function closeImportDialog() {
  importDialogOverlay.classList.remove('active')
  pendingFile = null
}

// ===== CONVERSÃO .blend → glTF =====

async function convertBlendToGLTF(model) {
  if (!model || !model.importedFile) {
    showToast('Arquivo .blend original não encontrado', 'error')
    return
  }

  const blender = externalPrograms.find(p => p.nome.toLowerCase().includes('blender'))
  if (!blender) {
    showToast('Configure o Blender nas Configurações primeiro', 'error')
    settingsBtn.click()
    setTimeout(() => {
      const section = document.querySelector('#settingsPanel .settings-external')
      if (section) section.scrollIntoView({ behavior: 'smooth' })
    }, 400)
    return
  }

  showToast('Convertendo .blend para .glb…', 'loading')

  try {
    const formData = new FormData()
    formData.append('blend', model.importedFile)
    formData.append('blenderPath', blender.caminho)

    const res = await fetch('http://localhost:3000/api/converter', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      showToast(err.error || 'Erro na conversão', 'error')
      return
    }

    const blob = await res.blob()
    const baseName = model.nome.replace(/\.[^.]+$/, '')
    const downloadName = baseName + '.glb'
    const idx = models.indexOf(model)

    model.nome = baseName
    model.formato = '.glb'
    model.disponivelDownload = true
    model.animacao = false
    model.thumbnailGrad = thumbnailGradients[(idx > -1 ? idx : models.length) % thumbnailGradients.length]
    model.importedFile = new File([blob], downloadName, { type: 'model/gltf-binary' })

    applyFilters()
    const ativa = document.querySelector('.cat-item.active')
    renderSidebar(ativa ? ativa.dataset.categoria : 'models')
    showToast(`${baseName} convertido para glTF com sucesso`)
  } catch (err) {
    console.error('Erro na conversão:', err)
    showToast('Falha na conversão. Servidor rodando?', 'error')
  }
}

// ===== GERAR SCRIPT .BAT =====

function generateOpenScript(program, model) {
  if (!model.importedFile) {
    showToast('Asset não possui arquivo local para abrir', 'error')
    return
  }

  const fileName = model.importedFile.name
  const progPath = program.caminho

  const batContent = `@echo off
echo Abrindo "${fileName}" em ${program.nome}...
start "" "${progPath}" "${fileName}"
echo.
echo Se o programa nao abriu, verifique o caminho do executavel nas configuracoes.
pause`

  const blob = new Blob([batContent], { type: 'text/plain' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `abrir_${program.nome.replace(/[^a-zA-Z0-9]/g, '_')}_${fileName.replace(/\.[^.]+$/, '')}.bat`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)

  showToast(`Script .bat gerado para abrir em ${program.nome}`)
}

// ===== VISUALIZADOR 3D =====

async function initViewer() {
  if (viewerLoaded) return
  viewerLoaded = true
  loadingEl.classList.remove('hidden')
  addShadowGround()
  modelContainer.add(buildProceduralSofa())
  await new Promise(r => setTimeout(r, 600))
  loadingEl.classList.add('hidden')
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

function resetCamera() {
  controls.autoRotate = false
  cameraReset = true
  resetProgress.value = 0
}

function animate() {
  if (!isOpen) return
  animId = requestAnimationFrame(animate)

  if (cameraReset) {
    resetProgress.value = Math.min(resetProgress.value + 0.025, 1)
    const t = easeInOutCubic(resetProgress.value)
    camera.position.lerpVectors(camera.position.clone(), initialCamPos, t)
    controls.target.lerp(new THREE.Vector3(0, 0.55, 0), t * 0.08)
    if (resetProgress.value >= 1) {
      cameraReset = false
      controls.autoRotate = true
    }
  }

  controls.update()
  renderer.render(scene, camera)
}

async function openViewer3D(model) {
  viewerModel = model
  modalAssetName.textContent = model.nome + ' · 3D Model'
  modalAuthor.textContent = model.autor
  hideViewerMessage()
  modalOverlay.classList.add('active')
  isOpen = true
  await initViewer()

  if (model.importedFile) {
    const ext = model.importedFile.name.split('.').pop().toLowerCase()
    let loadedScene = null

    try {
      loadingEl.classList.remove('hidden')

      if (ext === 'gltf' || ext === 'glb') {
        const url = URL.createObjectURL(model.importedFile)
        const gltf = await new GLTFLoader().loadAsync(url)
        URL.revokeObjectURL(url)
        loadedScene = gltf.scene
      } else if (ext === 'obj') {
        const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js')
        const url = URL.createObjectURL(model.importedFile)
        loadedScene = await new OBJLoader().loadAsync(url)
        URL.revokeObjectURL(url)
      } else if (ext === 'fbx') {
        const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js')
        const url = URL.createObjectURL(model.importedFile)
        loadedScene = await new FBXLoader().loadAsync(url)
        URL.revokeObjectURL(url)
      }

      if (loadedScene) {
        clearProceduralModel()
        loadedScene.scale.set(2, 2, 2)
        loadedScene.traverse(c => {
          if (c.isMesh) {
            c.castShadow = true
            c.receiveShadow = true
            if (!c.material || c.material.type === 'MeshBasicMaterial') {
              c.material = new THREE.MeshStandardMaterial({
                color: c.material?.color || 0xcccccc,
                roughness: 0.5, metalness: 0.1,
              })
            }
          }
        })
        modelContainer.add(loadedScene)
        const box = new THREE.Box3().setFromObject(loadedScene)
        const size = box.getSize(new THREE.Vector3()).length()
        const center = box.getCenter(new THREE.Vector3())
        controls.target.copy(center)
        camera.position.set(center.x + size * 1.2, center.y + size * 0.7, center.z + size * 1.5)
        controls.update()
      }
    } catch (err) {
      console.warn('Erro ao carregar:', err)
    }

    setTimeout(() => loadingEl.classList.add('hidden'), 200)

    if (!loadedScene) {
      clearProceduralModel()
      showViewerMessage(
        ext === 'blend'
          ? 'Arquivos .blend não podem ser visualizados no navegador.'
          : `Visualização de .${ext} não disponível. Exporte para .glb.`,
        '.' + ext
      )
    }
  }

  animate()
}

function closeModal() {
  modalOverlay.classList.remove('active')
  isOpen = false
  hideViewerMessage()
  if (hideViewerTimeout) { clearTimeout(hideViewerTimeout); hideViewerTimeout = null }
  if (animId) { cancelAnimationFrame(animId); animId = null }
}

// ================================================================
//  6. EVENT LISTENERS
//  O que acontece quando o usuário interage
// ================================================================

filterCategoria.addEventListener('change', applyFilters)
filterLicenca.addEventListener('change', applyFilters)
filterFormato.addEventListener('change', applyFilters)
filterOutros.addEventListener('change', applyFilters)

ctxOverlay.addEventListener('click', () => {
  ctxOverlay.classList.remove('active')
  ctxMenu.classList.remove('active')
  ctxModel = null
})

document.querySelectorAll('#contextMenu .ctx-item[data-action]').forEach(item => {
  item.addEventListener('click', () => {
    if (!ctxModel) return
    if (item.dataset.action === 'view') openViewer3D(ctxModel)
    if (item.dataset.action === 'convert') convertBlendToGLTF(ctxModel)
    if (item.dataset.action === 'delete') {
      if (confirm(`Excluir "${ctxModel.nome}"?`)) {
        const i = models.indexOf(ctxModel)
        if (i > -1) models.splice(i, 1)
        applyFilters()
        const ativa = document.querySelector('.cat-item.active')
        renderSidebar(ativa ? ativa.dataset.categoria : 'models')
        showToast(`"${ctxModel.nome}" excluído`)
      }
    }
    ctxOverlay.classList.remove('active')
    ctxMenu.classList.remove('active')
    ctxModel = null
  })
})

closeBtn.addEventListener('click', closeModal)
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal() })
document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) closeModal() })

controls.addEventListener('start', () => { controls.autoRotate = false })
controls.addEventListener('end', () => {
  setTimeout(() => { if (isOpen) controls.autoRotate = true }, 3000)
})

importFab.addEventListener('click', () => fileInput.click())
fileInput.addEventListener('change', e => {
  const file = e.target.files[0]
  if (!file) return
  fileInput.value = ''
  openImportDialog(file)
})
dialogCancel.addEventListener('click', closeImportDialog)
dialogConfirm.addEventListener('click', confirmImport)
importDialogOverlay.addEventListener('click', e => { if (e.target === importDialogOverlay) closeImportDialog() })
dialogName.addEventListener('keydown', e => { if (e.key === 'Enter') confirmImport() })

themeToggle.addEventListener('click', () => {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark'
  aplicarTema(settings.theme)
  salvarConfig()
})

// ===== CONFIGURAÇÕES (programas externos) =====

settingsBtn.addEventListener('click', () => {
  settingsOverlay.classList.add('active')
})
settingsClose.addEventListener('click', () => settingsOverlay.classList.remove('active'))
settingsOverlay.addEventListener('click', e => {
  if (e.target === settingsOverlay) settingsOverlay.classList.remove('active')
})

// Adicionar programa
programAddBtn.addEventListener('click', () => {
  const nome = programName.value.trim()
  const caminho = programPath.value.trim().replace(/^["'\s]+|["'\s]+$/g, '')
  if (!nome || !caminho) return
  if (externalPrograms.some(p => p.nome.toLowerCase() === nome.toLowerCase())) {
    showToast(`"${nome}" já está configurado`, 'error')
    return
  }
  externalPrograms.push({ nome, caminho })
  salvarProgramas()
  renderProgramList()
  programName.value = ''
  programPath.value = ''
  updateProgramAddBtn()
  showToast(`"${nome}" adicionado com sucesso`)
})

programName.addEventListener('input', updateProgramAddBtn)
programPath.addEventListener('input', updateProgramAddBtn)

// Botão "Selecionar executável"
const progFileInput = document.createElement('input')
progFileInput.type = 'file'
progFileInput.hidden = true
progFileInput.accept = '.exe,.cmd,.bat,.app,.lnk'
progFileInput.id = 'programFileInput'
document.body.appendChild(progFileInput)

programBrowseBtn.addEventListener('click', () => progFileInput.click())
progFileInput.addEventListener('change', () => {
  if (progFileInput.files[0]) {
    const file = progFileInput.files[0]
    if (file.path && file.path !== file.name) {
      programPath.value = file.path
    } else {
      showToast('Cole o caminho completo do executável no campo', 'info')
      programPath.focus()
    }
    updateProgramAddBtn()
  }
  progFileInput.value = ''
})

// Dropdown "Abrir em" no modal
toolOpenIn.addEventListener('click', e => {
  e.stopPropagation()
  if (toolOpenInDropdown.classList.contains('active')) {
    closeOpenInDropdown()
  } else {
    openOpenInDropdown()
  }
})

document.addEventListener('click', e => {
  if (toolOpenInDropdown.classList.contains('active') &&
      !toolOpenIn.contains(e.target) &&
      !toolOpenInDropdown.contains(e.target)) {
    closeOpenInDropdown()
  }
})

// Botões de conversão no modal (.blend)
viewerConvertBtn.addEventListener('click', () => {
  if (viewerModel && viewerModel.importedFile) convertBlendToGLTF(viewerModel)
})
viewerConfigBtn.addEventListener('click', () => {
  closeModal()
  settingsBtn.click()
  setTimeout(() => {
    const section = document.querySelector('#settingsPanel .settings-external')
    if (section) section.scrollIntoView({ behavior: 'smooth' })
  }, 500)
})

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && importDialogOverlay.classList.contains('active')) closeImportDialog()
  if (e.key === 'Escape' && settingsOverlay.classList.contains('active')) settingsOverlay.classList.remove('active')
})

// ================================================================
//  7. INICIAR
//  Roda quando a página carrega
// ================================================================

populateFilters()
renderSidebar('models')
applyFilters()
renderProgramList()
aplicarTema(settings.theme)
console.log('✅ Streamline 3D carregado!')
