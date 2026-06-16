export const categories = [
  { id: 'hdri', nome: 'HDRI', cor: '#5B8DEF' },
  { id: 'textures', nome: 'Textures', cor: '#4CAF50' },
  { id: 'models', nome: 'Models', cor: '#6C5CE7' },
  { id: 'materials', nome: 'Materials', cor: '#FF7043' },
  { id: 'brushes', nome: 'Brushes', cor: '#FFC107' },
  { id: 'plugins', nome: 'Plugins', cor: '#AB47BC' },
]

export const thumbnailGradients = [
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

export const models = []

export const licenseNames = {
  'cc0': 'CC0 (Domínio Público)',
  'cc-by': 'CC BY (Atribuição)',
  'cc-by-nc': 'CC BY-NC (NãoComercial)',
  'cc-by-sa': 'CC BY-SA (CompartilhaIgual)',
  'royalty-free': 'Royalty Free',
}

const PROGRAMS_KEY = 'streamline3d_programs'
export let externalPrograms = []

export function carregarProgramas() {
  try {
    const salvo = localStorage.getItem(PROGRAMS_KEY)
    if (salvo) externalPrograms = JSON.parse(salvo)
  } catch (e) {}
}

export function salvarProgramas() {
  try { localStorage.setItem(PROGRAMS_KEY, JSON.stringify(externalPrograms)) } catch (e) {}
}

const SETTINGS_KEY = 'streamline3d_settings'
export let settings = { theme: 'dark' }

export function carregarConfig() {
  try {
    const salvo = localStorage.getItem(SETTINGS_KEY)
    if (salvo) settings = { theme: 'dark', ...JSON.parse(salvo) }
  } catch (e) {}
}

export function salvarConfig() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch (e) {}
}

import { supabase } from './supabase.js'

export let currentUser = null

const SESSION_KEY = 'streamline3d_session'

function saveSession(user) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)) } catch (e) {}
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY) } catch (e) {}
}

export async function loginUser(email, password) {
  const { data, error } = await supabase.rpc('login_user', {
    user_email: email,
    user_password: password,
  })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Invalid login credentials')

  currentUser = data
  saveSession(currentUser)
  return currentUser
}

export async function signUpUser(email, password, usuario) {
  const { data, error } = await supabase.rpc('sign_up', {
    user_email: email,
    user_name: usuario,
    user_password: password,
  })
  if (error) throw new Error(error.message)

  currentUser = data
  saveSession(currentUser)
  return { user: data, session: true, name: usuario }
}

export async function logoutUser() {
  currentUser = null
  clearSession()
}

export async function updateUser(data) {
  if (!currentUser) return false

  if (data.name) {
    const { error } = await supabase
      .from('profiles')
      .update({ name: data.name })
      .eq('id', currentUser.id)
    if (error) throw new Error(error.message)
    currentUser.name = data.name
  }
  saveSession(currentUser)
  return true
}

export async function carregarSessao() {
  try {
    const data = localStorage.getItem(SESSION_KEY)
    if (data) {
      currentUser = JSON.parse(data)
      return currentUser
    }
  } catch (e) {}
  currentUser = null
  return null
}

export function onAuthChange(callback) {
  // RLS desligado — sem eventos externos de autenticação
}

export function guessCategory(ext) {
  const map = {
    blend: 'models', max: 'models', fbx: 'models', gltf: 'models', glb: 'models',
    obj: 'models', '3ds': 'models', dae: 'models', stl: 'models', ply: 'models',
    hdr: 'hdri', exr: 'hdri',
    png: 'textures', jpg: 'textures', jpeg: 'textures', tga: 'textures', psd: 'textures',
  }
  return map[ext] || 'models'
}

// === Persistência no Supabase ===

export async function carregarModelos() {
  if (!currentUser) {
    models.length = 0
    return
  }
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
  if (error) throw error

  models.length = 0
  for (const row of data) {
    models.push({
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
}

export async function salvarModelo(model) {
  if (!currentUser) return
  let storagePath = null
  if (model.importedFile) {
    storagePath = `${currentUser.id}/${model.id}/${model.importedFile.name}`
    const { error: upErr } = await supabase.storage
      .from('modelos')
      .upload(storagePath, model.importedFile, { upsert: true })
    if (upErr) console.warn('Erro ao enviar arquivo:', upErr.message)
  }
  const { error } = await supabase.from('assets').insert({
    id: model.id,
    user_id: currentUser.id,
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
}

export async function atualizarModelo(model) {
  if (!currentUser) return
  let storagePath = model.storagePath
  if (model.importedFile) {
    storagePath = `${currentUser.id}/${model.id}/${model.importedFile.name}`
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
    .eq('user_id', currentUser.id)
  if (error) throw error
  model.storagePath = storagePath
}

export async function deletarModelo(model) {
  if (!currentUser) return
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
    .eq('user_id', currentUser.id)
  if (error) throw error
}

export async function obterArquivoModelo(model) {
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
}

// === Export/Import para modelos.txt ===

function arquivoParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })
}

function base64ParaBlob(base64Data) {
  const partes = base64Data.split(',')
  const byteString = atob(partes[1])
  const mimeString = partes[0].split(':')[1].split(';')[0]
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeString })
}

export async function exportarParaArquivoTexto() {
  let conteudo = ''
  for (const model of models) {
    if (!model.importedFile) continue
    try {
      const base64 = await arquivoParaBase64(model.importedFile)
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
}

export function baixarModeloApartirDoTexto(linhaTexto) {
  const nomeMatch = linhaTexto.match(/"([^"]+)"/)
  const nomeModelo = nomeMatch ? nomeMatch[1] : 'modelo_extraido'
  const extMatch = linhaTexto.match(/P="([^"]+)"/)
  const extensao = extMatch ? extMatch[1] : '.blend'
  const codigoMatch = linhaTexto.match(/\{"([^"]+)"\}/)
  if (!codigoMatch) throw new Error('Código Base64 não encontrado')
  const blob = base64ParaBlob(codigoMatch[1])
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeModelo + extensao
  link.click()
  URL.revokeObjectURL(url)
}

export function importarModelosDoTexto(conteudo) {
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

      const blob = base64ParaBlob(codigoMatch[1])
      const file = new File([blob], nome + ext)

      const grad = thumbnailGradients[(models.length + imported.length) % thumbnailGradients.length]
      const cat = guessCategory(ext.replace('.', ''))

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
}
