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

export function guessCategory(ext) {
  const map = {
    blend: 'models', max: 'models', fbx: 'models', gltf: 'models', glb: 'models',
    obj: 'models', '3ds': 'models', dae: 'models', stl: 'models', ply: 'models',
    hdr: 'hdri', exr: 'hdri',
    png: 'textures', jpg: 'textures', jpeg: 'textures', tga: 'textures', psd: 'textures',
  }
  return map[ext] || 'models'
}
