import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { execFile, exec } from 'child_process';
import { writeFileSync, readFileSync, existsSync, unlinkSync, createWriteStream, createReadStream, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const app = express();
const PORT = 3000;

app.use(cors({
  origin: true,
}));
app.use(express.json({ limit: '500mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

const pyScriptPath = join(__dirname, 'conversor.py');

const isWin = process.platform === 'win32'
const rclonePath = isWin
  ? `"${join(__dirname, '..', 'rclone-v1.74.3', 'rclone.exe')}"`
  : `"${join(__dirname, '..', 'rclone-v1.74.3', 'rclone-v1.74.3-linux-amd64', 'rclone')}"`;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Streamline 3D server rodando ✅' });
});

function buildRemotePath(remoteName, path, fileName) {
  remoteName = remoteName || 'gdrive';
  const base = path ? `${remoteName}:${path.replace(/\/$/, '')}` : `${remoteName}:`;
  return `${base}/${fileName}`;
}

// ================= ROTA: SALVAR ARQUIVO DE TEXTO NO GOOGLE DRIVE =================
app.post('/api/drive/upload', (req, res) => {
  const { userId, nomeUsuario, conteudoTexto } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'O ID do utilizador é obrigatório.' });
  }

  const fileName = `streamline3d_backup_${userId}.txt`;
  const tempFilePath = join(tmpdir(), fileName);

  try {
    writeFileSync(tempFilePath, conteudoTexto, 'utf-8');

    exec(`${rclonePath} copyto "${tempFilePath}" "gdrive:${fileName}"`, (error, stdout, stderr) => {
      try { unlinkSync(tempFilePath); } catch (_) {}

      if (error) {
        console.error('❌ Erro no Rclone Upload:', stderr);
        return res.status(500).json({ error: 'Falha ao sincronizar com o Google Drive via Rclone.', details: stderr });
      }

      console.log(`✅ Rclone: Backup atualizado com sucesso para: ${nomeUsuario} (${userId})`);
      return res.json({ success: true, message: 'Backup atualizado com sucesso no Rclone!' });
    });

  } catch (err) {
    try { unlinkSync(tempFilePath); } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

// ================= ROTA: PUXAR ARQUIVO DE TEXTO DO GOOGLE DRIVE =================
app.get('/api/drive/download/:userId', (req, res) => {
  const localPath = join(__dirname, '..', 'modelos.txt');
  try {
    if (!existsSync(localPath)) {
      return res.json({ conteudoTexto: '' });
    }
    const conteudo = readFileSync(localPath, 'utf-8');
    console.log(`📖 modelos.txt lido localmente (${conteudo.split('\n').filter(l => l.trim()).length} modelos)`);
    return res.json({ conteudoTexto: conteudo });
  } catch (err) {
    console.error('Erro ao ler modelos.txt:', err);
    return res.json({ conteudoTexto: '' });
  }
});

// ================= ROTA: LISTAR REMOTES =================
app.get('/api/drive/remotes', (req, res) => {
  exec(`${rclonePath} listremotes --long`, (err, stdout, stderr) => {
    if (err) {
      console.error('Erro ao executar rclone listremotes:', err);
      return res.status(500).json({ error: 'Falha ao buscar remotes', details: err.message });
    }

    const lines = stdout.split('\n').filter(line => line.trim());
    const remotes = lines.map(line => {
      const parts = line.split(':');
      const nome = parts[0]?.trim() || '';
      const tipo = parts[1]?.trim() || 'Desconhecido';
      return { nome, tipo };
    });

    res.json({ remotes });
  });
});

// ================= ROTA 4: TESTAR CONEXÃO RCLONE =================
app.post('/api/drive/test', (req, res) => {
  const { remoteName, path } = req.body;
  const remote = remoteName || 'gdrive';

  const testPath = path ? `${remote}:${path.replace(/\/$/, '')}` : `${remote}:`;

  exec(`${rclonePath} lsd "${testPath}" 2>&1`, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Rclone test falhou:', stderr || error.message);
      return res.json({ success: false, error: stderr || error.message });
    }

    console.log(`✅ Rclone conexão OK: ${testPath}`);
    res.json({ success: true, message: 'Conexão com Rclone estabelecida!' });
  });
});

