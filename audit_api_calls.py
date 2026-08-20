"""完整分析 - 修正正则"""
import re, os

targets = [
    r'E:\3d\frontend\src\api',
    r'E:\3d\frontend\src\pages',
    r'E:\3d\frontend\src\components',
]

all_apis = {}

for d in targets:
    for fname in sorted(os.listdir(d)):
        if not fname.endswith(('.ts', '.tsx')):
            continue
        fp = os.path.join(d, fname)
        with open(fp, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        # 匹配 apiClient.get(`...`) 或 apiClient.get('...')
        # 反向引用的难点在模板字符串，需要分别匹配
        patterns = [
            r"apiClient\.(get|post|put|delete)\(`([^`]*)`",
            r"apiClient\.(get|post|put|delete)\('([^']*)'",
        ]
        for pat in patterns:
            for m in re.finditer(pat, content):
                method, path = m.groups()
                key = f'{method.upper()} {path}'
                if key not in all_apis:
                    all_apis[key] = []
                all_apis[key].append(f'{os.path.basename(d)}/{fname}')

print(f'共 {len(all_apis)} 个API调用\n')
for k in sorted(all_apis.keys()):
    print(f'{k:55s} <- {", ".join(all_apis[k])}')
