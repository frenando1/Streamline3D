import { Model } from './model.js'
import { View, openViewer3D, closeModal, viewerModel } from './view.js'

const Controller = {
  ctxModel: null,
  pendingFile: null,

  applyFilters() {
    const cat = View.el.filterCategoria.value
    const lic = View.el.filterLicenca.value
    const fmt = View.el.filterFormato.value
    const outros = View.el.filterOutros.value
    const colecaoId = View.el.filterColecao.value

    const filtrados = Model.models.filter(m => {
      if (cat !== 'todas' && m.categoria !== cat) return false
      if (lic !== 'todas' && m.licenca !== lic) return false
      if (fmt !== 'todos' && m.formato !== fmt) return false
      if (outros === 'download' && !m.disponivelDownload) return false
      if (outros === 'animacao' && !m.animacao) return false
      if (colecaoId !== 'todas') {
        const colecoes = Model.assetColecoes.get(m.id)
        if (!colecoes || !colecoes.has(colecaoId)) return false
      }
      return true
    })
    Controller.renderGrid(filtrados)
  },

  renderGrid(data) {
    View.renderGrid(data, {
      onMenuClick: (model, e) => {
        Controller.ctxModel = model
        View.updateContextMenuPrograms(Model.externalPrograms, View.el.ctxOverlay, View.el.ctxMenu, {
          onSelect: (prog) => {
            if (!Controller.ctxModel) return
            Controller.generateOpenScript(prog, Controller.ctxModel)
            Controller.ctxModel = null
          },
        })
        const convertItem = View.el.ctxMenu.querySelector('.ctx-item[data-action="convert"]')
        if (convertItem) convertItem.classList.toggle('show', model.formato === '.blend' && (!!model.importedFile || !!model.storagePath))
        const downloadItem = View.el.ctxMenu.querySelector('.ctx-item[data-action="download"]')
        if (downloadItem) downloadItem.classList.toggle('show', !!model.importedFile || !!model.storagePath)
        const addToColecaoItem = View.el.ctxMenu.querySelector('.ctx-item[data-action="add-to-colecao"]')
        if (addToColecaoItem) {
          addToColecaoItem.style.display = Model.colecoes.length > 0 ? 'flex' : 'none'
        }
        View.el.ctxColecaoSubmenu.classList.remove('active')
        const x = Math.min(e.clientX, innerWidth - 160)
        const y = Math.min(e.clientY, innerHeight - 100)
        View.el.ctxMenu.style.left = x + 'px'
        View.el.ctxMenu.style.top = y + 'px'
        View.el.ctxOverlay.classList.add('active')
        View.el.ctxMenu.classList.add('active')
      },
      onCardClick: (model) => openViewer3D(model),
    })
  },

  async confirmImport() {
    if (!Controller.pendingFile) return

    View.el.loadingEl.classList.remove('hidden')
    View.showToast('A importar asset...', 'loading')

    try {
      const name = View.el.dialogName.value.trim() || 'Sem nome'
      const cat = View.el.dialogCategory.value
      const lic = View.el.dialogLicense.value
      const parts = Controller.pendingFile.name.split('.')
      const ext = '.' + parts.pop().toLowerCase()
      const grad = Model.thumbnailGradients[Model.models.length % Model.thumbnailGradients.length]

      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(Controller.pendingFile)
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => reject(reader.error)
      })

      const linhaTexto = `id=${Date.now()} "${name}" {"${base64}"} P="${ext}"`

      const model = {
        id: crypto.randomUUID(),
        nome: name,
        autor: Model.currentUser ? Model.currentUser.name : 'importado',
        categoria: cat,
        licenca: lic,
        formato: ext,
        tamanho: (Controller.pendingFile.size / (1024 * 1024)).toFixed(2) + ' MB',
        disponivelDownload: true,
        animacao: false,
        thumbnailGrad: grad,
        importedFile: Controller.pendingFile,
        conteudo_texto: linhaTexto,
      }

      Model.models.unshift(model)

      if (Model.currentUser) {
        await Model.salvarModelo(model).catch(e => View.showToast('Erro ao salvar: ' + e.message, 'error'))
      }

      View.closeImportDialog()
      Controller.pendingFile = null
      Controller.applyFilters()
      const ativa = document.querySelector('.cat-item.active')
      View.renderSidebar(Model.categories, Model.models, ativa ? ativa.dataset.categoria : 'models')
      View.renderColecoes(Model.colecoes, null)

      if (Model.currentUser && Model.rcloneConfig.enabled) {
        Controller.salvarModelosNoDrive().catch(e => console.warn('Auto-sync falhou:', e))
      }

      View.el.loadingEl.classList.add('hidden')
      View.showToast(`"${name}${ext}" importado com sucesso`)
      document.getElementById('gridWrapper').scrollTop = 0
    } catch (err) {
      View.el.loadingEl.classList.add('hidden')
      View.showToast('Erro ao importar: ' + err.message, 'error')
    }
  },

  async convertBlendToGLTF(model) {
    let blendFile = model.importedFile
    if (!blendFile && model.storagePath) {
      View.showToast('Baixando arquivo do servidor...', 'info')
      blendFile = await Model.obterArquivoModelo(model)
    }
    if (!model || !blendFile) {
      View.showToast('Arquivo .blend original não encontrado', 'error')
      return
    }

    const blender = Model.externalPrograms.find(p => p.nome.toLowerCase().includes('blender'))
    if (!blender) {
      View.showToast('Configure o Blender nas Configurações primeiro', 'error')
      View.el.settingsBtn.click()
      setTimeout(() => {
        const section = document.querySelector('#settingsPanel .settings-external')
        if (section) section.scrollIntoView({ behavior: 'smooth' })
      }, 400)
      return
    }

    View.showToast('Convertendo .blend para .glb…', 'loading')

    try {
      const formData = new FormData()
      formData.append('blend', blendFile)
      formData.append('blenderPath', blender.caminho)

      const res = await fetch('http://localhost:3000/api/converter', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        View.showToast(err.error || 'Erro na conversão', 'error')
        return
      }

      const blob = await res.blob()
      const baseName = model.nome.replace(/\.[^.]+$/, '')
      const downloadName = baseName + '.glb'
      const idx = Model.models.indexOf(model)

      model.nome = baseName
      model.formato = '.glb'
      model.disponivelDownload = true
      model.animacao = false
      model.thumbnailGrad = Model.thumbnailGradients[(idx > -1 ? idx : Model.models.length) % Model.thumbnailGradients.length]
      model.importedFile = new File([blob], downloadName, { type: 'model/gltf-binary' })

      if (Model.currentUser) {
        Model.atualizarModelo(model).catch(e => console.warn('Erro ao atualizar:', e.message))
      }

      Controller.applyFilters()
      const ativa = document.querySelector('.cat-item.active')
      View.renderSidebar(Model.categories, Model.models, ativa ? ativa.dataset.categoria : 'models')
      View.showToast(`${baseName} convertido para glTF com sucesso`)
    } catch (err) {
      console.error('Erro na conversão:', err)
      View.showToast('Falha na conversão. Servidor rodando?', 'error')
    }
  },

  generateOpenScript(program, model) {
    if (!model.importedFile) {
      View.showToast('Asset não possui arquivo local para abrir', 'error')
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

    View.showToast(`Script .bat gerado para abrir em ${program.nome}`)
  },

  async downloadModelFile(model) {
    let file = model.importedFile
    if (!file && model.storagePath) {
      View.showToast('Baixando arquivo do servidor...', 'info')
      file = await Model.obterArquivoModelo(model)
    }
    if (!file) {
      View.showToast('Arquivo não disponível para download', 'error')
      return
    }
    const ext = model.formato.startsWith('.') ? model.formato : '.' + model.formato
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = model.nome + ext
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  renderProgramListWithHandler() {
    const handler = (index, prog) => {
      Model.externalPrograms.splice(index, 1)
      Model.salvarProgramas()
      Controller.renderProgramListWithHandler()
      View.showToast(`"${prog.nome}" removido`)
      View.updateProgramAddBtn()
    }
    View.renderProgramList(Model.externalPrograms, { onRemove: handler })
  },

  tratarErroSupabase(err) {
    const msg = err?.message || ''
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos'
    if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar'
    if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado'
    if (msg.includes('Password should be')) return 'Senha muito curta (mínimo 6 caracteres)'
    if (msg.includes('Invalid email')) return 'E-mail inválido'
    if (msg.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.'
    return msg || 'Erro inesperado. Tente novamente.'
  },

  async handleForgotPassword() {
    View.showResetView()
  },

  async handleSendResetLink() {
    const email = View.el.loginEmail.value.trim()
    if (!email) {
      View.showLoginError('Digite seu e-mail')
      return
    }
    View.el.loginConfirm.disabled = true
    View.el.loginConfirm.textContent = 'Enviando...'
    try {
      await Model.resetPasswordForEmail(email)
      View.showResetMessage('Link de recuperação enviado! Verifique seu e-mail.')
    } catch (err) {
      View.showResetMessage(Controller.tratarErroSupabase(err), true)
    } finally {
      View.el.loginConfirm.disabled = false
      View.el.loginConfirm.textContent = 'Enviar link'
    }
  },

  async handleResetPassword() {
    const newPassword = View.el.loginNewPassword.value.trim()
    const confirmPassword = View.el.loginNewPasswordConfirm.value.trim()
    if (!newPassword || newPassword.length < 6) {
      View.showResetMessage('A senha deve ter no mínimo 6 caracteres', true)
      return
    }
    if (newPassword !== confirmPassword) {
      View.showResetMessage('As senhas não coincidem', true)
      return
    }
    View.el.loginConfirm.disabled = true
    View.el.loginConfirm.textContent = 'Redefinindo...'
    try {
      await Model.updatePassword(newPassword)
      View.showResetMessage('Senha redefinida com sucesso!')
      setTimeout(() => {
        const email = Model.currentUser?.email || ''
        View.showLoginView()
        if (email) View.el.loginEmail.value = email
        View.showToast('Senha redefinida! Faça login com sua nova senha.')
      }, 1500)
    } catch (err) {
      View.showResetMessage(Controller.tratarErroSupabase(err), true)
    } finally {
      View.el.loginConfirm.disabled = false
      View.el.loginConfirm.textContent = 'Redefinir Senha'
    }
  },

  async init() {
    Model.carregarConfig()
    Model.carregarProgramas()
    View.populateFilters(Model.categories)
    View.renderSidebar(Model.categories, Model.models, 'models')
    Controller.applyFilters()
    Controller.renderProgramListWithHandler()
    View.aplicarTema(Model.settings.theme)

    try {
      await Model.carregarSessao()
    } catch (e) {
      console.warn('Sessão não restaurada:', e.message)
    }
    View.updateLoginUI(Model.currentUser)

    try {
      await Model.carregarColecoes()
      View.renderColecoes(Model.colecoes, Model.colecaoAtiva)
      View.populateColecaoFilter(Model.colecoes)
    } catch (e) {
      console.warn('Coleções não carregadas:', e.message)
    }

    if (Model.hasRecoveryToken()) {
      try {
        await Model.getSession()
        if (Model.currentUser) {
          View.updateLoginUI(Model.currentUser)
          View.openLoginDialog()
          View.showNewPasswordView()
          View.showToast('Defina uma nova senha para sua conta')
        }
      } catch (e) {
        console.warn('Erro ao processar token de recuperação:', e.message)
        View.showToast('Link de recuperação inválido ou expirado', 'error')
      }
      window.location.hash = ''
    }

    if (Model.currentUser) {
      try {
        View.showToast('Sincronizando com Google Drive...', 'loading')

        const initRes = await fetch('http://localhost:3000/api/auth/session-init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: Model.currentUser.id })
        })
        const initData = await initRes.json()
        if (initData.success) {
          Model.rcloneConfig.remote = initData.remoteName
          Model.salvarConfig()
        }

        const response = await fetch(`http://localhost:3000/api/drive/download/${Model.currentUser.id}`)
        const data = await response.json()

        if (data.conteudoTexto && data.conteudoTexto.trim() !== '') {
          const modelosRecuperados = Model.importarModelosDoTexto(data.conteudoTexto)
          if (modelosRecuperados && modelosRecuperados.length > 0) {
            Model.models.length = 0
            Model.models.push(...modelosRecuperados)
            View.showToast('Biblioteca restaurada do Google Drive! 💾')
          }
        } else {
          await Model.carregarModelos()
        }
      } catch (e) {
        console.error('Falha no rclone, recorrendo ao Supabase:', e)
        await Model.carregarModelos()
      }

      Controller.applyFilters()
      const ativa = document.querySelector('.cat-item.active')
      View.renderSidebar(Model.categories, Model.models, ativa ? ativa.dataset.categoria : 'models')
    }

    Model.onAuthChange((user) => {
      View.updateLoginUI(user)
    })

    console.log('✅ Streamline 3D carregado!')
  },

  testarRclone() {
    const btn = View.el.rcloneTestBtn
    btn.disabled = true
    btn.textContent = 'Testando...'
    View.el.rcloneStatus.className = 'rclone-status'
    View.el.rcloneStatus.textContent = ''

    return fetch('http://localhost:3000/api/drive/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        remoteName: View.el.rcloneRemote.value.trim() || 'gdrive',
        path: View.el.rclonePath.value.trim(),
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          View.el.rcloneStatus.className = 'rclone-status rclone-ok'
          View.el.rcloneStatus.textContent = '✅ Conexão estabelecida!'
        } else {
          View.el.rcloneStatus.className = 'rclone-status rclone-err'
          View.el.rcloneStatus.textContent = '❌ ' + (data.error || 'Falha na conexão')
        }
      })
      .catch(err => {
        View.el.rcloneStatus.className = 'rclone-status rclone-err'
        View.el.rcloneStatus.textContent = '❌ Servidor não disponível'
      })
      .finally(() => {
        btn.disabled = false
        btn.textContent = 'Testar conexão'
      })
  },

  async salvarModelosNoDrive() {
    try {
      if (!Model.currentUser) {
        View.showToast('Faça login primeiro!', 'error')
        return
      }

      View.showToast('Sincronizando modelos com seu Google Drive... ⏳')

      let textoCompleto
      try {
        textoCompleto = await Model.exportarModelosParaTexto()
      } catch (e) {
        if (e.message.includes('Nenhum modelo com arquivo')) {
          textoCompleto = ''
        } else {
          throw e
        }
      }

      await fetch('http://localhost:3000/api/modelos/atualizar-arquivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudoTexto: textoCompleto })
      })

      const response = await fetch('http://localhost:3000/api/drive/upload-modelos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: Model.currentUser.id })
      })

      const data = await response.json()
      if (data.success) {
        View.showToast('Modelos sincronizados com seu Google Drive! ✅')
      } else {
        View.showToast('Falha ao sincronizar: ' + data.error, 'error')
      }
    } catch (err) {
      console.error(err)
      View.showToast('Erro de conexão com o servidor.', 'error')
    }
  },

  async carregarRemotesRclone() {
    try {
      const res = await fetch('http://localhost:3000/api/drive/remotes');
      const data = await res.json();

      View.renderRemotesTable(data.remotes || [], Model.rcloneConfig.remote);
    } catch (err) {
      console.error('Erro ao listar remotes:', err);
      if (View.el.rcloneRemotesContainer) {
        View.el.rcloneRemotesContainer.innerHTML = `<p class="loading-text" style="color:#ff7675;">Falha ao carregar remotes do Rclone.</p>`;
      }
    }
  },
}

