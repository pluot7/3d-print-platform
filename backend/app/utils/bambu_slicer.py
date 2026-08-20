"""
BambuStudio CLI 切片集成
调用 BambuStudio 命令行进行切片，从 result.json 中提取精确耗材重量
"""
import os
import json
import subprocess
import tempfile
import shutil
from typing import Optional, Dict


# BambuStudio 切片引擎路径（从 settings 读取，含兜底默认值）
from app.core.config import settings as _settings

BAMBU_STUDIO_PATH = getattr(_settings, "BAMBU_STUDIO_PATH",
    r"E:\\tuoz\\Bambu_Studio_win-v02.06.00.51-20260417160415\\bambu-studio.exe")

# 默认切片参数
DEFAULT_INFILL = getattr(_settings, "SLICE_INFILL", 15)
DEFAULT_LAYER_HEIGHT = getattr(_settings, "SLICE_LAYER_HEIGHT", 0.20)


def _decode_output(result) -> str:
    """decode subprocess stdout/stderr bytes to str (handle GBK/utf-8)"""
    if result.stdout:
        try:
            return result.stdout.decode('utf-8', errors='replace')
        except Exception:
            return result.stdout.decode('gbk', errors='replace')
    return ''


def _wrap_in_bambu_3mf(file_path: str) -> Optional[str]:
    """
    将 STL/OBJ 等文件包装进带 Bambu 配置的 3MF 中
    BambuStudio CLI 必须使用内嵌配置的 3MF 才能切片
    """
    try:
        from app.utils.bambu_template import wrap_model_for_slicing
        return wrap_model_for_slicing(file_path)
    except ImportError:
        print("[BambuStudio] bambu_template 不可用，退回 trimesh 直接转换")
        return _fallback_trimesh_convert(file_path)
    except Exception as e:
        print(f"[BambuStudio] wrap failed: {e}")
        return _fallback_trimesh_convert(file_path)


def _fallback_trimesh_convert(file_path: str) -> Optional[str]:
    """兜底：用 trimesh 直接导出 3MF（可能不带 Bambu 配置）"""
    try:
        import trimesh
        mesh = trimesh.load(file_path)
        if isinstance(mesh, trimesh.Scene):
            meshes = [g for g in mesh.geometry.values() if isinstance(g, trimesh.Trimesh)]
            if not meshes:
                return None
            mesh = trimesh.util.concatenate(meshes) if len(meshes) > 1 else meshes[0]
        if not isinstance(mesh, trimesh.Trimesh) or mesh.vertices.shape[0] == 0:
            return None
        tmp_3mf = tempfile.mktemp(suffix='.3mf', prefix='bambu_fallback_')
        mesh.export(tmp_3mf, file_type='3mf')
        return tmp_3mf
    except Exception as e:
        print(f"[BambuStudio] fallback 转 3MF 失败: {e}")
        return None


def get_bambu_info(file_path: str) -> Optional[Dict]:
    """调用 BambuStudio --info 获取模型基本信息"""
    if not os.path.exists(BAMBU_STUDIO_PATH):
        return None
    if not os.path.exists(file_path):
        return None

    try:
        result = subprocess.run(
            [BAMBU_STUDIO_PATH, "--info", file_path],
            capture_output=True,
            timeout=30,
            cwd=os.path.dirname(BAMBU_STUDIO_PATH),
        )
        stdout = _decode_output(result)

        info = {}
        for line in stdout.split('\n'):
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()
                try:
                    info[key] = float(value)
                except ValueError:
                    info[key] = value

        return info if info else None
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        print(f"[BambuStudio] --info 调用失败: {e}")
        return None


