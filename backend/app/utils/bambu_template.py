"""
BambuStudio 3MF 模板 + 注入工具
完整流程：从可切片 3MF 提取配置，创建空模板，注入 STL 网格数据
"""
import os, tempfile, zipfile, json, shutil, uuid, re
from typing import Optional, List

# 从已有可切片 3MF 提取完整配置
SOURCE_3MF = r"E:\3d\backend\uploads\models\c6d324cf_Ghost_Phone_Holder.3mf"


def create_blank_bambu_3mf() -> Optional[str]:
    """
    从已知可切片 3MF 创建空白模板（保留配置，去除所有模型数据）
    返回模板 3MF 路径
    """
    if not os.path.exists(SOURCE_3MF):
        print(f"[BambuTemplate] 源文件不存在: {SOURCE_3MF}")
        return None

    tmp = tempfile.mktemp(suffix='.3mf', prefix='bambu_blank_')

    with zipfile.ZipFile(SOURCE_3MF, 'r') as src:
        with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as dst:
            for name in src.namelist():
                # 跳过辅助数据和模型数据
                if name.startswith('Auxiliaries/'):
                    continue
                if name.startswith('3D/Objects/'):
                    continue
                if name == '3D/3dmodel.model':
                    xml = src.read(name).decode('utf-8')
                    # 清空 resources 和 build
                    xml = re.sub(r'<object[^>]*>.*?</object>', '', xml, flags=re.DOTALL)
                    xml = re.sub(r'<components>.*?</components>', '', xml, flags=re.DOTALL)
                    xml = re.sub(r'<build>.*?</build>', '<build>\n  </build>', xml, flags=re.DOTALL)
                    xml = re.sub(r'<resources>.*?</resources>', '<resources>\n  </resources>', xml, flags=re.DOTALL)
                    dst.writestr(name, xml.encode('utf-8'))
                    continue
                if name == 'Metadata/model_settings.config':
                    # 清空模型设置
                    dst.writestr(name, b'<?xml version="1.0" encoding="UTF-8"?>\n<settings />\n')
                    continue
                # Metadata/cut_information.xml 可能关联旧模型，跳过
                if name == 'Metadata/cut_information.xml':
                    continue
                # 保留其他文件：配置、系统文件、rels 等
                dst.writestr(name, src.read(name))

    print(f"[BambuTemplate] 空白模板 ({os.path.getsize(tmp)}B): {tmp}")
    return tmp


def export_stl_as_bambu_3mf(stl_path: str, output_path: str) -> bool:
    """
    用 BambuStudio --export-3mf 将 STL 转为 3MF 文件
    这会生成含分离 Objects 的标准 Bambu 3MF 结构
    """
    cmd = [
        r"E:\tuoz\Bambu_Studio_win-v02.06.00.51-20260417160415\bambu-studio.exe",
        "--export-3mf", output_path,
        stl_path,
    ]
    try:
        import subprocess
        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=120,
            cwd=r"E:\tuoz\Bambu_Studio_win-v02.06.00.51-20260417160415",
        )
        if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
            print(f"[BambuTemplate] --export-3mf 成功 ({os.path.getsize(output_path)}B)")
            return True
        print(f"[BambuTemplate] --export-3mf 失败，输出文件过小")
        return False
    except Exception as e:
        print(f"[BambuTemplate] --export-3mf 异常: {e}")
        return False