function gerarId() {
  return crypto.randomUUID ? crypto.randomUUID() : 'col_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9)
}

// Event listeners - Coleções
View.el.addColecaoBtn.addEventListener('click', () => {
  View.openColecaoDialog(null)
})

View.el.colecaoDialogCancel.addEventListener('click', () => View.closeColecaoDialog())
View.el.colecaoDialogOverlay.addEventListener('click', e => {
  if (e.target === View.el.colecaoDialogOverlay) View.closeColecaoDialog()
})
View.el.colecaoNome.addEventListener('keydown', e => {
  if (e.key === 'Enter') View.el.colecaoDialogConfirm.click()
})

View.el.colecaoDialogConfirm.addEventListener('click', async () => {
  const nome = View.el.colecaoNome.value.trim()
  if (!nome) {
    View.showToast('Digite um nome para a coleção', 'error')
    return
  }
  const editId = View.el.colecaoEditId.value
  const cor = View.el.colecaoCor.value
  const descricao = View.el.colecaoDescricao.value.trim()

  if (editId) {
    const colecao = Model.colecoes.find(c => c.id === editId)
    if (colecao) {
      colecao.nome = nome
      colecao.descricao = descricao
      colecao.cor = cor
      try {
        await Model.atualizarColecao(colecao)
        View.renderColecoes(Model.colecoes, Model.colecaoAtiva)
        View.populateColecaoFilter(Model.colecoes)
        Controller.applyFilters()
        View.closeColecaoDialog()
        View.showToast(`Coleção "${nome}" atualizada`)
      } catch (err) {
        View.showToast('Erro ao atualizar coleção: ' + err.message, 'error')
      }
    }
  } else {
    const colecao = {
      id: gerarId(),
      nome,
      descricao,
      cor,
    }
    try {
      await Model.salvarColecao(colecao)
      View.renderColecoes(Model.colecoes, Model.colecaoAtiva)
      View.populateColecaoFilter(Model.colecoes)
      View.closeColecaoDialog()
      View.showToast(`Coleção "${nome}" criada`)
    } catch (err) {
      View.showToast('Erro ao criar coleção: ' + err.message, 'error')
    }
  }
})

