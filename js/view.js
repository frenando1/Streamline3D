import { Model } from './model.js'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

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

function getIconForFormat(fmt) {
  return { '.blend': '🧊', '.max': '📐', '.fbx': '🔷', '.gltf': '◈', '.obj': '🔶' }[fmt] || '📦'
}

const icons = { success: '✅', error: '❌', loading: '⏳', info: 'ℹ️' }

let loginMode = 'login'

export const View = {
  el: {
    categoryList: document.getElementById('categoryList'),
    filterCategoria: document.getElementById('filterCategoria'),
    filterLicenca: document.getElementById('filterLicenca'),
    filterOutros: document.getElementById('filterOutros'),
    filterFormato: document.getElementById('filterFormato'),
    grid: document.getElementById('grid'),
    ctxOverlay: document.getElementById('contextOverlay'),
    ctxMenu: document.getElementById('contextMenu'),
    modalOverlay: document.getElementById('modalOverlay'),
    closeBtn: document.getElementById('closeBtn'),
    viewport: document.getElementById('viewport'),
    loadingEl: document.getElementById('loadingOverlay'),
    modalAssetName: document.getElementById('modalAssetName'),
    modalAuthor: document.getElementById('modalAuthor'),
    fileInput: document.getElementById('fileInput'),
    importFab: document.getElementById('importFab'),
    importDialogOverlay: document.getElementById('importDialogOverlay'),
    dialogFileName: document.getElementById('dialogFileName'),
    dialogFileSize: document.getElementById('dialogFileSize'),
    dialogName: document.getElementById('dialogName'),
    dialogCategory: document.getElementById('dialogCategory'),
    dialogLicense: document.getElementById('dialogLicense'),
    dialogCancel: document.getElementById('dialogCancel'),
    dialogConfirm: document.getElementById('dialogConfirm'),
    toast: document.getElementById('toast'),
    themeToggle: document.getElementById('themeToggle'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsOverlay: document.getElementById('settingsOverlay'),
    settingsClose: document.getElementById('settingsClose'),
    settingsProgramList: document.getElementById('settingsProgramList'),
    programName: document.getElementById('programName'),
    programPath: document.getElementById('programPath'),
    programBrowseBtn: document.getElementById('programBrowseBtn'),
    programAddBtn: document.getElementById('programAddBtn'),
    toolDownload: document.getElementById('toolDownload'),
    toolOpenIn: document.getElementById('toolOpenIn'),
    toolOpenInDropdown: document.getElementById('toolOpenInDropdown'),
    toolOpenInList: document.getElementById('toolOpenInList'),
    viewerConvertBtn: document.getElementById('viewerConvertBtn'),
    viewerConfigBtn: document.getElementById('viewerConfigBtn'),
    loginDialogOverlay: document.getElementById('loginDialogOverlay'),
    loginDialogTitle: document.getElementById('loginDialogTitle'),
    loginUsernameField: document.getElementById('loginUsernameField'),
    loginUsername: document.getElementById('loginUsername'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    loginError: document.getElementById('loginError'),
    loginCancel: document.getElementById('loginCancel'),
    loginConfirm: document.getElementById('loginConfirm'),
    loginClose: document.getElementById('loginClose'),
    loginToggleMode: document.getElementById('loginToggleMode'),
    loginForgotBtn: document.getElementById('loginForgotBtn'),
    loginNewPassword: document.getElementById('loginNewPassword'),
    loginNewPasswordConfirm: document.getElementById('loginNewPasswordConfirm'),
    loginNewPasswordField: document.getElementById('loginNewPasswordField'),
    loginNewPasswordConfirmField: document.getElementById('loginNewPasswordConfirmField'),
    loginResetMessage: document.getElementById('loginResetMessage'),
    loginBtn: document.getElementById('Login'),
    settingsAccount: document.getElementById('settingsAccount'),
    accountAvatar: document.getElementById('accountAvatar'),
    accountName: document.getElementById('accountName'),
    accountEmail: document.getElementById('accountEmail'),
    accountNameInput: document.getElementById('accountNameInput'),
    accountEmailInput: document.getElementById('accountEmailInput'),
    accountPasswordInput: document.getElementById('accountPasswordInput'),
    accountSaveBtn: document.getElementById('accountSaveBtn'),
    accountLogoutBtn: document.getElementById('accountLogoutBtn'),
    exportTxtBtn: document.getElementById('exportTxtBtn'),
    importTxtBtn: document.getElementById('importTxtBtn'),
    importTxtInput: document.getElementById('importTxtInput'),
    viewerMessage: document.getElementById('viewerMessage'),
    colecaoList: document.getElementById('colecaoList'),
    addColecaoBtn: document.getElementById('addColecaoBtn'),
    filterColecao: document.getElementById('filterColecao'),
    colecaoDialogOverlay: document.getElementById('colecaoDialogOverlay'),
    colecaoDialogTitle: document.getElementById('colecaoDialogTitle'),
    colecaoNome: document.getElementById('colecaoNome'),
    colecaoDescricao: document.getElementById('colecaoDescricao'),
    colecaoCor: document.getElementById('colecaoCor'),
    colecaoEditId: document.getElementById('colecaoEditId'),
    colecaoDialogCancel: document.getElementById('colecaoDialogCancel'),
    colecaoDialogConfirm: document.getElementById('colecaoDialogConfirm'),
    ctxColecaoSubmenu: document.getElementById('ctxColecaoSubmenu'),
    rcloneEnabled: document.getElementById('rcloneEnabled'),
    rcloneRemote: document.getElementById('rcloneRemote'),
    rclonePath: document.getElementById('rclonePath'),
    rcloneStatus: document.getElementById('rcloneStatus'),
    rcloneTestBtn: document.getElementById('rcloneTestBtn'),
    rcloneSaveBtn: document.getElementById('rcloneSaveBtn'),
    rcloneRefreshBtn: document.getElementById('rcloneRefreshBtn'),
    rcloneRemotesContainer: document.getElementById('rcloneRemotesContainer'),
    ctxDownloadBtn: document.getElementById('ctxDownloadBtn'),
    loginOverlay: document.getElementById('loginOverlay'),
    loginMessage: document.getElementById('loginMessage'),
    loginGoogleBtn: document.getElementById('loginGoogleBtn'),
    loginGithubBtn: document.getElementById('loginGithubBtn'),
  },

  showToast(msg, tipo = 'success') {
    this.el.toast.innerHTML = `<span>${icons[tipo] || '✅'}</span> ${msg}`
    this.el.toast.classList.add('active')
    clearTimeout(this.el.toast._timer)
    this.el.toast._timer = setTimeout(() => this.el.toast.classList.remove('active'), 3500)
  },

  renderSidebar(categories, models, ativa = 'models') {
    this.el.categoryList.innerHTML = ''
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
        this.el.filterCategoria.value = cat.id
        this.el.filterCategoria.dispatchEvent(new Event('change'))
      })
      this.el.categoryList.appendChild(el)
    })
  },

  populateFilters(categories) {
    this.el.filterCategoria.innerHTML = '<option value="todas">Todas as categorias</option>'
    categories.forEach(cat => {
      const opt = document.createElement('option')
      opt.value = cat.id
      opt.textContent = cat.nome
      this.el.filterCategoria.appendChild(opt)
    })
    this.el.filterCategoria.value = 'todas'
  },

  populateColecaoFilter(colecoes) {
    this.el.filterColecao.innerHTML = '<option value="todas">Todas as coleções</option>'
    colecoes.forEach(col => {
      const opt = document.createElement('option')
      opt.value = col.id
      opt.textContent = col.nome
      this.el.filterColecao.appendChild(opt)
    })
    if (!Model.colecaoAtiva) this.el.filterColecao.value = 'todas'
  },

  renderColecoes(colecoes, ativaId) {
    this.el.colecaoList.innerHTML = ''
    if (colecoes.length === 0) {
      this.el.colecaoList.innerHTML = '<div class="colecao-list-empty">Nenhuma coleção ainda</div>'
      return
    }
    colecoes.forEach(col => {
      const el = document.createElement('div')
      el.className = 'colecao-item' + (col.id === ativaId ? ' active' : '')
      let count = 0
      for (const [, colecaoIds] of Model.assetColecoes) {
        if (colecaoIds.has(col.id)) count++
      }
      el.innerHTML = `
        <span class="colecao-dot" style="background:${col.cor}"></span>
        <span class="colecao-item-name">${escapeHtml(col.nome)}</span>
        <span class="colecao-count">${count}</span>
        <button class="colecao-edit-btn" data-id="${col.id}" title="Editar coleção">✎</button>
        <button class="colecao-delete-btn" data-id="${col.id}" title="Excluir coleção">✕</button>`
      el.dataset.colecaoId = col.id
      el.addEventListener('click', e => {
        if (e.target.closest('.colecao-edit-btn') || e.target.closest('.colecao-delete-btn')) return
        document.querySelectorAll('.colecao-item').forEach(c => c.classList.remove('active'))
        el.classList.add('active')
        Model.colecaoAtiva = col.id
        this.el.filterColecao.value = col.id
        this.el.filterColecao.dispatchEvent(new Event('change'))
      })
      el.querySelector('.colecao-edit-btn').addEventListener('click', e => {
        e.stopPropagation()
        const event = new CustomEvent('edit-colecao', { detail: col })
        document.dispatchEvent(event)
      })
      el.querySelector('.colecao-delete-btn').addEventListener('click', e => {
        e.stopPropagation()
        const event = new CustomEvent('delete-colecao', { detail: col })
        document.dispatchEvent(event)
      })
      this.el.colecaoList.appendChild(el)
    })
  },

  renderGrid(data, { onMenuClick, onCardClick }) {
    if (data.length === 0) {
      this.el.grid.className = 'empty-state'
      this.el.grid.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Nenhum modelo encontrado</span>`
      return
    }
    this.el.grid.className = ''
    this.el.grid.innerHTML = ''
    data.forEach(model => {
      const card = document.createElement('div')
      card.className = 'model-card'
      const colecoes = Model.colecoesDeAsset(model.id)
      let tagsHtml = ''
      if (colecoes.length > 0) {
        tagsHtml = '<div class="colecao-tags">' + colecoes.map(c =>
          `<span class="colecao-tag" style="background:${c.cor}">${escapeHtml(c.nome)}</span>`
        ).join('') + '</div>'
      }
      card.innerHTML = `
        <div class="thumb" style="background:${model.thumbnailGrad}">
          <span class="format-tag">${model.formato}</span>
          <span class="placeholder-icon">${getIconForFormat(model.formato)}</span>
        </div>
        <div class="info">
          <div class="name">${model.nome}</div>
          <div class="author">${model.autor}</div>
        </div>
        ${tagsHtml}
        <button class="menu-btn" data-id="${model.id}">⋯</button>`
      card.querySelector('.menu-btn').addEventListener('click', e => {
        e.stopPropagation()
        onMenuClick(model, e)
      })
      card.addEventListener('click', () => onCardClick(model))
      this.el.grid.appendChild(card)
    })
  },

  openColecaoDialog(colecao) {
    if (colecao) {
      this.el.colecaoDialogTitle.textContent = 'Editar Coleção'
      this.el.colecaoNome.value = colecao.nome
      this.el.colecaoDescricao.value = colecao.descricao || ''
      this.el.colecaoCor.value = colecao.cor || '#6C5CE7'
      this.el.colecaoEditId.value = colecao.id
      this.el.colecaoDialogConfirm.textContent = 'Salvar'
    } else {
      this.el.colecaoDialogTitle.textContent = 'Nova Coleção'
      this.el.colecaoNome.value = ''
      this.el.colecaoDescricao.value = ''
      this.el.colecaoCor.value = '#6C5CE7'
      this.el.colecaoEditId.value = ''
      this.el.colecaoDialogConfirm.textContent = 'Criar'
    }
    document.querySelectorAll('.color-preset').forEach(p => {
      p.classList.toggle('selected', p.dataset.cor === this.el.colecaoCor.value)
    })
    this.el.colecaoDialogOverlay.classList.add('active')
    setTimeout(() => this.el.colecaoNome.focus(), 100)
  },

  closeColecaoDialog() {
    this.el.colecaoDialogOverlay.classList.remove('active')
  },

  renderColecaoSubmenu(colecoes, modelId) {
    const submenu = this.el.ctxColecaoSubmenu
    submenu.innerHTML = ''
    const modelColecoes = Model.assetColecoes.get(modelId)
    if (colecoes.length === 0) {
      submenu.innerHTML = '<div class="ctx-submenu-empty">Nenhuma coleção</div>'
    } else {
      colecoes.forEach(col => {
        const item = document.createElement('div')
        item.className = 'ctx-submenu-item'
        const isIn = modelColecoes && modelColecoes.has(col.id)
        item.innerHTML = `
          <span class="ctx-submenu-dot" style="background:${col.cor}"></span>
          <span>${isIn ? '✓ ' : ''}${escapeHtml(col.nome)}</span>`
        item.addEventListener('click', e => {
          e.stopPropagation()
          const event = new CustomEvent('toggle-colecao-asset', {
            detail: { colecaoId: col.id, assetId: modelId, add: !isIn }
          })
          document.dispatchEvent(event)
        })
        submenu.appendChild(item)
      })
    }
    submenu.classList.add('active')
  },

  renderProgramList(programs, { onRemove }) {
    this.el.settingsProgramList.innerHTML = ''
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
      this.el.settingsProgramList.appendChild(item)
    })
  },

  updateProgramAddBtn() {
    this.el.programAddBtn.disabled = !this.el.programName.value.trim() || !this.el.programPath.value.trim()
  },

  aplicarTema(tema) {
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
      this.el.themeToggle.textContent = '☀️'
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
      this.el.themeToggle.textContent = '🌙'
    }
  },

  showViewerMessage(msg, formato) {
    this.el.viewerMessage.querySelector('.msg-icon').textContent = formato === '.blend' ? '📦' : '⚠️'
    this.el.viewerMessage.querySelector('.msg-text').textContent = msg
    this.el.viewerConvertBtn.style.display = formato === '.blend' ? 'inline-flex' : 'none'
    this.el.viewerConfigBtn.style.display = formato === '.blend' ? 'inline-flex' : 'none'
    this.el.viewerMessage.classList.add('active')
  },

  hideViewerMessage() {
    this.el.viewerMessage.classList.remove('active')
  },

  openImportDialog(file, categories) {
    const parts = file.name.split('.')
    const ext = parts.pop().toLowerCase()
    this.el.dialogFileName.textContent = file.name
    this.el.dialogFileSize.textContent = formatFileSize(file.size)
    this.el.dialogName.value = parts.join('.')

    this.el.dialogCategory.innerHTML = ''
    categories.forEach(cat => {
      const opt = document.createElement('option')
      opt.value = cat.id
      opt.textContent = cat.nome
      if (cat.id === Model.guessCategory(ext)) opt.selected = true
      this.el.dialogCategory.appendChild(opt)
    })

    this.el.dialogLicense.innerHTML = ''
    Object.entries(Model.licenseNames).forEach(([val, label]) => {
      const opt = document.createElement('option')
      opt.value = val
      opt.textContent = label
      this.el.dialogLicense.appendChild(opt)
    })

    this.el.importDialogOverlay.classList.add('active')
    setTimeout(() => this.el.dialogName.focus(), 100)
  },

  closeImportDialog() {
    this.el.importDialogOverlay.classList.remove('active')
  },

  openLoginDialog(mode) {
    loginMode = mode || 'login'
    this._renderLoginMode()
    this.el.loginDialogOverlay.classList.add('active')
    setTimeout(() => this.el.loginEmail.focus(), 100)
  },

  _renderLoginMode() {
    if (loginMode === 'reset' || loginMode === 'new-password') return
    const isRegister = loginMode === 'register'
    this.el.loginDialogTitle.textContent = isRegister ? 'Criar Conta' : 'Entrar'
    this.el.loginConfirm.textContent = isRegister ? 'Criar Conta' : 'Entrar'
    this.el.loginToggleMode.textContent = isRegister ? 'Já tenho conta' : 'Criar conta'
    this.el.loginUsernameField.style.display = isRegister ? '' : 'none'
    this.el.loginEmail.parentElement.style.display = ''
    this.el.loginPassword.parentElement.style.display = ''
    this.el.loginForgotBtn.parentElement.style.display = ''
    this.el.loginNewPasswordField.style.display = 'none'
    this.el.loginNewPasswordConfirmField.style.display = 'none'
    if (!isRegister) this.el.loginUsername.value = ''
    this.el.loginError.style.display = 'none'
    this.el.loginResetMessage.style.display = 'none'
  },

  toggleLoginMode() {
    if (loginMode === 'reset' || loginMode === 'new-password') {
      this.showLoginView()
      return
    }
    loginMode = loginMode === 'login' ? 'register' : 'login'
    this._renderLoginMode()
  },

  isRegisterMode() {
    return loginMode === 'register'
  },

  getLoginMode() {
    return loginMode
  },

  showLoginError(msg) {
    this.el.loginError.textContent = msg
    this.el.loginError.style.display = ''
  },

  hideLoginError() {
    this.el.loginError.style.display = 'none'
  },

  showResetView() {
    loginMode = 'reset'
    this.el.loginDialogTitle.textContent = 'Recuperar Senha'
    this.el.loginUsernameField.style.display = 'none'
    this.el.loginEmail.parentElement.style.display = ''
    this.el.loginPassword.parentElement.style.display = 'none'
    this.el.loginForgotBtn.parentElement.style.display = 'none'
    this.el.loginNewPasswordField.style.display = 'none'
    this.el.loginNewPasswordConfirmField.style.display = 'none'
    this.el.loginConfirm.textContent = 'Enviar link'
    this.el.loginToggleMode.textContent = 'Voltar'
    this.el.loginError.style.display = 'none'
    this.el.loginResetMessage.style.display = 'none'
  },

  showNewPasswordView() {
    loginMode = 'new-password'
    this.el.loginDialogTitle.textContent = 'Nova Senha'
    this.el.loginUsernameField.style.display = 'none'
    this.el.loginEmail.parentElement.style.display = 'none'
    this.el.loginPassword.parentElement.style.display = 'none'
    this.el.loginForgotBtn.parentElement.style.display = 'none'
    this.el.loginNewPasswordField.style.display = ''
    this.el.loginNewPasswordConfirmField.style.display = ''
    this.el.loginNewPassword.value = ''
    this.el.loginNewPasswordConfirm.value = ''
    this.el.loginConfirm.textContent = 'Redefinir Senha'
    this.el.loginToggleMode.textContent = 'Voltar ao login'
    this.el.loginError.style.display = 'none'
    this.el.loginResetMessage.style.display = 'none'
  },

  showLoginView() {
    loginMode = 'login'
    this.el.loginDialogTitle.textContent = 'Entrar'
    this.el.loginUsernameField.style.display = 'none'
    this.el.loginEmail.parentElement.style.display = ''
    this.el.loginPassword.parentElement.style.display = ''
    this.el.loginForgotBtn.parentElement.style.display = ''
    this.el.loginNewPasswordField.style.display = 'none'
    this.el.loginNewPasswordConfirmField.style.display = 'none'
    this.el.loginConfirm.textContent = 'Entrar'
    this.el.loginToggleMode.textContent = 'Criar conta'
    this.el.loginError.style.display = 'none'
    this.el.loginResetMessage.style.display = 'none'
    this.el.loginUsername.value = ''
    this.el.loginEmail.value = ''
    this.el.loginPassword.value = ''
  },

  showResetMessage(msg, isError = false) {
    this.el.loginResetMessage.textContent = msg
    this.el.loginResetMessage.style.display = ''
    if (isError) {
      this.el.loginResetMessage.className = 'login-error login-error-reset'
    } else {
      this.el.loginResetMessage.className = 'login-error login-success'
    }
  },

  closeLoginDialog() {
    this.el.loginDialogOverlay.classList.remove('active')
    this.el.loginEmail.value = ''
    this.el.loginPassword.value = ''
    this.el.loginUsername.value = ''
    this.el.loginNewPassword.value = ''
    this.el.loginNewPasswordConfirm.value = ''
    this.el.loginError.style.display = 'none'
    this.el.loginResetMessage.style.display = 'none'
    loginMode = 'login'
  },

  updateLoginUI(user) {
    if (user) {
      const initial = user.name.charAt(0).toUpperCase()
      this.el.loginBtn.textContent = initial
      this.el.loginBtn.title = `${user.email} — Configurações da conta`
    } else {
      this.el.loginBtn.textContent = '👤'
      this.el.loginBtn.title = 'Login'
    }
  },

  openLoginOverlay() {
    if (this.el.loginMessage) this.el.loginMessage.textContent = ''
    this.el.loginOverlay.classList.add('active')
  },

  closeLoginOverlay() {
    this.el.loginOverlay.classList.remove('active')
  },

  renderRcloneSettings(config) {
    this.el.rcloneEnabled.checked = !!config.enabled
    this.el.rclonePath.value = config.path || ''
    this.el.rcloneStatus.className = 'rclone-status'
    this.el.rcloneStatus.textContent = ''
    if (this.el.rcloneRemote) {
      this.el.rcloneRemote.value = config.remote || 'gdrive'
    }
    const fields = document.querySelectorAll('.rclone-config-fields')
    fields.forEach(f => f.style.display = config.enabled ? '' : 'none')
    if (!config.enabled && this.el.rcloneRemotesContainer) {
      this.el.rcloneRemotesContainer.innerHTML = '<p class="loading-text">Ative o Rclone para ver os remotes.</p>'
    }
  },

  renderRemotesTable(remotes, remoteSelecionado) {
    const container = this.el.rcloneRemotesContainer;
    if (!container) return;

    if (!remotes || remotes.length === 0) {
      container.innerHTML = `<p class="loading-text">Nenhum remote configurado no Rclone.</p>`;
      return;
    }

    let html = `
      <table class="ludusavi-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">Ativo</th>
            <th>Nome do Remote</th>
            <th>Tipo</th>
          </tr>
        </thead>
        <tbody>
    `;

    remotes.forEach(r => {
      const isChecked = r.nome === remoteSelecionado;
      html += `
        <tr class="${isChecked ? 'selected-row' : ''}" style="cursor: pointer;" onclick="window.View.selecionarLinhaRemote(this, '${r.nome}')">
          <td style="text-align: center;">
            <input type="radio" name="rclone_remote_choice" value="${r.nome}" class="ludusavi-radio" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); window.View.selecionarLinhaRemote(this.closest('tr'), '${r.nome}')" />
          </td>
          <td><strong>${r.nome}</strong></td>
          <td><span class="ludusavi-badge">${r.tipo}</span></td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
  },

  selecionarLinhaRemote(linhaElemento, nomeRemote) {
    const tabela = linhaElemento.closest('.ludusavi-table');
    if (!tabela) return;

    tabela.querySelectorAll('tr').forEach(tr => tr.classList.remove('selected-row'));

    linhaElemento.classList.add('selected-row');

    const radio = linhaElemento.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;

    const inputOculto = document.getElementById('rcloneRemote');
    if (inputOculto) {
      inputOculto.value = nomeRemote;
    }
  },

  renderAccountSettings(user) {
    if (!user) {
      this.el.settingsAccount.classList.remove('active')
      return
    }
    const initial = user.name.charAt(0).toUpperCase()
    this.el.accountAvatar.textContent = initial
    this.el.accountName.textContent = user.name
    this.el.accountEmail.textContent = user.email
    this.el.accountNameInput.value = user.name
    this.el.accountEmailInput.value = user.email
    this.el.accountPasswordInput.value = ''
    this.el.settingsAccount.classList.add('active')
  },

  closeOpenInDropdown() {
    this.el.toolOpenInDropdown.classList.remove('active')
  },

  openOpenInDropdown(programs, { onSelect }) {
    this.el.toolOpenInList.innerHTML = ''
    if (programs.length === 0) {
      this.el.toolOpenInList.innerHTML = '<div class="dropdown-empty">Nenhum programa configurado</div>'
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
          this.el.toolOpenInDropdown.classList.remove('active')
        })
        this.el.toolOpenInList.appendChild(item)
      })
    }
    this.el.toolOpenInDropdown.classList.add('active')
  },

  updateContextMenuPrograms(programs, ctxOverlay, ctxMenu, { onSelect }) {
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
  },
}