def _patch_project_config(config_json: str) -> str:
    """
    对 project_settings.config 应用补丁，使其匹配通用切片参数
    - 打印机: Bambu Lab P1P 0.4 nozzle
    - 耗材: Generic PLA (密度1.24)
    - 工艺: 0.20mm Standard, 15%填充, 2壁线
    """
    config = json.loads(config_json)
    
    # 打印机
    config['printer_model'] = 'Bambu Lab P1P'
    config['printer_settings_id'] = 'Bambu Lab P1P 0.4 nozzle'
    config['print_compatible_printers'] = ['Bambu Lab P1P 0.4 nozzle']
    config['upward_compatible_machine'] = ['Bambu Lab P1P 0.4 nozzle']
    config['printer_technology'] = 'FFF'
    config['printer_structure'] = 'corexy'
    
    # Generic PLA 耗材（保持原数组格式！BambuStudio 期望数组）
    config['filament_settings_id'] = ['Generic PLA @BBL P1P 0.4 nozzle']
    config['filament_type'] = ['PLA']
    config['filament_vendor'] = ['Generic']
    config['filament_density'] = ['1.24']
    config['filament_cost'] = ['20']
    config['filament_ids'] = ['GFL99']
    config['filament_flow_ratio'] = ['0.98']
    config['default_filament_profile'] = ['Generic PLA @BBL P1P']
    
    # 工艺（所有值必须保持原类型！BambuStudio 配置全是字符串）
    config['print_settings_id'] = '0.20mm Standard @BBL P1P'
    config['default_print_profile'] = '0.20mm Standard @BBL P1P'
    config['layer_height'] = '0.2'
    config['sparse_infill_density'] = '15%'
    config['wall_loops'] = '2'
    config['bottom_shell_layers'] = '3'
    config['top_shell_layers'] = '5'
    config['seam_position'] = 'aligned'
    config['sparse_infill_pattern'] = 'grid'
    config['initial_layer_print_height'] = '0.2'
    config['initial_layer_line_width'] = '0.5'
    config['line_width'] = '0.42'
    
    # 机器限制 (P1P)
    config['printable_area'] = ['0x0', '256x0', '256x256', '0x256']
    config['printable_height'] = '256'
    
    return json.dumps(config, ensure_ascii=False, indent=2)


def merge_config_into_3mf(mesh_3mf_path: str, blank_template_path: str) -> str:
    """
    将空白模板的完整配置合并到网格 3MF 中
    保留网格 3MF 的 Objects 数据，替换所有配置/系统文件
    同时应用通用配置补丁
    
    Returns: 合并后的 3MF 路径
    """
    output = tempfile.mktemp(suffix='.3mf', prefix='bambu_merged_')

    with zipfile.ZipFile(mesh_3mf_path, 'r') as mesh_zf:
        mesh_files = set(mesh_zf.namelist())
        
        with zipfile.ZipFile(blank_template_path, 'r') as tmpl_zf:
            tmpl_files = set(tmpl_zf.namelist())
            
            with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as out:
                # 写入模板的非配置、非 3D 文件
                for name in sorted(tmpl_files):
                    if name.startswith('3D/'):
                        continue  # 3D 数据文件用网格的
                    if name == 'Metadata/project_settings.config':
                        raw = tmpl_zf.read(name).decode('utf-8')
                        patched = _patch_project_config(raw)
                        out.writestr(name, patched.encode('utf-8'))
                    else:
                        out.writestr(name, tmpl_zf.read(name))
                
                # 写入网格 3MF 的所有文件（包括 3D 模型数据、系统文件）
                for name in sorted(mesh_files):
                    if name not in tmpl_files or name.startswith('3D/'):
                        out.writestr(name, mesh_zf.read(name))

    size = os.path.getsize(output)
    print(f"[BambuTemplate] 合并完成 ({size}B): {output}")
    return output


def wrap_model_for_slicing(file_path: str) -> Optional[str]:
    """
    主入口：将任意模型文件包装为可被 BambuStudio CLI 切片的 3MF
    
    流程：
    1. 对 STL：先用 --export-3mf 导出（生成 Bambu 格式 3MF）
    2. 对 3MF：直接用
    3. 合并配置：用空白模板中的完整配置覆盖
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == '.3mf':
        return file_path
    
    # 1. 创建空白模板
    blank = create_blank_bambu_3mf()
    if not blank:
        return None
    
    try:
        if ext in ('.stl', '.obj', '.step', '.stp'):
            # 2. --export-3mf: 转为 Bambu 格式 3MF
            temp_mesh = tempfile.mktemp(suffix='.3mf', prefix='bambu_mesh_')
            if not export_stl_as_bambu_3mf(file_path, temp_mesh):
                print("[BambuTemplate] --export-3mf 失败，无法包装")
                return None
            
            # 3. 合并配置
            result = merge_config_into_3mf(temp_mesh, blank)
            
            # 清理中间文件
            try: os.unlink(temp_mesh)
            except: pass
            
            return result
        
        return None
    
    except Exception as e:
        print(f"[BambuTemplate] wrap failed: {e}")
        return None
    finally:
        try: os.unlink(blank)
        except: pass