document.addEventListener('edit-colecao', e => {
  View.openColecaoDialog(e.detail)
})

document.addEventListener('delete-colecao', async e => {
  const col = e.detail
  if (!confirm(`Excluir a coleção "${col.nome}"?\nOs assets permanecem inalterados.`)) return
  try {
    await Model.deletarColecao(col)
    View.renderColecoes(Model.colecoes, Model.colecaoAtiva)
    View.populateColecaoFilter(Model.colecoes)
    if (Model.colecaoAtiva === null) View.el.filterColecao.value = 'todas'
    Controller.applyFilters()
    View.showToast(`Coleção "${col.nome}" excluída`)
  } catch (err) {
    View.showToast('Erro ao excluir coleção: ' + err.message, 'error')
  }
})

document.addEventListener('toggle-colecao-asset', async e => {
  const { colecaoId, assetId, add } = e.detail
  try {
    if (add) {
      await Model.adicionarAssetNaColecao(colecaoId, assetId)
      View.showToast('Asset adicionado à coleção')
    } else {
      await Model.removerAssetDaColecao(colecaoId, assetId)
      View.showToast('Asset removido da coleção')
    }
    Controller.applyFilters()
    const ativa = document.querySelector('.cat-item.active')
    View.renderSidebar(Model.categories, Model.models, ativa ? ativa.dataset.categoria : 'models')
    View.renderColecoes(Model.colecoes, Model.colecaoAtiva)
    View.el.ctxOverlay.classList.remove('active')
    View.el.ctxMenu.classList.remove('active')
    View.el.ctxColecaoSubmenu.classList.remove('active')
    Controller.ctxModel = null
  } catch (err) {
    View.showToast('Erro: ' + err.message, 'error')
  }
})