def slice_model(
    file_path: str,
    material: str = "pla",
    infill: int = DEFAULT_INFILL,
    layer_height: float = DEFAULT_LAYER_HEIGHT,
    timeout_seconds: int = 120,
) -> Optional[Dict]:
    """
    调用 BambuStudio CLI 切片模型，返回切片结果中的重量信息
    
    Args:
        file_path: 输入模型文件路径（3MF/STL/OBJ）
        material: 材料类型 (pla/abs/petg/tpu/nylon/pc/pp)
        infill: 填充率百分比（默认15%）
        layer_height: 层高 mm（默认0.20mm）
        timeout_seconds: 超时秒数
        
    Returns: dict or None
    """
    if not os.path.exists(BAMBU_STUDIO_PATH):
        print("[BambuStudio] 未找到可执行文件，跳过切片")
        return None
    if not os.path.exists(file_path):
        print(f"[BambuStudio] 模型文件不存在: {file_path}")
        return None

    # === STL/OBJ/STEP 转 3MF ===
    # BambuStudio CLI 不支持直接切片非 3MF 格式
    ext = os.path.splitext(file_path)[1].lower()
    source_for_slice = file_path
    need_cleanup = False
    
    if ext in ('.stl', '.obj', '.step', '.stp'):
        print(f"[BambuStudio] 检测到 {ext} 格式，包装进 Bambu 3MF 模板后切片...")
        temp_3mf = _wrap_in_bambu_3mf(file_path)
        if temp_3mf:
            source_for_slice = temp_3mf
            need_cleanup = True
            print(f"[BambuStudio] 包装成功: {temp_3mf}")
        else:
            print("[BambuStudio] 包装失败，BambuStudio 无法切片此文件")
            return None

    tmp_dir = tempfile.mkdtemp(prefix="bambu_slice_")

    try:
        # 获取模型基本信息（体积）
        info_result = get_bambu_info(source_for_slice)

        # 构造切片命令
        cmd = [
            BAMBU_STUDIO_PATH,
            "--slice", "1",
            "--outputdir", tmp_dir,
            source_for_slice,
        ]
        print(f"[BambuStudio] 开始切片: {os.path.basename(file_path)} "
              f"(材料={material}, 填充={infill}%, 层高={layer_height}mm)")

        result = subprocess.run(
            cmd,
            capture_output=True,
            timeout=timeout_seconds,
            cwd=os.path.dirname(BAMBU_STUDIO_PATH),
        )

        # 读取 result.json
        result_json_path = os.path.join(tmp_dir, "result.json")
        if not os.path.exists(result_json_path):
            stderr = _decode_output(result)
            stdout = _decode_output(result)
            print(f"[BambuStudio] 未找到 result.json")
            if stdout:
                print(f"  stdout: {stdout[:300]}")
            if stderr:
                print(f"  stderr: {stderr[:300]}")
            return None

        with open(result_json_path, "r", encoding="utf-8") as f:
            slice_data = json.load(f)

        # 提取重量信息
        sliced_plates = slice_data.get("sliced_plates", [])
        if not sliced_plates:
            print("[BambuStudio] 切片结果中无盘子数据")
            return None

        plate = sliced_plates[0]
        filaments = plate.get("filaments", [])
        if not filaments:
            print("[BambuStudio] 切片结果中无耗材数据")
            return None

        filament = filaments[0]
        weight_g = filament.get("total_used_g", 0)
        main_weight_g = filament.get("main_used_g", 0)
        filament_id = filament.get("filament_id", "")

        # 提取 objects 中的 bbox（用于尺寸展示）
        plate_objects = plate.get("objects", [])
        objects_data = []
        for obj in plate_objects:
            obj_out = {"name": obj.get("name", ""), "triangle_count": obj.get("triangle_count", 0)}
            bbox_raw = obj.get("bbox", {})
            if bbox_raw:
                obj_out["bbox"] = {
                    "width": bbox_raw.get("width", 0),
                    "depth": bbox_raw.get("depth", 0),
                    "height": bbox_raw.get("height", 0),
                }
            objects_data.append(obj_out)

        result_data = {
            "weight_g": round(weight_g, 2),
            "main_weight_g": round(main_weight_g, 2),
            "filament_id": filament_id,
            "infill": slice_data.get("sparse_infill_density", DEFAULT_INFILL),
            "layer_height": slice_data.get("layer_height", DEFAULT_LAYER_HEIGHT),
            "wall_loops": slice_data.get("wall_loops", 2),
            "sliced_time_ms": plate.get("sliced_time", 0),
            "prepare_time_ms": slice_data.get("prepare_time", 0),
            "total_predication_ms": plate.get("total_predication", 0),
            "feature_times": plate.get("feature_type_times", {}),
            "total_triangle_count": plate.get("triangle_count", 0),
            "objects_count": len(plate_objects),
            "original_volume_mm3": info_result.get("volume", 0) if info_result else 0,
            "objects": objects_data,
        }

        print(f"[BambuStudio] 切片完成: {os.path.basename(file_path)} -> {weight_g:.2f}g")
        return result_data

    except subprocess.TimeoutExpired:
        print(f"[BambuStudio] 切片超时 ({timeout_seconds}s): {file_path}")
        return None
    except subprocess.CalledProcessError as e:
        print(f"[BambuStudio] 切片失败: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"[BambuStudio] result.json 解析失败: {e}")
        return None
    except Exception as e:
        print(f"[BambuStudio] 未知错误: {type(e).__name__}: {e}")
        return None
    finally:
        try:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass
        if need_cleanup and os.path.exists(source_for_slice):
            try:
                os.remove(source_for_slice)
            except Exception:
                pass


def batch_slice_models(file_paths, material="pla", infill=DEFAULT_INFILL, layer_height=DEFAULT_LAYER_HEIGHT):
    """批量切片多个模型"""
    results = {}
    for fp in file_paths:
        results[fp] = slice_model(fp, material, infill, layer_height)
    return results
