import os

path = r'E:\3d\backend\app\api\auth.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 替换 login 函数内部所有 request.xxx 为 login_req.xxx
# 但仅在 def login 函数范围内
old = 'def login(login_req: LoginRequest, request: Request, db: Session = Depends(get_db)):'

# 找到 login 函数体，替换内部的 request.phone, request.password 等
# request. 可能出现在不同地方，但都是 login_req 的属性
replacements = [
    ('filter(User.phone == request.phone)', 'filter(User.phone == login_req.phone)'),
    ('request.password, user.hashed_password', 'login_req.password, user.hashed_password'),
]

for old_text, new_text in replacements:
    if old_text in content:
        content = content.replace(old_text, new_text)
        print(f'替换: {old_text[:60]}')
    else:
        print(f'未找到: {old_text[:60]}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
    
print('完成')