// Color presets
document.querySelectorAll('.color-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    const cor = btn.dataset.cor
    View.el.colecaoCor.value = cor
    document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('selected'))
    btn.classList.add('selected')
  })
})
View.el.colecaoCor.addEventListener('input', () => {
  document.querySelectorAll('.color-preset').forEach(p => {
    p.classList.toggle('selected', p.dataset.cor === View.el.colecaoCor.value)
  })
})

// Event listeners
View.el.filterCategoria.addEventListener('change', () => {
  document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'))
  Controller.applyFilters()
})
View.el.filterLicenca.addEventListener('change', () => Controller.applyFilters())
View.el.filterFormato.addEventListener('change', () => Controller.applyFilters())
View.el.filterOutros.addEventListener('change', () => Controller.applyFilters())
View.el.filterColecao.addEventListener('change', () => {
  const val = View.el.filterColecao.value
  Model.colecaoAtiva = val === 'todas' ? null : val
  document.querySelectorAll('.colecao-item').forEach(c => {
    c.classList.toggle('active', c.dataset.colecaoId === val)
  })
  Controller.applyFilters()
})

View.el.ctxOverlay.addEventListener('click', () => {
  View.el.ctxOverlay.classList.remove('active')
  View.el.ctxMenu.classList.remove('active')
  Controller.ctxModel = null
})