// ================= ROTA: INICIALIZAR SESSÃO DO USUÁRIO =================
app.post('/api/auth/session-init', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'ID do usuário é obrigatório.' });

    const localPath = join(__dirname, '..', 'modelos.txt');
    const remoteUsuario = `user_${userId.replace(/[^a-zA-Z0-9]/g, '')}`;

    exec(`${rclonePath} listremotes`, (err, stdout) => {
      if (err) {
        console.error('Erro ao verificar remotes do Rclone:', err);
        return res.json({ success: true, remoteName: remoteUsuario, needsAuth: true, message: 'Rclone não disponível.' });
      }

      const remoteExiste = stdout.includes(remoteUsuario + ':');

      if (!remoteExiste) {
        console.log(`✨ Criando remote automático: ${remoteUsuario}`);
        exec(`${rclonePath} config create ${remoteUsuario} drive`, (createErr) => {
          if (createErr) console.error('Erro ao criar remote:', createErr);
        });

        if (!existsSync(localPath)) writeFileSync(localPath, '', 'utf8');
        return res.json({ success: true, needsAuth: true, remoteName: remoteUsuario });
      }

      // Remote existe: sincronizar modelos.txt + uploads do Drive para o PC
      console.log(`🔄 Sincronizando modelos.txt do Drive (${remoteUsuario})...`);
      exec(`${rclonePath} copy "${remoteUsuario}:modelos.txt" "${localPath}"`, (copyErr) => {
        if (copyErr) {
          console.log('ℹ️ Nenhum modelos.txt no Drive do usuário ainda.');
          if (!existsSync(localPath)) writeFileSync(localPath, '', 'utf8');
        } else {
          console.log('✅ modelos.txt sincronizado do Drive!');
        }
        exec(`${rclonePath} copy "${remoteUsuario}:uploads" "${uploadsDir}"`, () => {
          return res.json({ success: true, needsAuth: false, remoteName: remoteUsuario });
        });
      });
    });

  } catch (err) {
    console.error('Erro no session-init:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ================= ROTA: ENVIAR MODELOS.TXT + UPLOADS PARA O DRIVE DO USUÁRIO =================
app.post('/api/drive/upload-modelos', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'ID do usuário ausente.' });

    const filename = join(__dirname, '..', 'modelos.txt');
    const remoteUsuario = `user_${userId.replace(/[^a-zA-Z0-9]/g, '')}`;

    console.log(`📤 Sincronizando modelos.txt + uploads/ no Drive do usuário: ${remoteUsuario}`);

    exec(`${rclonePath} copy "${filename}" ${remoteUsuario}:`, (err, stdout, stderr) => {
      if (err) {
        console.error('Erro no Rclone modelos.txt:', err);
        return res.status(500).json({ error: 'Erro ao enviar para o Drive', details: err.message });
      }

      exec(`${rclonePath} copy "${uploadsDir}" ${remoteUsuario}:uploads`, (err2) => {
        if (err2) {
          console.error('Erro no Rclone uploads/:', err2);
          return res.json({ success: true, warning: 'modelos.txt sincronizado, uploads/ falhou.' });
        }

        console.log(`✅ modelos.txt + uploads/ sincronizados para ${remoteUsuario}`);
        return res.json({ success: true, message: 'Sincronizado com sucesso!' });
      });
    });
  } catch (err) {
    console.error('Erro no upload-modelos:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ================= ROTA: ATUALIZAR MODELOS.TXT COM O CONTEÚDO DOS MODELOS =================
app.post('/api/modelos/atualizar-arquivo', express.text({ limit: '500mb', type: 'text/plain' }), (req, res) => {
  try {
    const conteudoTexto = req.body || '';
    if (conteudoTexto === '') {
      // Allow empty content (clearing the file)
    }

    const filename = join(__dirname, '..', 'modelos.txt');
    writeFileSync(filename, conteudoTexto, 'utf8');
    console.log(`📝 modelos.txt atualizado (${conteudoTexto ? conteudoTexto.split('\n').filter(l => l.trim()).length : 0} modelos).`);
    return res.json({ success: true, message: 'modelos.txt atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar modelos.txt:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ================= ROTA: UPLOAD DE ARQUIVO BINÁRIO =================
const uploadsDir = join(__dirname, 'uploads');
try { mkdirSync(uploadsDir, { recursive: true }); } catch (_) {}

app.post('/api/modelos/upload', upload.single('file'), (req, res) => {
  try {
    const { id, extensao } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    if (!id) return res.status(400).json({ error: 'ID do asset é obrigatório.' });

    const ext = extensao ? (extensao.startsWith('.') ? extensao : '.' + extensao) : '.bin';
    const filePath = join(uploadsDir, `${id}${ext}`);

    writeFileSync(filePath, req.file.buffer);
    console.log(`📦 Asset salvo: ${filePath}`);
    return res.json({ success: true, filePath });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ================= ROTA: DOWNLOAD DE ARQUIVO BINÁRIO =================
app.get('/api/modelos/download/:id', (req, res) => {
  try {
    const { id } = req.params;
    const ext = req.query.ext || '.bin';
    const filePath = join(uploadsDir, `${id}${ext}`);

    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado.' });
    }

    const buffer = readFileSync(filePath);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${id}${ext}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/converter', upload.single('blend'), (req, res) => {
  let blenderPath = req.body.blenderPath;

  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo .blend enviado' });
  }
  if (!blenderPath) {
    return res.status(400).json({ error: 'Caminho do Blender não informado' });
  }
  const cleanPath = blenderPath.replace(/^["']|["']$/g, '');
  if (!existsSync(cleanPath)) {
    return res.status(400).json({
      error: `Programa não encontrado em: ${cleanPath}. Verifique o caminho nas Configurações.`
    });
  }
  blenderPath = cleanPath;

  const timestamp = Date.now();
  const tmpBlend = join(tmpdir(), `streamline_${timestamp}.blend`);
  const tmpGlb   = join(tmpdir(), `streamline_${timestamp}.glb`);

  writeFileSync(tmpBlend, req.file.buffer);

  console.log(`\n🔄 Convertendo: ${req.file.originalname}`);
  console.log(`   Blender: ${blenderPath}`);

  execFile(
    blenderPath,
    ['--background', '--python', pyScriptPath, '--', tmpBlend, tmpGlb],
    { timeout: 120000 },
    (err, stdout, stderr) => {
      try { unlinkSync(tmpBlend); } catch (_) {}

      const conversaoOK = stdout.includes('CONVERSAO_SUCESSO') && existsSync(tmpGlb);

      if (err && !conversaoOK) {
        console.error('❌ Erro Blender:', err.message);
        console.error('   stderr:', stderr);
        try { unlinkSync(tmpGlb); } catch (_) {}
        return res.status(500).json({
          error: 'Falha ao executar o Blender.',
          details: err.message,
        });
      }

      if (!conversaoOK) {
        console.error('❌ Falha na conversão');
        console.error('   stdout:', stdout);
        try { unlinkSync(tmpGlb); } catch (_) {}
        return res.status(500).json({
          error: 'Blender não gerou o .glb corretamente.',
        });
      }

      if (err && conversaoOK) {
        console.log('⚠️  Programa crashou após a conversão. .glb gerado normalmente.');
      }

      const glbBuffer = readFileSync(tmpGlb);
      try { unlinkSync(tmpGlb); } catch (_) {}

      console.log(`✅ Conversão concluída: ${glbBuffer.length} bytes`);

      res.set({
        'Content-Type': 'model/gltf-binary',
        'Content-Disposition': `attachment; filename="${req.file.originalname.replace('.blend', '.glb')}"`,
        'Content-Length': glbBuffer.length,
      });
      res.send(glbBuffer);
    }
  );
});

app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║     Streamline 3D — Backend Server     ║');
  console.log(`║     http://localhost:${PORT}              ║`);
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log('✅ Aguardando conversões .blend → .glb...');
  console.log('   Para parar: Ctrl+C');
  console.log('');
});
