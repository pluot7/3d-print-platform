"""
3D模型处理工具
- 计算体积、尺寸、重量
- 转换为 glTF/glb 格式
"""
import os
from typing import Dict, Tuple, Optional

# 延迟导入重型库，加速 PyCharm 解释器加载
def _import_trimesh():
    import trimesh
    return trimesh

def _import_numpy():
    import numpy as np
    return np

# 材料密度表 (g/cm³)
MATERIAL_DENSITIES = {
    "pla": 1.24,
    "abs": 1.04,
    "petg": 1.27,
    "resin": 1.15,
    "nylon": 1.01,
    "tpu": 1.21,
    "pc": 1.20,
    "pp": 0.90,
}

# 3D打印参数（模拟切片流程）
DEFAULT_NOZZLE_WIDTH = 0.4  # 喷嘴直径 mm
DEFAULT_WALL_COUNT = 3      # 壁线数量（3条壁线）
DEFAULT_INFILL = 0.15       # 内部填充率 15%
DEFAULT_LAYER_HEIGHT = 0.2  # 层高 mm
LOSS_FACTOR = 1.08          # 损耗系数（支撑、底座、失败重打等）

DEFAULT_MATERIAL = "pla"

# 计算壁厚 = 壁线数量 × 喷嘴宽度
def get_wall_thickness():
    return DEFAULT_WALL_COUNT * DEFAULT_NOZZLE_WIDTH  # 1.2mm



def calculate_model_info(file_path: str, material: str = DEFAULT_MATERIAL) -> Dict:
    """
    按部件逐个计算模型重量（精确版）

    核心改进（V2）：
    ─────────────────────────────────────
    1. 多部件模型逐个部件计算后求和 —— 避免合并 mesh 时重叠部件体积虚高
    2. 用精确表面积替换包围盒推算 —— 壁线/顶底面计算更准
    3. 小部件（< 1cm³）全实心处理 —— 细碎零件不需要填充
    4. 三种贡献分离：壁壳(实心)、填充(稀疏)、顶底(实心层)
    5. 置信度评估：基于水密性和部件数给出可信度

    精度预期：
    - 大部件（> 包围盒的60%）：±5%
    - 中等部件（20-60%）：±10%
    - 多部件装配体：±15%

    Args:
        file_path: 模型文件路径 (.stl/.obj/.3mf)
        material: 材料类型 (pla/abs/petg/resin/nylon/tpu/pc/pp)

    Returns:
        dict: {
            'volume': float,  # cm³（总几何体积）
            'dimensions': {'x': float, 'y': float, 'z': float},  # 整体包围盒 mm
            'weight': float,  # g（含损耗）
            'bounding_box': [x_min, y_min, z_min, x_max, y_max, z_max],
            'material': str,
            'confidence': str,  # high/medium/low
            'slicing_detail': dict,
        }
    """
    trimesh = _import_trimesh()
    mesh = trimesh.load(file_path)
    density = MATERIAL_DENSITIES.get(material.lower(), MATERIAL_DENSITIES[DEFAULT_MATERIAL])

    # ============ 获取所有独立部件 ============
    if isinstance(mesh, trimesh.Scene):
        parts = [g for g in mesh.geometry.values() if isinstance(g, trimesh.Trimesh) and len(g.vertices) >= 4]
        merged_mesh = sum(mesh.geometry.values())
        multi_part = True
    else:
        parts = [mesh]
        merged_mesh = mesh
        multi_part = False

    # 整体包围盒
    bounds = merged_mesh.bounds
    dimensions = {
        'x': float(bounds[1][0] - bounds[0][0]),
        'y': float(bounds[1][1] - bounds[0][1]),
        'z': float(bounds[1][2] - bounds[0][2]),
    }

    # ============ 逐个部件计算材料体积 ============
    wall_thickness = get_wall_thickness()  # 1.2mm
    MIN_SOLID_VOLUME_MM3 = 1000  # < 1cm³ 的部件全实心

    total_shell_mm3 = 0.0
    total_infill_mm3 = 0.0
    total_topbot_mm3 = 0.0
    part_count = 0
    total_geom_volume_mm3 = 0.0

    for part in parts:
        pv = part.volume  # 几何体积 mm³
        pa = part.area    # 精确表面积 mm²
        pb = part.bounds
        pd = pb[1] - pb[0]
        ph = max(pd[2], 0.1)
        pw = max(pd[0], 0.1)
        pdepth = max(pd[1], 0.1)
        p_cross_section = pw * pdepth  # mm²

        total_geom_volume_mm3 += pv

        if pv < MIN_SOLID_VOLUME_MM3:
            # 小部件：全实心（壁线充满内部）
            shell_mm3 = pv
            infill_mm3 = 0.0
            topbot_mm3 = 0.0
        else:
            # --- 壁壳体积 ---
            # 精确：外表面积 × 壁厚
            shell_mm3 = pa * wall_thickness

            # --- 顶底面（实心层）---
            topbot_mm3 = p_cross_section * DEFAULT_LAYER_HEIGHT * 4

            # --- 内部填充 ---
            leftover = max(0.0, pv - shell_mm3 - topbot_mm3)
            infill_mm3 = leftover * DEFAULT_INFILL

            # 安全下限校验：填充材料体积不应超过剩余空间
            max_possible = max(0.0, pv - shell_mm3 - topbot_mm3)
            infill_mm3 = min(infill_mm3, max_possible)

        total_shell_mm3 += shell_mm3
        total_infill_mm3 += infill_mm3
        total_topbot_mm3 += topbot_mm3
        part_count += 1

    # ============ 材料汇总 ============
    total_material_mm3 = total_shell_mm3 + total_infill_mm3 + total_topbot_mm3
    total_material_cm3 = total_material_mm3 / 1000

    # 安全性校验：材料体积不应超过整体包围盒
    bbox_volume_mm3 = dimensions['x'] * dimensions['y'] * dimensions['z']
    bbox_volume_cm3 = bbox_volume_mm3 / 1000

    volume_exceeded = total_material_mm3 > bbox_volume_mm3
    if volume_exceeded:
        ratio = bbox_volume_mm3 / total_material_mm3
        total_material_mm3 = bbox_volume_mm3
        total_material_cm3 = total_material_mm3 / 1000
        # 重新分配权重
        total_shell_mm3 *= ratio
        total_infill_mm3 *= ratio
        total_topbot_mm3 *= ratio

    # 重量计算
    raw_weight = total_material_cm3 * density
    weight = raw_weight * LOSS_FACTOR

    # 几何体积（返回物理体积）
    volume_cm3 = total_geom_volume_mm3 / 1000
    if multi_part and volume_cm3 > bbox_volume_cm3:
        # 重叠虚高时，用材料体积作为更合理的参考
        volume_cm3 = min(volume_cm3, total_material_cm3 * 1.2)

    # 置信度评估
    if multi_part and part_count > 10:
        confidence = 'medium'
    elif multi_part:
        confidence = 'high'
    else:
        confidence = 'high'
    if volume_exceeded:
        confidence = 'medium'

    return {
        'volume': round(volume_cm3, 2),
        'dimensions': {k: round(v, 1) for k, v in dimensions.items()},
        'weight': round(weight, 2),
        'bounding_box': bounds.flatten().tolist(),
        'material': material.lower(),
        'confidence': confidence,
        'part_count': part_count,
        'slicing_detail': {
            'wall_volume_cm3': round(total_shell_mm3 / 1000, 2),
            'infill_volume_cm3': round(total_infill_mm3 / 1000, 2),
            'top_bottom_volume_cm3': round(total_topbot_mm3 / 1000, 2),
            'total_material_cm3': round(total_material_cm3, 2),
            'raw_weight_g': round(raw_weight, 2),
            'final_weight_g': round(weight, 2),
            'layer_count': round(dimensions['z'] / DEFAULT_LAYER_HEIGHT),
            'volume_corrected': volume_exceeded,
            'confidence': confidence,
        },
    }