document.querySelectorAll('#contextMenu .ctx-item[data-action]').forEach(item => {
  item.addEventListener('click', async () => {
    if (!Controller.ctxModel) return
    if (item.dataset.action === 'view') openViewer3D(Controller.ctxModel)
    if (item.dataset.action === 'convert') await Controller.convertBlendToGLTF(Controller.ctxModel)
    if (item.dataset.action === 'download') await Controller.downloadModelFile(Controller.ctxModel)
    if (item.dataset.action === 'delete') {
      if (confirm(`Excluir "${Controller.ctxModel.nome}"?`)) {
        Model.deletarModelo(Controller.ctxModel).catch(e => View.showToast('Erro ao deletar: ' + e.message, 'error'))
        const i = Model.models.indexOf(Controller.ctxModel)
        if (i > -1) Model.models.splice(i, 1)
        Controller.applyFilters()
        const ativa = document.querySelector('.cat-item.active')
        View.renderSidebar(Model.categories, Model.models, ativa ? ativa.dataset.categoria : 'models')
        View.renderColecoes(Model.colecoes, Model.colecaoAtiva)
        View.showToast(`"${Controller.ctxModel.nome}" excluído`)
      }
    }
    if (item.dataset.action === 'add-to-colecao') {
      View.renderColecaoSubmenu(Model.colecoes, Controller.ctxModel.id)
      return
    }
    View.el.ctxOverlay.classList.remove('active')
    View.el.ctxMenu.classList.remove('active')
    Controller.ctxModel = null
  })
})

