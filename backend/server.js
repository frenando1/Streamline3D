import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { execFile } from 'child_process';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const app = express();
const PORT = 3000;

app.use(cors({
  origin: true,
}));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

const pyScriptPath = join(__dirname, 'conversor.py');

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Streamline 3D server rodando ✅' });
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
