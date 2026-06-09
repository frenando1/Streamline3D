import bpy
import sys

def converter_blend_para_glb(caminho_input, caminho_output):
    try:
        # Limpa a cena padrão para evitar resíduos
        bpy.ops.wm.read_factory_settings(use_empty=True)
        
        # Carrega o ficheiro .blend
        bpy.ops.wm.open_mainfile(filepath=caminho_input)
        
        # Exporta para GLB otimizado para a Web
        bpy.ops.export_scene.gltf(
            filepath=caminho_output,
            export_format='GLB',
            export_image_format='AUTO',
            export_apply=True
        )
        print("CONVERSAO_SUCESSO")
    except Exception as e:
        print(f"ERRO_CONVERSAO: {str(e)}")

if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if len(args) >= 2:
        converter_blend_para_glb(args[0], args[1])