View.el.importFab.addEventListener('click', () => View.el.fileInput.click())
View.el.fileInput.addEventListener('change', e => {
  const file = e.target.files[0]
  if (!file) return
  View.el.fileInput.value = ''
  Controller.pendingFile = file
  View.openImportDialog(file, Model.categories)
})
View.el.dialogCancel.addEventListener('click', () => {
  View.closeImportDialog()
  Controller.pendingFile = null
})
View.el.dialogConfirm.addEventListener('click', () => Controller.confirmImport())
View.el.importDialogOverlay.addEventListener('click', e => {
  if (e.target === View.el.importDialogOverlay) {
    View.closeImportDialog()
    Controller.pendingFile = null
  }
})
View.el.dialogName.addEventListener('keydown', e => { if (e.key === 'Enter') Controller.confirmImport() })

View.el.themeToggle.addEventListener('click', () => {
  Model.settings.theme = Model.settings.theme === 'dark' ? 'light' : 'dark'
  View.aplicarTema(Model.settings.theme)
  Model.salvarConfig()
})

View.el.settingsClose.addEventListener('click', () => View.el.settingsOverlay.classList.remove('active'))
View.el.settingsOverlay.addEventListener('click', e => {
  if (e.target === View.el.settingsOverlay) View.el.settingsOverlay.classList.remove('active')
})