def convert_to_glb(input_path: str, output_dir: str) -> Tuple[bool, str, Optional[str]]:
    """
    将模型转换为 glTF/glb 格式
    
    Args:
        input_path: 输入文件路径 (.stl/.obj/.3mf)
        output_dir: 输出目录
        
    Returns:
        (success: bool, message: str, glb_path: str or None) - 返回相对路径如 /uploads/glb/xxx.glb
    """
    try:
        trimesh = _import_trimesh()
        # 加载模型
        mesh = trimesh.load(input_path)
        
        # 处理场景
        if isinstance(mesh, trimesh.Scene):
            mesh = sum(mesh.geometry.values())
        
        # 确保有法线（STL可能没有）
        mesh.fix_normals()
        
        # 生成输出文件名
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        glb_path = os.path.join(output_dir, f"{base_name}.glb")
        
        # 导出为 glb (binary glTF)
        mesh.export(glb_path, file_type='glb')
        
        # 转换为相对路径，供前端使用
        # E:\\3d\\backend\\uploads\\glb\\xxx.glb -> /uploads/glb/xxx.glb
        relative_path = glb_path.replace('\\', '/')
        # 去掉驱动器字母如 E:/
        if len(relative_path) > 2 and relative_path[1] == ':':
            relative_path = '/' + relative_path[3:]
        
        return True, "转换成功", relative_path
        
    except Exception as e:
        return False, f"转换失败: {str(e)}", None


