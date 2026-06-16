import * as M from './model.js'
import * as V from './view.js'
import { openViewer3D, closeModal, viewerModel } from './viewer.js'

let ctxModel = null
let pendingFile = null

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
      const downloadItem = V.ctxMenu.querySelector('.ctx-item[data-action="download"]')
      if (downloadItem) downloadItem.classList.toggle('show', !!model.importedFile)
      const x = Math.min(e.clientX, innerWidth - 160)
      const y = Math.min(e.clientY, innerHeight - 100)
      V.ctxMenu.style.left = x + 'px'
      V.ctxMenu.style.top = y + 'px'
      V.ctxOverlay.classList.add('active')
      V.ctxMenu.classList.add('active')
    },
    onCardClick: (model) => openViewer3D(model),
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

  const model = {
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
  }

  M.models.unshift(model)

  if (M.currentUser) {
    M.salvarModelo(model).catch(e => V.showToast('Erro ao salvar: ' + e.message, 'error'))
  }

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

    if (M.currentUser) {
      M.atualizarModelo(model).catch(e => console.warn('Erro ao atualizar:', e.message))
    }

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

function downloadModelFile(model) {
  if (!model.importedFile) {
    V.showToast('Arquivo não disponível para download', 'error')
    return
  }
  const ext = model.formato.startsWith('.') ? model.formato : '.' + model.formato
  const url = URL.createObjectURL(model.importedFile)
  const link = document.createElement('a')
  link.href = url
  link.download = model.nome + ext
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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
    if (item.dataset.action === 'download') downloadModelFile(ctxModel)
    if (item.dataset.action === 'delete') {
      if (confirm(`Excluir "${ctxModel.nome}"?`)) {
        M.deletarModelo(ctxModel.id).catch(e => V.showToast('Erro ao deletar: ' + e.message, 'error'))
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

V.exportTxtBtn.addEventListener('click', async () => {
  try {
    V.showToast('Exportando modelos...', 'info')
    await M.exportarParaArquivoTexto()
    V.showToast('modelos.txt baixado!')
  } catch (err) {
    V.showToast(err.message || 'Erro na exportação', 'error')
  }
})

V.importTxtBtn.addEventListener('click', () => V.importTxtInput.click())

V.importTxtInput.addEventListener('change', async () => {
  const file = V.importTxtInput.files[0]
  if (!file) return
  V.importTxtInput.value = ''
  try {
    const texto = await file.text()
    const imported = M.importarModelosDoTexto(texto)
    if (imported.length === 0) {
      V.showToast('Nenhum modelo válido encontrado no arquivo', 'error')
      return
    }
    for (const model of imported) {
      M.models.unshift(model)
      if (M.currentUser) {
        await M.salvarModelo(model)
      }
    }
    applyFilters()
    const ativa = document.querySelector('.cat-item.active')
    V.renderSidebar(M.categories, M.models, ativa ? ativa.dataset.categoria : 'models')
    V.showToast(`${imported.length} modelo(s) importado(s)`)
  } catch (err) {
    V.showToast(err.message || 'Erro na importação', 'error')
  }
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

V.toolDownload.addEventListener('click', () => {
  if (viewerModel) downloadModelFile(viewerModel)
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

V.loginBtn.addEventListener('click', () => {
  if (M.currentUser) {
    V.renderAccountSettings(M.currentUser)
    V.settingsOverlay.classList.add('active')
  } else {
    V.openLoginDialog()
  }
})

V.loginClose.addEventListener('click', () => V.closeLoginDialog())
V.loginCancel.addEventListener('click', () => V.closeLoginDialog())
V.loginToggleMode.addEventListener('click', () => V.toggleLoginMode())
V.loginConfirm.addEventListener('click', async () => {
  V.hideLoginError()
  const email = V.loginEmail.value.trim()
  const password = V.loginPassword.value.trim()

  if (!email || !password) {
    V.showLoginError('Preencha e-mail e senha')
    return
  }

  if (V.isRegisterMode()) {
    const usuario = V.loginUsername.value.trim()
    if (!usuario) {
      V.showLoginError('Preencha seu nome de usuário')
      return
    }
    try {
      const result = await M.signUpUser(email, password, usuario)
      V.closeLoginDialog()
      if (result.session) {
        V.updateLoginUI(M.currentUser)
        V.showToast(`Conta criada! Bem-vindo, ${result.name}!`)
      } else {
        V.showToast('Conta criada! Confirme seu e-mail antes de entrar.', 'info')
      }
    } catch (err) {
      V.showLoginError(tratarErroSupabase(err))
    }
  } else {
    try {
      await M.loginUser(email, password)
      V.closeLoginDialog()
      V.updateLoginUI(M.currentUser)
      V.showToast(`Bem-vindo, ${M.currentUser.name}!`)
      try {
        await M.carregarModelos()
        applyFilters()
        const ativa = document.querySelector('.cat-item.active')
        V.renderSidebar(M.categories, M.models, ativa ? ativa.dataset.categoria : 'models')
      } catch (e) {
        console.warn('Modelos não carregados:', e.message)
      }
    } catch (err) {
      V.showLoginError(tratarErroSupabase(err))
    }
  }
})

V.loginDialogOverlay.addEventListener('click', e => {
  if (e.target === V.loginDialogOverlay) V.closeLoginDialog()
})

V.loginPassword.addEventListener('keydown', e => {
  if (e.key === 'Enter') V.loginConfirm.click()
})

V.loginUsername.addEventListener('keydown', e => {
  if (e.key === 'Enter') V.loginConfirm.click()
})

V.accountSaveBtn.addEventListener('click', async () => {
  const name = V.accountNameInput.value.trim()
  const email = V.accountEmailInput.value.trim()
  if (!name || !email) {
    V.showToast('Preencha nome e e-mail', 'error')
    return
  }
  try {
    await M.updateUser({ name, email })
    V.renderAccountSettings(M.currentUser)
    V.updateLoginUI(M.currentUser)
    V.showToast('Conta atualizada')
  } catch (err) {
    V.showToast(tratarErroSupabase(err), 'error')
  }
})

V.accountLogoutBtn.addEventListener('click', async () => {
  try {
    await M.logoutUser()
    M.models.length = 0
    applyFilters()
    const ativa = document.querySelector('.cat-item.active')
    V.renderSidebar(M.categories, M.models, ativa ? ativa.dataset.categoria : 'models')
    V.renderAccountSettings(null)
    V.settingsOverlay.classList.remove('active')
    V.updateLoginUI(null)
    V.showToast('Desconectado')
  } catch (err) {
    V.showToast('Erro ao desconectar', 'error')
  }
})

function tratarErroSupabase(err) {
  const msg = err?.message || ''
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos'
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar'
  if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado'
  if (msg.includes('Password should be')) return 'Senha muito curta (mínimo 6 caracteres)'
  return msg || 'Erro inesperado. Tente novamente.'
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && V.importDialogOverlay.classList.contains('active')) {
    V.closeImportDialog()
    pendingFile = null
  }
  if (e.key === 'Escape' && V.settingsOverlay.classList.contains('active')) V.settingsOverlay.classList.remove('active')
  if (e.key === 'Escape' && V.loginDialogOverlay.classList.contains('active')) V.closeLoginDialog()
})

async function init() {
  M.carregarConfig()
  M.carregarProgramas()
  V.populateFilters(M.categories)
  V.renderSidebar(M.categories, M.models, 'models')
  applyFilters()
  renderProgramListWithHandler()
  V.aplicarTema(M.settings.theme)

  try {
    await M.carregarSessao()
  } catch (e) {
    console.warn('Sessão não restaurada:', e.message)
  }
  V.updateLoginUI(M.currentUser)

  if (M.currentUser) {
    try {
      await M.carregarModelos()
      applyFilters()
      const ativa = document.querySelector('.cat-item.active')
      V.renderSidebar(M.categories, M.models, ativa ? ativa.dataset.categoria : 'models')
    } catch (e) {
      console.warn('Modelos não carregados:', e.message)
    }
  }

  M.onAuthChange((user) => {
    V.updateLoginUI(user)
  })

  console.log('✅ Streamline 3D carregado!')
}

init()
