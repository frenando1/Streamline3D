import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const Model = {
  categories: [
    { id: 'hdri', nome: 'HDRI', cor: '#5B8DEF' },
    { id: 'textures', nome: 'Textures', cor: '#4CAF50' },
    { id: 'models', nome: 'Models', cor: '#6C5CE7' },
    { id: 'materials', nome: 'Materials', cor: '#FF7043' },
    { id: 'brushes', nome: 'Brushes', cor: '#FFC107' },
    { id: 'plugins', nome: 'Plugins', cor: '#AB47BC' },
  ],

  thumbnailGradients: [
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
  ],

  models: [],
  colecoes: [],
  colecaoAtiva: null,
  assetColecoes: new Map(),

  licenseNames: {
    'cc0': 'CC0 (Domínio Público)',
    'cc-by': 'CC BY (Atribuição)',
    'cc-by-nc': 'CC BY-NC (NãoComercial)',
    'cc-by-sa': 'CC BY-SA (CompartilhaIgual)',
    'royalty-free': 'Royalty Free',
  },

  externalPrograms: [],

  settings: { theme: 'dark' },

  rcloneConfig: {
    enabled: false,
    remote: 'gdrive',
    path: '',
  },

  currentUser: null,

  carregarProgramas() {
    try {
      const salvo = localStorage.getItem('streamline3d_programs')
      if (salvo) this.externalPrograms = JSON.parse(salvo)
    } catch (e) {}
  },

  salvarProgramas() {
    try { localStorage.setItem('streamline3d_programs', JSON.stringify(this.externalPrograms)) } catch (e) {}
  },

  carregarConfig() {
    try {
      const salvo = localStorage.getItem('streamline3d_settings')
      if (salvo) this.settings = { theme: 'dark', ...JSON.parse(salvo) }
    } catch (e) {}
    try {
      const rclone = localStorage.getItem('streamline3d_rclone')
      if (rclone) this.rcloneConfig = { enabled: false, remote: 'gdrive', path: '', ...JSON.parse(rclone) }
    } catch (e) {}
  },

  salvarConfig() {
    try { localStorage.setItem('streamline3d_settings', JSON.stringify(this.settings)) } catch (e) {}
    try { localStorage.setItem('streamline3d_rclone', JSON.stringify(this.rcloneConfig)) } catch (e) {}
  },

  async loginUser(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', data.user.id)
      .single()

    this.currentUser = {
      id: data.user.id,
      name: profile?.name || email.split('@')[0],
      email: data.user.email,
    }
    this._saveSession(this.currentUser)
    return this.currentUser
  },

  async signUpUser(email, password, usuario) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, name: usuario, email })
      if (profileError) console.warn('Erro ao criar perfil:', profileError.message)
    }

    this.currentUser = {
      id: data.user.id,
      name: usuario,
      email: data.user.email,
    }
    this._saveSession(this.currentUser)
    return { user: this.currentUser, session: !!data.session, name: usuario }
  },

  async logoutUser() {
    console.log('[logout] Chamando signOut...')
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    try {
      await Promise.race([supabase.auth.signOut(), timeout])
      console.log('[logout] signOut concluído')
    } catch (err) {
      console.warn('[logout] signOut falhou ou timeoute, forçando logout local:', err.message)
      Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-')) localStorage.removeItem(k) })
    }
    this.currentUser = null
    this._clearSession()
  },

  async signInWithProvider(provider) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: 'http://localhost:5173' },
    })
    if (error) throw new Error(error.message)
  },

  async updateUser(data) {
    if (!this.currentUser) return false

    if (data.name) {
      const { error } = await supabase
        .from('profiles')
        .update({ name: data.name })
        .eq('id', this.currentUser.id)
      if (error) throw new Error(error.message)
      this.currentUser.name = data.name
    }

    const authUpdates = {}
    if (data.email) authUpdates.email = data.email
    if (data.password) authUpdates.password = data.password
    if (Object.keys(authUpdates).length) {
      const { error } = await supabase.auth.updateUser(authUpdates)
      if (error) throw new Error(error.message)
      if (data.email) this.currentUser.email = data.email
    }

    this._saveSession(this.currentUser)
    return true
  },

  hasRecoveryToken() {
    return window.location.hash.includes('type=recovery')
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    if (data?.session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', data.session.user.id)
        .single()
      this.currentUser = {
        id: data.session.user.id,
        name: profile?.name || data.session.user.email?.split('@')[0],
        email: data.session.user.email,
      }
      this._saveSession(this.currentUser)
    }
    return data.session
  },

  async carregarSessao() {
    try {
      const data = localStorage.getItem('streamline3d_session')
      if (data) {
        this.currentUser = JSON.parse(data)
        return this.currentUser
      }
    } catch (e) {}
    this.currentUser = null
    return null
  },

  async resetPasswordForEmail(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) throw error
    return data
  },

  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
    return data
  },

  onAuthChange(callback) {},

  guessCategory(ext) {
    const map = {
      hdr: 'hdri', exr: 'hdri',
      png: 'textures', jpg: 'textures', jpeg: 'textures', tga: 'textures', tiff: 'textures',
      blend: 'models', fbx: 'models', obj: 'models', gltf: 'models', glb: 'models', max: 'models',
      blendmat: 'materials', mtlexp: 'materials',
      brush: 'brushes', abr: 'brushes',
      py: 'plugins', zip: 'plugins',
    }
    return map[ext.replace('.', '').toLowerCase()] || 'models'
  },

  async carregarModelos() {
    if (!this.currentUser) {
      this.models.length = 0
      return
    }
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', this.currentUser.id)
      .order('created_at', { ascending: false })
    if (error) throw error

    this.models.length = 0
    for (const row of data) {
      let meta = {}
      try { meta = JSON.parse(row.conteudo_texto || '{}') } catch (e) {}
      this.models.push({
        id: row.id,
        nome: row.nome,
        autor: meta.autor || '',
        categoria: meta.categoria || 'models',
        licenca: meta.licenca || 'cc0',
        formato: meta.formato || '',
        disponivelDownload: meta.disponivelDownload ?? true,
        animacao: meta.animacao ?? false,
        thumbnailGrad: meta.thumbnailGrad || this.thumbnailGradients[0],
        storagePath: row.storage_path,
        importedFile: null,
      })
    }
  },

  async salvarModelo(model) {
    if (!this.currentUser) return
    let storagePath = null
    if (model.importedFile) {
      storagePath = `${this.currentUser.id}/${model.id}/${model.importedFile.name}`
      const { error: upErr } = await supabase.storage
        .from('modelos')
        .upload(storagePath, model.importedFile, { upsert: true })
      if (upErr) {
        if (upErr.message?.includes('Bucket not found')) {
          console.warn('Bucket "modelos" não encontrado no Supabase. Crie-o no painel Storage.')
        } else {
          console.warn('Erro ao enviar arquivo:', upErr.message)
        }
      }
    }
    const { error } = await supabase.from('assets').insert({
      id: model.id,
      user_id: this.currentUser.id,
      nome: model.nome,
      conteudo_texto: JSON.stringify({
        autor: model.autor,
        categoria: model.categoria,
        licenca: model.licenca,
        formato: model.formato,
        disponivelDownload: model.disponivelDownload,
        animacao: model.animacao,
        thumbnailGrad: model.thumbnailGrad,
      }),
      storage_path: storagePath,
    })
    if (error) throw error
    model.storagePath = storagePath
  },

  async atualizarModelo(model) {
    if (!this.currentUser) return
    let storagePath = model.storagePath
    if (model.importedFile) {
      storagePath = `${this.currentUser.id}/${model.id}/${model.importedFile.name}`
      const { error: upErr } = await supabase.storage
        .from('modelos')
        .upload(storagePath, model.importedFile, { upsert: true })
      if (upErr) {
        if (upErr.message?.includes('Bucket not found')) {
          console.warn('Bucket "modelos" não encontrado no Supabase. Crie-o no painel Storage.')
        } else {
          console.warn('Erro ao enviar arquivo:', upErr.message)
        }
      }
    }
    const { error } = await supabase
      .from('assets')
      .update({
        nome: model.nome,
        conteudo_texto: JSON.stringify({
          autor: model.autor,
          categoria: model.categoria,
          licenca: model.licenca,
          formato: model.formato,
          disponivelDownload: model.disponivelDownload,
          animacao: model.animacao,
          thumbnailGrad: model.thumbnailGrad,
        }),
        storage_path: storagePath,
      })
      .eq('id', model.id)
      .eq('user_id', this.currentUser.id)
    if (error) throw error
    model.storagePath = storagePath
  },

  async deletarModelo(model) {
    if (!this.currentUser) return
    if (model.storagePath) {
      const { error: rmErr } = await supabase.storage
        .from('modelos')
        .remove([model.storagePath])
      if (rmErr) console.warn('Erro ao remover arquivo:', rmErr.message)
    }
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', model.id)
      .eq('user_id', this.currentUser.id)
    if (error) throw error
    this.assetColecoes.delete(model.id)
    this._saveColecoesLocal()
  },

  async obterArquivoModelo(model) {
    if (model.importedFile) return model.importedFile
    if (!model.storagePath) return null
    try {
      const res = await fetch(model.storagePath)
      if (!res.ok) return null
      const blob = await res.blob()
      const ext = model.formato.startsWith('.') ? model.formato : '.' + model.formato
      model.importedFile = new File([blob], model.nome + ext)
      return model.importedFile
    } catch (e) {
      console.warn('Download falhou:', e)
      return null
    }
  },

  _saveSession(user) {
    try { localStorage.setItem('streamline3d_session', JSON.stringify(user)) } catch (e) {}
  },

  _clearSession() {
    try { localStorage.removeItem('streamline3d_session') } catch (e) {}
  },

  _colecoesStorageKey() {
    return `streamline3d_colecoes_${this.currentUser?.id || 'anon'}`
  },

  _assetColecoesStorageKey() {
    return `streamline3d_asset_colecoes_${this.currentUser?.id || 'anon'}`
  },

  _saveColecoesLocal() {
    try {
      localStorage.setItem(this._colecoesStorageKey(), JSON.stringify(this.colecoes))
      const obj = {}
      for (const [assetId, colecaoIds] of this.assetColecoes) {
        obj[assetId] = Array.from(colecaoIds)
      }
      localStorage.setItem(this._assetColecoesStorageKey(), JSON.stringify(obj))
    } catch (e) {}
  },

  _loadColecoesLocal() {
    try {
      const data = localStorage.getItem(this._colecoesStorageKey())
      if (data) this.colecoes = JSON.parse(data)
      const mapData = localStorage.getItem(this._assetColecoesStorageKey())
      if (mapData) {
        const obj = JSON.parse(mapData)
        this.assetColecoes = new Map()
        for (const [k, v] of Object.entries(obj)) {
          this.assetColecoes.set(k, new Set(v))
        }
      }
    } catch (e) {}
  },

  async carregarColecoes() {
    this.colecoes = []
    if (this.currentUser) {
      const { data, error } = await supabase
        .from('colecoes')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      for (const row of data) {
        this.colecoes.push({
          id: row.id,
          nome: row.nome,
          descricao: row.descricao || '',
          cor: row.cor || '#6C5CE7',
          createdAt: row.created_at,
        })
      }
    } else {
      this._loadColecoesLocal()
    }
    await this.carregarColecaoAssetsMap()
  },

  async carregarColecaoAssetsMap() {
    this.assetColecoes = new Map()
    if (!this.currentUser) {
      this._loadColecoesLocal()
      return
    }
    for (const colecao of this.colecoes) {
      const { data, error } = await supabase
        .from('colecao_assets')
        .select('asset_id')
        .eq('colecao_id', colecao.id)
      if (error) continue
      for (const row of data) {
        const assetId = row.asset_id
        if (!this.assetColecoes.has(assetId)) {
          this.assetColecoes.set(assetId, new Set())
        }
        this.assetColecoes.get(assetId).add(colecao.id)
      }
    }
  },

  async salvarColecao(colecao) {
    if (this.currentUser) {
      const { error } = await supabase.from('colecoes').insert({
        id: colecao.id,
        user_id: this.currentUser.id,
        nome: colecao.nome,
        descricao: colecao.descricao || '',
        cor: colecao.cor || '#6C5CE7',
      })
      if (error) throw error
    }
    this.colecoes.unshift(colecao)
    this._saveColecoesLocal()
  },

  async atualizarColecao(colecao) {
    if (this.currentUser) {
      const { error } = await supabase
        .from('colecoes')
        .update({
          nome: colecao.nome,
          descricao: colecao.descricao || '',
          cor: colecao.cor || '#6C5CE7',
        })
        .eq('id', colecao.id)
        .eq('user_id', this.currentUser.id)
      if (error) throw error
    }
    const idx = this.colecoes.findIndex(c => c.id === colecao.id)
    if (idx > -1) this.colecoes[idx] = colecao
    this._saveColecoesLocal()
  },

  async deletarColecao(colecao) {
    if (this.currentUser) {
      const { error } = await supabase
        .from('colecoes')
        .delete()
        .eq('id', colecao.id)
        .eq('user_id', this.currentUser.id)
      if (error) throw error
    }
    const idx = this.colecoes.findIndex(c => c.id === colecao.id)
    if (idx > -1) this.colecoes.splice(idx, 1)
    for (const [, colecaoIds] of this.assetColecoes) {
      colecaoIds.delete(colecao.id)
    }
    if (this.colecaoAtiva === colecao.id) this.colecaoAtiva = null
    this._saveColecoesLocal()
  },

  async adicionarAssetNaColecao(colecaoId, assetId) {
    if (this.currentUser) {
      const model = this.models.find(m => m.id === assetId)
      if (model) {
        const { data: existente } = await supabase
          .from('assets')
          .select('id')
          .eq('id', assetId)
          .maybeSingle()
        if (!existente) {
          await this.salvarModelo(model)
        }
      }
      const { error } = await supabase.from('colecao_assets').insert({
        colecao_id: colecaoId,
        asset_id: assetId,
      })
      if (error && !error.message?.includes('duplicate key')) throw error
    }
    if (!this.assetColecoes.has(assetId)) {
      this.assetColecoes.set(assetId, new Set())
    }
    this.assetColecoes.get(assetId).add(colecaoId)
    this._saveColecoesLocal()
  },

  async removerAssetDaColecao(colecaoId, assetId) {
    if (this.currentUser) {
      const { error } = await supabase
        .from('colecao_assets')
        .delete()
        .eq('colecao_id', colecaoId)
        .eq('asset_id', assetId)
      if (error) throw error
    }
    const colecaoIds = this.assetColecoes.get(assetId)
    if (colecaoIds) {
      colecaoIds.delete(colecaoId)
      if (colecaoIds.size === 0) this.assetColecoes.delete(assetId)
    }
    this._saveColecoesLocal()
  },

  colecoesDeAsset(assetId) {
    const ids = this.assetColecoes.get(assetId)
    if (!ids) return []
    return this.colecoes.filter(c => ids.has(c.id))
  },

  async _uploadModelo(model) {
    if (!model.importedFile) return
    const ext = model.formato.startsWith('.') ? model.formato : '.' + model.formato
    const formData = new FormData()
    formData.append('file', model.importedFile)
    formData.append('id', model.id)
    formData.append('extensao', ext)
    try {
      const res = await fetch('http://localhost:3000/api/modelos/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.success) {
        model.storagePath = `http://localhost:3000/api/modelos/download/${model.id}?ext=${ext}`
      }
    } catch (e) {
      console.warn('Upload falhou:', e)
    }
  },

  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => {
        const partes = r.result.split(',')
        resolve(partes[1])
      }
      r.onerror = reject
      r.readAsDataURL(file)
    })
  },

  async exportarModelosParaTexto() {
    let conteudo = ''
    for (const model of this.models) {
      const ext = model.formato.startsWith('.') ? model.formato : '.' + model.formato
      conteudo += `"${model.nome}" id=${model.id} P="${ext}"\n`
    }
    return conteudo
  },

  async exportarModelosCompletosParaTexto() {
    let conteudo = ''
    for (const model of this.models) {
      const ext = model.formato.startsWith('.') ? model.formato : '.' + model.formato

      let file = model.importedFile
      if (!file && model.storagePath) {
        const res = await fetch(model.storagePath)
        if (!res.ok) throw new Error(`"${model.nome}" indisponível no servidor`)
        const blob = await res.blob()
        file = new File([blob], model.nome + ext)
        model.importedFile = file
      }
      if (!file) {
        conteudo += `"${model.nome}" id=${model.id} P="${ext}" # sem arquivo\n`
        continue
      }
      if (file.size > 50 * 1024 * 1024) {
        conteudo += `"${model.nome}" id=${model.id} P="${ext}" # arquivo grande demais\n`
        continue
      }

      const b64 = await this._fileToBase64(file)
      if (!b64) throw new Error(`Base64 falhou para "${model.nome}"`)
      conteudo += `"${model.nome}" id=${model.id} P="${ext}" {"${b64}"}\n`
    }
    return conteudo
  },

  importarModelosDoTexto(conteudo) {
    const linhas = conteudo.split('\n').filter(l => l.trim())
    const imported = []
    for (const linha of linhas) {
      try {
        const nomeMatch = linha.match(/"([^"]+)"/)
        const idMatch = linha.match(/id=([^\s"]+)/)
        const extMatch = linha.match(/P="([^"]+)"/)
        const base64Match = linha.match(/\{"([^"]+)"\}/)
        if (!nomeMatch) continue

        const nome = nomeMatch[1]
        const ext = extMatch ? extMatch[1] : '.blend'
        const id = idMatch ? idMatch[1] : crypto.randomUUID()

        const grad = this.thumbnailGradients[(this.models.length + imported.length) % this.thumbnailGradients.length]
        const cat = this.guessCategory(ext.replace('.', ''))

        let importedFile = null
        let storagePath = `http://localhost:3000/api/modelos/download/${id}?ext=${ext}`

        if (base64Match) {
          const partes = base64Match[1].split(',')
          const base64Data = partes.length > 1 ? partes[1] : base64Match[1]
          const byteString = atob(base64Data)
          const ab = new ArrayBuffer(byteString.length)
          const ia = new Uint8Array(ab)
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i)
          }
          const blob = new Blob([ab])
          importedFile = new File([blob], nome + ext)
        }

        imported.push({
          id,
          nome,
          autor: 'importado',
          categoria: cat,
          licenca: 'cc-by-sa',
          formato: ext,
          disponivelDownload: true,
          animacao: false,
          thumbnailGrad: grad,
          importedFile,
          storagePath,
        })
      } catch (err) {
        console.warn('Linha ignorada:', err)
      }
    }
    return imported
  },
}
