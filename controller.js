import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import * as M from './model.js'
import * as V from './view.js'

window.THREE = THREE

let ctxModel = null
let viewerModel = null
let pendingFile = null
let isOpen = false
let animId = null
let cameraReset = false
let viewerLoaded = false
let hideViewerTimeout = null
const resetProgress = { value: 0 }
const initialCamPos = new THREE.Vector3(3.8, 2.6, 4.8)

const scene = new THREE.Scene()
const modelContainer = new THREE.Group()
scene.add(modelContainer)

const camera = new THREE.PerspectiveCamera(40, V.viewport.clientWidth / V.viewport.clientHeight, 0.1, 50)
camera.position.copy(initialCamPos)

const renderer = new THREE.WebGLRenderer({
  antialias: true, alpha: true, powerPreference: 'high-performance',
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(V.viewport.clientWidth, V.viewport.clientHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
V.viewport.prepend(renderer.domElement)

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
  const w = V.viewport.clientWidth
  const h = V.viewport.clientHeight
  if (w === 0 || h === 0) return
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h, false)
}).observe(V.viewport)

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

function applyFilters() {
  const cat = V.filterCategoria.value
  const lic = V.filterLicenca.value
  const fmt = V.filterFormato.value
  const outros = V.filterOutros.value

  const filtrados = M.models.filter(m => {
    if (cat !== 'todas' && m.categoria !== cat) return false
    if (lic !== 'todas' && m.licenca !== lic) return false
    if (fmt !== 'todos' && m.formato !== fmt) return false
    if (outros === 'download' && !m.disponivelDownload) return false
    if (outros === 'animacao' && !m.animacao) return false
    return true
  })
  renderGrid(filtrados)
}

function renderGrid(data) {
  V.renderGrid(data, {
    onMenuClick: (model, e) => {
      ctxModel = model
      V.updateContextMenuPrograms(M.externalPrograms, V.ctxOverlay, V.ctxMenu, {
        onSelect: (prog) => {
          if (!ctxModel) return
          generateOpenScript(prog, ctxModel)
          ctxModel = null
        },
      })
      const convertItem = V.ctxMenu.querySelector('.ctx-item[data-action="convert"]')
      if (convertItem) convertItem.classList.toggle('show', model.formato === '.blend' && !!model.importedFile)
      const x = Math.min(e.clientX, innerWidth - 160)
      const y = Math.min(e.clientY, innerHeight - 100)
      V.ctxMenu.style.left = x + 'px'
      V.ctxMenu.style.top = y + 'px'
      V.ctxOverlay.classList.add('active')
      V.ctxMenu.classList.add('active')
    },
    onCardClick: (model) => openViewer3D(model),
    getIconForFormat: M.getIconForFormat,
  })
}

function confirmImport() {
  if (!pendingFile) return
  const name = V.dialogName.value.trim() || 'Sem nome'
  const cat = V.dialogCategory.value
  const lic = V.dialogLicense.value
  const parts = pendingFile.name.split('.')
  const ext = '.' + parts.pop().toLowerCase()
  const grad = M.thumbnailGradients[M.models.length % M.thumbnailGradients.length]

  M.models.unshift({
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

  V.closeImportDialog()
  pendingFile = null
  V.filterCategoria.value = 'todas'
  V.filterFormato.value = 'todos'
  V.filterLicenca.value = 'todas'
  V.filterOutros.value = 'todos'
  applyFilters()
  const ativa = document.querySelector('.cat-item.active')
  V.renderSidebar(M.categories, M.models, ativa ? ativa.dataset.categoria : 'models')
  V.showToast(`"${name}${ext}" importado com sucesso`)
  document.getElementById('gridWrapper').scrollTop = 0
}

async function convertBlendToGLTF(model) {
  if (!model || !model.importedFile) {
    V.showToast('Arquivo .blend original não encontrado', 'error')
    return
  }

  const blender = M.externalPrograms.find(p => p.nome.toLowerCase().includes('blender'))
  if (!blender) {
    V.showToast('Configure o Blender nas Configurações primeiro', 'error')
    V.settingsBtn.click()
    setTimeout(() => {
      const section = document.querySelector('#settingsPanel .settings-external')
      if (section) section.scrollIntoView({ behavior: 'smooth' })
    }, 400)
    return
  }

  V.showToast('Convertendo .blend para .glb…', 'loading')

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
      V.showToast(err.error || 'Erro na conversão', 'error')
      return
    }

    const blob = await res.blob()
    const baseName = model.nome.replace(/\.[^.]+$/, '')
    const downloadName = baseName + '.glb'
    const idx = M.models.indexOf(model)

    model.nome = baseName
    model.formato = '.glb'
    model.disponivelDownload = true
    model.animacao = false
    model.thumbnailGrad = M.thumbnailGradients[(idx > -1 ? idx : M.models.length) % M.thumbnailGradients.length]
    model.importedFile = new File([blob], downloadName, { type: 'model/gltf-binary' })

    applyFilters()
    const ativa = document.querySelector('.cat-item.active')
    V.renderSidebar(M.categories, M.models, ativa ? ativa.dataset.categoria : 'models')
    V.showToast(`${baseName} convertido para glTF com sucesso`)
  } catch (err) {
    console.error('Erro na conversão:', err)
    V.showToast('Falha na conversão. Servidor rodando?', 'error')
  }
}

