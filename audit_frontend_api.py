"""前端API审计脚本"""
import os, sys
sys.path.insert(0, r'E:\3d\backend')
os.environ['USE_MYSQL'] = 'True'

import importlib.util
import re

# 遍历所有前端 API 文件
api_dir = r'E:\3d\frontend\src\api'
endpoints = {}

for fname in sorted(os.listdir(api_dir)):
    if not fname.endswith('.ts'):
        continue
    fpath = os.path.join(api_dir, fname)
    with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    # 提取 export const 函数 + 它们调用的 API 路径
    exports = re.findall(r'export const (\w+) = .*?[\"\']([^\"\']*?)(/[\w\-{}]+)+[\"\']', content)
    for func_name, base, path in exports:
        full_path = base + path
        if func_name not in endpoints:
            endpoints[func_name] = {'file': fname, 'paths': []}
        endpoints[func_name]['paths'].append(full_path)

print(f'--- 前端API ({len(endpoints)} 个端点) ---')
for func, info in sorted(endpoints.items()):
    print(f'{func:35s} [{info["file"]}]  {", ".join(info["paths"])}')