window.THREE = THREE

export let isOpen = false
export let viewerModel = null
let animId = null
let cameraReset = false
let viewerLoaded = false
let hideViewerTimeout = null
const resetProgress = { value: 0 }
const initialCamPos = new THREE.Vector3(3.8, 2.6, 4.8)

const scene = new THREE.Scene()
const modelContainer = new THREE.Group()
scene.add(modelContainer)

const camera = new THREE.PerspectiveCamera(40, View.el.viewport.clientWidth / View.el.viewport.clientHeight, 0.1, 50)
camera.position.copy(initialCamPos)

const renderer = new THREE.WebGLRenderer({
  antialias: true, alpha: true, powerPreference: 'high-performance',
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(View.el.viewport.clientWidth, View.el.viewport.clientHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.outputColorSpace = THREE.SRGBColorSpace
View.el.viewport.prepend(renderer.domElement)

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
  const w = View.el.viewport.clientWidth
  const h = View.el.viewport.clientHeight
  if (w === 0 || h === 0) return
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h, false)
}).observe(View.el.viewport)

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

async function initViewer() {
  if (viewerLoaded) return
  viewerLoaded = true
  View.el.loadingEl.classList.remove('hidden')
  addShadowGround()
  modelContainer.add(buildProceduralSofa())
  await new Promise(r => setTimeout(r, 600))
  View.el.loadingEl.classList.add('hidden')
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

export async function openViewer3D(model) {
  viewerModel = model
  View.el.modalAssetName.textContent = model.nome + ' · 3D Model'
  View.el.modalAuthor.textContent = model.autor
  View.hideViewerMessage()
  View.el.modalOverlay.classList.add('active')
  isOpen = true
  await initViewer()

  let file = model.importedFile
  if (!file && model.storagePath) {
    View.showToast('Baixando arquivo do servidor...', 'info')
    file = await Model.obterArquivoModelo(model)
  }
  if (file) {
    const ext = file.name.split('.').pop().toLowerCase()
    let loadedScene = null

    try {
      View.el.loadingEl.classList.remove('hidden')

      if (ext === 'gltf' || ext === 'glb') {
        const url = URL.createObjectURL(file)
        const gltf = await new GLTFLoader().loadAsync(url)
        URL.revokeObjectURL(url)
        loadedScene = gltf.scene
      } else if (ext === 'obj') {
        const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js')
        const url = URL.createObjectURL(file)
        loadedScene = await new OBJLoader().loadAsync(url)
        URL.revokeObjectURL(url)
      } else if (ext === 'fbx') {
        const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js')
        const url = URL.createObjectURL(file)
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

    setTimeout(() => View.el.loadingEl.classList.add('hidden'), 200)

    if (!loadedScene) {
      clearProceduralModel()
      View.showViewerMessage(
        ext === 'blend'
          ? 'Arquivos .blend não podem ser visualizados no navegador.'
          : `Visualização de .${ext} não disponível. Exporte para .glb.`,
        '.' + ext
      )
    }
  }

  animate()
}

export function closeModal() {
  View.el.modalOverlay.classList.remove('active')
  isOpen = false
  View.hideViewerMessage()
  if (hideViewerTimeout) { clearTimeout(hideViewerTimeout); hideViewerTimeout = null }
  if (animId) { cancelAnimationFrame(animId); animId = null }
}

// Event listeners do visualizador 3D
View.el.closeBtn.addEventListener('click', closeModal)
View.el.modalOverlay.addEventListener('click', e => { if (e.target === View.el.modalOverlay) closeModal() })
document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) closeModal() })

controls.addEventListener('start', () => { controls.autoRotate = false })
controls.addEventListener('end', () => {
  setTimeout(() => { if (isOpen) controls.autoRotate = true }, 3000)
})

window.View = View