View.el.programAddBtn.addEventListener('click', () => {
  const nome = View.el.programName.value.trim()
  const caminho = View.el.programPath.value.trim().replace(/^["'\s]+|["'\s]+$/g, '')
  if (!nome || !caminho) return
  if (Model.externalPrograms.some(p => p.nome.toLowerCase() === nome.toLowerCase())) {
    View.showToast(`"${nome}" já está configurado`, 'error')
    return
  }
  Model.externalPrograms.push({ nome, caminho })
  Model.salvarProgramas()
  Controller.renderProgramListWithHandler()
  View.el.programName.value = ''
  View.el.programPath.value = ''
  View.updateProgramAddBtn()
  View.showToast(`"${nome}" adicionado com sucesso`)
})

View.el.programName.addEventListener('input', () => View.updateProgramAddBtn())
View.el.programPath.addEventListener('input', () => View.updateProgramAddBtn())

const progFileInput = document.createElement('input')
progFileInput.type = 'file'
progFileInput.hidden = true
progFileInput.accept = '.exe,.cmd,.bat,.app,.lnk'
progFileInput.id = 'programFileInput'
document.body.appendChild(progFileInput)

View.el.programBrowseBtn.addEventListener('click', () => progFileInput.click())
progFileInput.addEventListener('change', () => {
  if (progFileInput.files[0]) {
    const file = progFileInput.files[0]
    if (file.path && file.path !== file.name) {
      View.el.programPath.value = file.path
    } else {
      View.showToast('Cole o caminho completo do executável no campo', 'info')
      View.el.programPath.focus()
    }
    View.updateProgramAddBtn()
  }
  progFileInput.value = ''
})

View.el.exportTxtBtn.addEventListener('click', async () => {
  try {
    View.showToast('Exportando modelos...', 'info')
    const texto = await Model.exportarModelosParaTexto()
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'modelos.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    View.showToast('modelos.txt baixado!')
  } catch (err) {
    View.showToast(err.message || 'Erro na exportação', 'error')
  }
})

View.el.importTxtBtn.addEventListener('click', () => View.el.importTxtInput.click())

View.el.importTxtInput.addEventListener('change', async () => {
  const file = View.el.importTxtInput.files[0]
  if (!file) return
  View.el.importTxtInput.value = ''
  try {
    const texto = await file.text()
    const imported = Model.importarModelosDoTexto(texto)
    if (imported.length === 0) {
      View.showToast('Nenhum modelo válido encontrado no arquivo', 'error')
      return
    }
    for (const model of imported) {
      Model.models.unshift(model)
      if (Model.currentUser) {
        await Model.salvarModelo(model)
      }
    }
    Controller.applyFilters()
    const ativa = document.querySelector('.cat-item.active')
    View.renderSidebar(Model.categories, Model.models, ativa ? ativa.dataset.categoria : 'models')
    View.showToast(`${imported.length} modelo(s) importado(s)`)
    if (Model.currentUser && Model.rcloneConfig.enabled) {
      Controller.salvarModelosNoDrive().catch(e => console.warn('Auto-sync modelos.txt falhou:', e))
    }
  } catch (err) {
    View.showToast(err.message || 'Erro na importação', 'error')
  }
})

View.el.toolOpenIn.addEventListener('click', e => {
  e.stopPropagation()
  if (View.el.toolOpenInDropdown.classList.contains('active')) {
    View.closeOpenInDropdown()
  } else {
    View.openOpenInDropdown(Model.externalPrograms, {
      onSelect: (prog) => {
        if (viewerModel) Controller.generateOpenScript(prog, viewerModel)
      },
    })
  }
})

document.addEventListener('click', e => {
  if (View.el.toolOpenInDropdown.classList.contains('active') &&
      !View.el.toolOpenIn.contains(e.target) &&
      !View.el.toolOpenInDropdown.contains(e.target)) {
    View.closeOpenInDropdown()
  }
})

View.el.toolDownload.addEventListener('click', async () => {
  if (viewerModel) await Controller.downloadModelFile(viewerModel)
})
View.el.viewerConvertBtn.addEventListener('click', async () => {
  if (viewerModel && (viewerModel.importedFile || viewerModel.storagePath)) await Controller.convertBlendToGLTF(viewerModel)
})
View.el.viewerConfigBtn.addEventListener('click', () => {
  closeModal()
  View.el.settingsBtn.click()
  setTimeout(() => {
    const section = document.querySelector('#settingsPanel .settings-external')
    if (section) section.scrollIntoView({ behavior: 'smooth' })
  }, 500)
})

View.el.loginBtn.addEventListener('click', () => {
  if (Model.currentUser) {
    View.renderAccountSettings(Model.currentUser)
    View.el.settingsOverlay.classList.add('active')
  } else {
    View.openLoginDialog()
  }
})

View.el.loginClose.addEventListener('click', () => View.closeLoginDialog())
View.el.loginCancel.addEventListener('click', () => View.closeLoginDialog())
View.el.loginToggleMode.addEventListener('click', () => {
  const mode = View.getLoginMode()
  if (mode === 'reset' || mode === 'new-password') {
    View.showLoginView()
  } else {
    View.toggleLoginMode()
  }
})
View.el.loginConfirm.addEventListener('click', async () => {
  const mode = View.getLoginMode()
  if (mode === 'reset') {
    await Controller.handleSendResetLink()
    return
  }
  if (mode === 'new-password') {
    await Controller.handleResetPassword()
    return
  }
  View.hideLoginError()
  const email = View.el.loginEmail.value.trim()
  const password = View.el.loginPassword.value.trim()

  if (!email || !password) {
    View.showLoginError('Preencha e-mail e senha')
    return
  }

  if (View.isRegisterMode()) {
    const usuario = View.el.loginUsername.value.trim()
    if (!usuario) {
      View.showLoginError('Preencha seu nome de usuário')
      return
    }
    try {
      const result = await Model.signUpUser(email, password, usuario)
      View.closeLoginDialog()
      if (result.session) {
        View.updateLoginUI(Model.currentUser)
        try {
          const initRes = await fetch('http://localhost:3000/api/auth/session-init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: Model.currentUser.id, email: Model.currentUser.email })
          })
          const initData = await initRes.json()
          if (initData.success) {
            Model.rcloneConfig.remote = initData.remoteName
            Model.salvarConfig()
            if (initData.needsAuth) {
              View.showToast('VINCULANDO DRIVE: Permita o acesso na janela que se abriu no seu navegador! 🌐', 'info')
            }
          }
        } catch (e) {
          console.warn('Session init falhou:', e.message)
        }
        View.showToast(`Conta criada! Bem-vindo, ${result.name}!`)
      } else {
        View.showToast('Conta criada! Confirme seu e-mail antes de entrar.', 'info')
      }
    } catch (err) {
      View.showLoginError(Controller.tratarErroSupabase(err))
    }
  } else {
    try {
      await Model.loginUser(email, password)
      View.closeLoginDialog()
      View.updateLoginUI(Model.currentUser)
      View.showToast(`Bem-vindo, ${Model.currentUser.name}!`)

      let initData
      try {
        const initRes = await fetch('http://localhost:3000/api/auth/session-init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: Model.currentUser.id })
        })
        initData = await initRes.json()
        if (initData.success) {
          Model.rcloneConfig.remote = initData.remoteName
          Model.salvarConfig()
          if (initData.needsAuth) {
            View.showToast('VINCULANDO DRIVE: Permita o acesso na janela que se abriu no seu navegador! 🌐', 'info')
          }
        }
      } catch (e) {
        console.warn('Session init falhou:', e.message)
      }

      try {
        if (initData && !initData.needsAuth) {
          const driveRes = await fetch(`http://localhost:3000/api/drive/download/${Model.currentUser.id}`)
          const driveData = await driveRes.json()
          if (driveData.conteudoTexto && driveData.conteudoTexto.trim() !== '') {
            const modelosRecuperados = Model.importarModelosDoTexto(driveData.conteudoTexto)
            if (modelosRecuperados.length > 0) {
              Model.models.length = 0
              Model.models.push(...modelosRecuperados)
              View.showToast('Biblioteca restaurada do Google Drive! 💾')
            }
          } else {
            await Model.carregarModelos()
          }
        } else {
          await Model.carregarModelos()
        }
        await Model.carregarColecoes()
        View.renderColecoes(Model.colecoes, Model.colecaoAtiva)
        View.populateColecaoFilter(Model.colecoes)
        Controller.applyFilters()
        const ativa = document.querySelector('.cat-item.active')
        View.renderSidebar(Model.categories, Model.models, ativa ? ativa.dataset.categoria : 'models')
      } catch (e) {
        console.warn('Modelos não carregados:', e.message)
      }
    } catch (err) {
      View.showLoginError(Controller.tratarErroSupabase(err))
    }
  }
})

