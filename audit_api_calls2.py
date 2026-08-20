"""逐个文件提取所有apiClient调用"""
import re, os

files = [
    r'E:\3d\frontend\src\api\models.ts',
    r'E:\3d\frontend\src\api\auth.ts',
    r'E:\3d\frontend\src\api\orders.ts',
    r'E:\3d\frontend\src\api\cart.ts',
    r'E:\3d\frontend\src\api\addresses.ts',
    r'E:\3d\frontend\src\api\announcements.ts',
    r'E:\3d\frontend\src\api\discussions.ts',
    r'E:\3d\frontend\src\api\favorites.ts',
    r'E:\3d\frontend\src\api\help.ts',
    r'E:\3d\frontend\src\api\materials.ts',
    r'E:\3d\frontend\src\api\modelComments.ts',
    r'E:\3d\frontend\src\api\notifications.ts',
    r'E:\3d\frontend\src\api\reports.ts',
    r'E:\3d\frontend\src\api\wallet.ts',
]

for fp in files:
    fname = os.path.basename(fp)
    with open(fp, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    
    calls = []
    for i, line in enumerate(lines):
        line_stripped = line.strip()
        # 匹配 apiClient.get/post/put/delete(...)
        # 可能跨行，但先按行匹配
        if 'apiClient.' in line_stripped:
            calls.append((i+1, line_stripped[:120]))
    if calls:
        print(f'\n--- {fname} ({len(calls)} 处apiClient调用) ---')
        for ln, txt in calls:
            print(f'  L{ln}: {txt}')