function generateOpenScript(program, model) {
  if (!model.importedFile) {
    V.showToast('Asset não possui arquivo local para abrir', 'error')
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

  V.showToast(`Script .bat gerado para abrir em ${program.nome}`)
}

async function initViewer() {
  if (viewerLoaded) return
  viewerLoaded = true
  V.loadingEl.classList.remove('hidden')
  addShadowGround()
  modelContainer.add(buildProceduralSofa())
  await new Promise(r => setTimeout(r, 600))
  V.loadingEl.classList.add('hidden')
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
  V.modalAssetName.textContent = model.nome + ' · 3D Model'
  V.modalAuthor.textContent = model.autor
  V.hideViewerMessage()
  V.modalOverlay.classList.add('active')
  isOpen = true
  await initViewer()

  if (model.importedFile) {
    const ext = model.importedFile.name.split('.').pop().toLowerCase()
    let loadedScene = null

    try {
      V.loadingEl.classList.remove('hidden')

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

    setTimeout(() => V.loadingEl.classList.add('hidden'), 200)

    if (!loadedScene) {
      clearProceduralModel()
      V.showViewerMessage(
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
  V.modalOverlay.classList.remove('active')
  isOpen = false
  V.hideViewerMessage()
  if (hideViewerTimeout) { clearTimeout(hideViewerTimeout); hideViewerTimeout = null }
  if (animId) { cancelAnimationFrame(animId); animId = null }
}

V.filterCategoria.addEventListener('change', applyFilters)
V.filterLicenca.addEventListener('change', applyFilters)
V.filterFormato.addEventListener('change', applyFilters)
V.filterOutros.addEventListener('change', applyFilters)

V.ctxOverlay.addEventListener('click', () => {
  V.ctxOverlay.classList.remove('active')
  V.ctxMenu.classList.remove('active')
  ctxModel = null
})

document.querySelectorAll('#contextMenu .ctx-item[data-action]').forEach(item => {
  item.addEventListener('click', () => {
    if (!ctxModel) return
    if (item.dataset.action === 'view') openViewer3D(ctxModel)
    if (item.dataset.action === 'convert') convertBlendToGLTF(ctxModel)
    if (item.dataset.action === 'delete') {
      if (confirm(`Excluir "${ctxModel.nome}"?`)) {
        const i = M.models.indexOf(ctxModel)
        if (i > -1) M.models.splice(i, 1)
        applyFilters()
        const ativa = document.querySelector('.cat-item.active')
        V.renderSidebar(M.categories, M.models, ativa ? ativa.dataset.categoria : 'models')
        V.showToast(`"${ctxModel.nome}" excluído`)
      }
    }
    V.ctxOverlay.classList.remove('active')
    V.ctxMenu.classList.remove('active')
    ctxModel = null
  })
})

V.closeBtn.addEventListener('click', closeModal)
V.modalOverlay.addEventListener('click', e => { if (e.target === V.modalOverlay) closeModal() })
document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) closeModal() })

controls.addEventListener('start', () => { controls.autoRotate = false })
controls.addEventListener('end', () => {
  setTimeout(() => { if (isOpen) controls.autoRotate = true }, 3000)
})

V.importFab.addEventListener('click', () => V.fileInput.click())
V.fileInput.addEventListener('change', e => {
  const file = e.target.files[0]
  if (!file) return
  V.fileInput.value = ''
  pendingFile = file
  V.openImportDialog(file, M.categories)
})
V.dialogCancel.addEventListener('click', () => {
  V.closeImportDialog()
  pendingFile = null
})
V.dialogConfirm.addEventListener('click', confirmImport)
V.importDialogOverlay.addEventListener('click', e => {
  if (e.target === V.importDialogOverlay) {
    V.closeImportDialog()
    pendingFile = null
  }
})
V.dialogName.addEventListener('keydown', e => { if (e.key === 'Enter') confirmImport() })

V.themeToggle.addEventListener('click', () => {
  M.settings.theme = M.settings.theme === 'dark' ? 'light' : 'dark'
  V.aplicarTema(M.settings.theme)
  M.salvarConfig()
})

V.settingsBtn.addEventListener('click', () => {
  V.settingsOverlay.classList.add('active')
})
V.settingsClose.addEventListener('click', () => V.settingsOverlay.classList.remove('active'))
V.settingsOverlay.addEventListener('click', e => {
  if (e.target === V.settingsOverlay) V.settingsOverlay.classList.remove('active')
})

function renderProgramListWithHandler() {
  const handler = (index, prog) => {
    M.externalPrograms.splice(index, 1)
    M.salvarProgramas()
    renderProgramListWithHandler()
    V.showToast(`"${prog.nome}" removido`)
    V.updateProgramAddBtn()
  }
  V.renderProgramList(M.externalPrograms, { onRemove: handler })
}

V.programAddBtn.addEventListener('click', () => {
  const nome = V.programName.value.trim()
  const caminho = V.programPath.value.trim().replace(/^["'\s]+|["'\s]+$/g, '')
  if (!nome || !caminho) return
  if (M.externalPrograms.some(p => p.nome.toLowerCase() === nome.toLowerCase())) {
    V.showToast(`"${nome}" já está configurado`, 'error')
    return
  }
  M.externalPrograms.push({ nome, caminho })
  M.salvarProgramas()
  renderProgramListWithHandler()
  V.programName.value = ''
  V.programPath.value = ''
  V.updateProgramAddBtn()
  V.showToast(`"${nome}" adicionado com sucesso`)
})

V.programName.addEventListener('input', V.updateProgramAddBtn)
V.programPath.addEventListener('input', V.updateProgramAddBtn)

const progFileInput = document.createElement('input')
progFileInput.type = 'file'
progFileInput.hidden = true
progFileInput.accept = '.exe,.cmd,.bat,.app,.lnk'
progFileInput.id = 'programFileInput'
document.body.appendChild(progFileInput)

V.programBrowseBtn.addEventListener('click', () => progFileInput.click())
progFileInput.addEventListener('change', () => {
  if (progFileInput.files[0]) {
    const file = progFileInput.files[0]
    if (file.path && file.path !== file.name) {
      V.programPath.value = file.path
    } else {
      V.showToast('Cole o caminho completo do executável no campo', 'info')
      V.programPath.focus()
    }
    V.updateProgramAddBtn()
  }
  progFileInput.value = ''
})

V.toolOpenIn.addEventListener('click', e => {
  e.stopPropagation()
  if (V.toolOpenInDropdown.classList.contains('active')) {
    V.closeOpenInDropdown()
  } else {
    V.openOpenInDropdown(M.externalPrograms, {
      onSelect: (prog) => {
        if (viewerModel) generateOpenScript(prog, viewerModel)
      },
    })
  }
})

document.addEventListener('click', e => {
  if (V.toolOpenInDropdown.classList.contains('active') &&
      !V.toolOpenIn.contains(e.target) &&
      !V.toolOpenInDropdown.contains(e.target)) {
    V.closeOpenInDropdown()
  }
})

V.viewerConvertBtn.addEventListener('click', () => {
  if (viewerModel && viewerModel.importedFile) convertBlendToGLTF(viewerModel)
})
V.viewerConfigBtn.addEventListener('click', () => {
  closeModal()
  V.settingsBtn.click()
  setTimeout(() => {
    const section = document.querySelector('#settingsPanel .settings-external')
    if (section) section.scrollIntoView({ behavior: 'smooth' })
  }, 500)
})

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && V.importDialogOverlay.classList.contains('active')) {
    V.closeImportDialog()
    pendingFile = null
  }
  if (e.key === 'Escape' && V.settingsOverlay.classList.contains('active')) V.settingsOverlay.classList.remove('active')
})

function init() {
  M.carregarConfig()
  M.carregarProgramas()
  V.populateFilters(M.categories)
  V.renderSidebar(M.categories, M.models, 'models')
  applyFilters()
  renderProgramListWithHandler()
  V.aplicarTema(M.settings.theme)
  console.log('✅ Streamline 3D carregado!')
}

init()
