import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://dgvjcysvtxrincgpxdng.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndmpjeXN2dHhyaW5jZ3B4ZG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDU5OTksImV4cCI6MjA5Mjk4MTk5OX0.-OdZCBfX1LWHdlGKVG2oOG188ah3aVsMliX7ghUP_xo'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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

  licenseNames: {
    'cc0': 'CC0 (Domínio Público)',
    'cc-by': 'CC BY (Atribuição)',
    'cc-by-nc': 'CC BY-NC (NãoComercial)',
    'cc-by-sa': 'CC BY-SA (CompartilhaIgual)',
    'royalty-free': 'Royalty Free',
  },

  externalPrograms: [],

  settings: { theme: 'dark' },

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
  },

  salvarConfig() {
    try { localStorage.setItem('streamline3d_settings', JSON.stringify(this.settings)) } catch (e) {}
  },

  async loginUser(email, password) {
    const { data, error } = await supabase.rpc('login_user', {
      user_email: email,
      user_password: password,
    })
    if (error) throw new Error(error.message)
    if (!data) throw new Error('Invalid login credentials')

    this.currentUser = data
    this._saveSession(this.currentUser)
    return this.currentUser
  },

  async signUpUser(email, password, usuario) {
    const { data, error } = await supabase.rpc('sign_up', {
      user_email: email,
      user_name: usuario,
      user_password: password,
    })
    if (error) throw new Error(error.message)

    this.currentUser = data
    this._saveSession(this.currentUser)
    return { user: data, session: true, name: usuario }
  },

  async logoutUser() {
    this.currentUser = null
    this._clearSession()
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
    this._saveSession(this.currentUser)
    return true
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

  onAuthChange(callback) {},

  guessCategory(ext) {
    const map = {
      blend: 'models', max: 'models', fbx: 'models', gltf: 'models', glb: 'models',
      obj: 'models', '3ds': 'models', dae: 'models', stl: 'models', ply: 'models',
      hdr: 'hdri', exr: 'hdri',
      png: 'textures', jpg: 'textures', jpeg: 'textures', tga: 'textures', psd: 'textures',
    }
    return map[ext] || 'models'
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
      this.models.push({
        id: row.id,
        nome: row.nome,
        autor: row.autor,
        categoria: row.categoria,
        licenca: row.licenca,
        formato: row.formato,
        disponivelDownload: row.disponivel_download,
        animacao: row.animacao,
        thumbnailGrad: row.thumbnail_grad,
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
      if (upErr) console.warn('Erro ao enviar arquivo:', upErr.message)
    }
    const { error } = await supabase.from('assets').insert({
      id: model.id,
      user_id: this.currentUser.id,
      nome: model.nome,
      autor: model.autor,
      categoria: model.categoria,
      licenca: model.licenca,
      formato: model.formato,
      disponivel_download: model.disponivelDownload,
      animacao: model.animacao,
      thumbnail_grad: model.thumbnailGrad,
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
      if (upErr) console.warn('Erro ao enviar arquivo:', upErr.message)
    }
    const { error } = await supabase
      .from('assets')
      .update({
        nome: model.nome,
        formato: model.formato,
        disponivel_download: model.disponivelDownload,
        animacao: model.animacao,
        thumbnail_grad: model.thumbnailGrad,
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
  },

  async obterArquivoModelo(model) {
    if (model.importedFile) return model.importedFile
    if (!model.storagePath) return null
    const { data, error } = await supabase.storage
      .from('modelos')
      .download(model.storagePath)
    if (error || !data) return null
    const name = model.storagePath.split('/').pop()
    const ext = model.formato.startsWith('.') ? model.formato : '.' + model.formato
    model.importedFile = new File([data], name || model.nome + ext)
    return model.importedFile
  },

  _saveSession(user) {
    try { localStorage.setItem('streamline3d_session', JSON.stringify(user)) } catch (e) {}
  },

  _clearSession() {
    try { localStorage.removeItem('streamline3d_session') } catch (e) {}
  },

  _arquivoParaBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  },

  _base64ParaBlob(base64Data) {
    const partes = base64Data.split(',')
    const byteString = atob(partes[1])
    const mimeString = partes[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    return new Blob([ab], { type: mimeString })
  },

  async exportarParaArquivoTexto() {
    let conteudo = ''
    for (const model of this.models) {
      if (!model.importedFile) continue
      try {
        const base64 = await this._arquivoParaBase64(model.importedFile)
        const ext = model.formato.startsWith('.') ? model.formato : '.' + model.formato
        conteudo += `id=${model.id} "${model.nome}" {"${base64}"} P="${ext}"\n`
      } catch (err) {
        console.error('Erro ao processar', model.nome, err)
      }
    }
    if (!conteudo) {
      throw new Error('Nenhum modelo com arquivo para exportar')
    }
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'modelos.txt'
    link.click()
    URL.revokeObjectURL(url)
  },

  baixarModeloApartirDoTexto(linhaTexto) {
    const nomeMatch = linhaTexto.match(/"([^"]+)"/)
    const nomeModelo = nomeMatch ? nomeMatch[1] : 'modelo_extraido'
    const extMatch = linhaTexto.match(/P="([^"]+)"/)
    const extensao = extMatch ? extMatch[1] : '.blend'
    const codigoMatch = linhaTexto.match(/\{"([^"]+)"\}/)
    if (!codigoMatch) throw new Error('Código Base64 não encontrado')
    const blob = this._base64ParaBlob(codigoMatch[1])
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = nomeModelo + extensao
    link.click()
    URL.revokeObjectURL(url)
  },

  importarModelosDoTexto(conteudo) {
    const linhas = conteudo.split('\n').filter(l => l.trim())
    const imported = []
    for (const linha of linhas) {
      try {
        const nomeMatch = linha.match(/"([^"]+)"/)
        const idMatch = linha.match(/id=(\d+)/)
        const extMatch = linha.match(/P="([^"]+)"/)
        const codigoMatch = linha.match(/\{"([^"]+)"\}/)
        if (!codigoMatch || !nomeMatch) continue

        const nome = nomeMatch[1]
        const ext = extMatch ? extMatch[1] : '.blend'
        const id = idMatch ? parseInt(idMatch[1]) : Date.now() + imported.length

        const blob = this._base64ParaBlob(codigoMatch[1])
        const file = new File([blob], nome + ext)

        const grad = this.thumbnailGradients[(this.models.length + imported.length) % this.thumbnailGradients.length]
        const cat = this.guessCategory(ext.replace('.', ''))

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
          importedFile: file,
        })
      } catch (err) {
        console.warn('Linha ignorada:', err)
      }
    }
    return imported
  },
}