View.el.loginForgotBtn.addEventListener('click', () => Controller.handleForgotPassword())

View.el.loginDialogOverlay.addEventListener('click', e => {
  if (e.target === View.el.loginDialogOverlay) View.closeLoginDialog()
})

View.el.loginPassword.addEventListener('keydown', e => {
  if (e.key === 'Enter') View.el.loginConfirm.click()
})

View.el.loginUsername.addEventListener('keydown', e => {
  if (e.key === 'Enter') View.el.loginConfirm.click()
})

View.el.loginNewPassword.addEventListener('keydown', e => {
  if (e.key === 'Enter') View.el.loginNewPasswordConfirm.focus()
})

View.el.loginNewPasswordConfirm.addEventListener('keydown', e => {
  if (e.key === 'Enter') View.el.loginConfirm.click()
})

View.el.accountSaveBtn.addEventListener('click', async () => {
  const name = View.el.accountNameInput.value.trim()
  const email = View.el.accountEmailInput.value.trim()
  if (!name || !email) {
    View.showToast('Preencha nome e e-mail', 'error')
    return
  }
  try {
    await Model.updateUser({ name, email })
    View.renderAccountSettings(Model.currentUser)
    View.updateLoginUI(Model.currentUser)
    View.showToast('Conta atualizada')
  } catch (err) {
    View.showToast(Controller.tratarErroSupabase(err), 'error')
  }
})

View.el.accountLogoutBtn.addEventListener('click', async () => {
  try {
    await Model.logoutUser()
    Model.models.length = 0
    Model.colecoes = []
    Model.assetColecoes = new Map()
    Model.colecaoAtiva = null
    View.el.filterColecao.value = 'todas'
    View.renderColecoes([], null)
    View.populateColecaoFilter([])
    Controller.applyFilters()
    const ativa = document.querySelector('.cat-item.active')
    View.renderSidebar(Model.categories, Model.models, ativa ? ativa.dataset.categoria : 'models')
    View.renderAccountSettings(null)
    View.el.settingsOverlay.classList.remove('active')
    View.updateLoginUI(null)
    View.showToast('Desconectado')
  } catch (err) {
    View.showToast('Erro ao desconectar', 'error')
  }
})

View.el.rcloneEnabled.addEventListener('change', () => {
  const enabled = View.el.rcloneEnabled.checked
  const fields = document.querySelectorAll('.rclone-config-fields')
  fields.forEach(f => f.style.display = enabled ? '' : 'none')
  if (enabled) Controller.carregarRemotesRclone()
})

View.el.rcloneSaveBtn.addEventListener('click', () => {
  Model.rcloneConfig.enabled = View.el.rcloneEnabled.checked
  Model.rcloneConfig.remote = View.el.rcloneRemote.value.trim() || 'gdrive'
  Model.rcloneConfig.path = View.el.rclonePath.value.trim()
  Model.salvarConfig()
  View.showToast('Configuração Rclone salva!')
})

View.el.rcloneTestBtn.addEventListener('click', () => Controller.testarRclone())

View.el.rcloneRefreshBtn.addEventListener('click', () => Controller.carregarRemotesRclone())

View.el.settingsBtn.addEventListener('click', () => {
  View.renderRcloneSettings(Model.rcloneConfig)
  View.el.settingsOverlay.classList.add('active')
  Controller.carregarRemotesRclone()
})

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && View.el.importDialogOverlay.classList.contains('active')) {
    View.closeImportDialog()
    Controller.pendingFile = null
  }
  if (e.key === 'Escape' && View.el.settingsOverlay.classList.contains('active')) View.el.settingsOverlay.classList.remove('active')
  if (e.key === 'Escape' && View.el.loginDialogOverlay.classList.contains('active')) View.closeLoginDialog()
  if (e.key === 'Escape' && View.el.colecaoDialogOverlay.classList.contains('active')) View.closeColecaoDialog()
})

Controller.init()