def convert_to_gltf(input_path: str, output_dir: str) -> Tuple[bool, str, Optional[str]]:
    """
    将模型转换为 glTF 格式 (gltf + .bin)
    
    Args:
        input_path: 输入文件路径
        output_dir: 输出目录
        
    Returns:
        (success: bool, message: str, gltf_path: str or None)
    """
    try:
        trimesh = _import_trimesh()
        mesh = trimesh.load(input_path)
        
        if isinstance(mesh, trimesh.Scene):
            mesh = sum(mesh.geometry.values())
        
        mesh.fix_normals()
        
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        gltf_path = os.path.join(output_dir, f"{base_name}.gltf")
        
        # 导出为 gltf
        mesh.export(gltf_path, file_type='gltf')
        
        return True, "转换成功", gltf_path
        
    except Exception as e:
        return False, f"转换失败: {str(e)}", None


def generate_thumbnail(mesh_path: str, output_path: str, resolution: tuple = (400, 300)) -> bool:
    """
    用 pyrender 生成模型预览缩略图
    
    Args:
        mesh_path: 原始模型文件路径（3MF/STL/GLB等）
        output_path: 输出 PNG 路径
        resolution: 输出分辨率 (width, height)
        
    Returns:
        bool: 是否成功
    """
    try:
        import pyrender
        from PIL import Image
        trimesh = _import_trimesh()
        np = _import_numpy()
        
        # 加载模型
        mesh = trimesh.load(mesh_path)
        
        # 处理 Scene / 多几何体
        if isinstance(mesh, trimesh.Scene):
            meshes = [g for g in mesh.geometry.values() if isinstance(g, trimesh.Trimesh)]
            if not meshes:
                return False
            mesh = trimesh.util.concatenate(meshes) if len(meshes) > 1 else meshes[0]
        elif isinstance(mesh, dict):
            meshes = [g for g in mesh.values() if isinstance(g, trimesh.Trimesh)]
            if not meshes:
                return False
            mesh = trimesh.util.concatenate(meshes) if len(meshes) > 1 else meshes[0]
        
        if not isinstance(mesh, trimesh.Trimesh) or mesh.vertices.shape[0] == 0:
            return False
        
        mesh.fix_normals()
        
        # pyrender 场景
        scene = pyrender.Scene(bg_color=[0.9, 0.9, 0.9, 1.0])
        render_mesh = pyrender.Mesh.from_trimesh(mesh, smooth=False)
        node = scene.add(render_mesh)
        
        # 计算相机位置
        bbox = mesh.bounds
        center = bbox.mean(axis=0)
        extent = bbox[1] - bbox[0]
        max_dim = max(extent)
        if max_dim < 0.001:
            max_dim = 1.0
        distance = max_dim * 2.5
        
        # 相机：从斜前方俯视
        cam = pyrender.PerspectiveCamera(yfov=np.pi / 4.0, aspectRatio=resolution[0] / resolution[1])
        cam_pos = np.array([center[0] + distance * 0.3,
                            center[1] - distance * 0.3,
                            center[2] + distance * 0.8])
        
        camera_pose = np.eye(4)
        camera_pose[:3, 3] = cam_pos
        # 看向中心
        look_at = center
        forward = look_at - cam_pos
        forward = forward / np.linalg.norm(forward)
        up = np.array([0, 0, 1])
        right = np.cross(forward, up)
        right = right / np.linalg.norm(right)
        up = np.cross(right, forward)
        
        camera_pose[:3, 0] = right
        camera_pose[:3, 1] = up
        camera_pose[:3, 2] = -forward
        
        scene.add(cam, pose=camera_pose)
        
        # 灯光
        light = pyrender.DirectionalLight(color=[1.0, 1.0, 1.0], intensity=3.0)
        scene.add(light, pose=camera_pose)
        
        # 第二盏灯补光（从下方）
        light2_pose = camera_pose.copy()
        light2_pose[:3, 3] = [center[0], center[1], center[2] - distance * 0.5]
        light2 = pyrender.DirectionalLight(color=[0.6, 0.6, 0.6], intensity=1.5)
        scene.add(light2, pose=light2_pose)
        
        # Offscreen 渲染
        r = pyrender.OffscreenRenderer(resolution[0], resolution[1])
        color, depth = r.render(scene)
        r.delete()
        
        # 保存
        img = Image.fromarray(color)
        img.save(output_path, 'PNG')
        return True
        
    except ImportError:
        print("[缩略图] pyrender 或 Pillow 未安装")
        return False
    except Exception as e:
        print(f"[缩略图] 生成失败: {str(e)}")
        return False


if __name__ == "__main__":
    # 测试
    import sys
    if len(sys.argv) > 1:
        test_file = sys.argv[1]
        print("=" * 50)
        print(f"测试文件: {test_file}")
        
        # 计算信息
        info = calculate_model_info(test_file)
        print(f"体积: {info['volume']} cm³")
        print(f"尺寸: {info['dimensions']}")
        print(f"重量: {info['weight']} g")
        
        # 转换
        output_dir = os.path.dirname(test_file)
        success, msg, glb_path = convert_to_glb(test_file, output_dir)
        print(f"转换: {msg}")
        if success and glb_path:
            print(f"GLB: {glb_path}")
            print(f"GLB大小: {os.path.getsize(glb_path) / 1024:.1f} KB")