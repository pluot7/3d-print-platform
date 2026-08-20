import re, os

path = r'E:\3d\backend\app\api\auth.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 在 send_sms_code 之后、verify_sms_code 之前插入重置密码 API
# 定位点
insert_marker = 'phone_masked": phone[:3] + "****" + phone[-4:],\n    }'

new_api = '''
@router.post("/reset-password")
def reset_password(
    phone: str = Body(...),
    code: str = Body(...),
    new_password: str = Body(...),
    db: Session = Depends(get_db),
):
    """通过手机号+验证码重置密码（无需登录）"""
    # 验证码校验
    if not verify_sms_code(phone, code):
        raise HTTPException(status_code=400, detail="验证码错误或已过期")
    
    # 检查用户是否存在
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="该手机号未注册")
    
    # 更新密码
    user.hashed_password = get_password_hash(new_password)
    _verify_codes.pop(phone, None)
    db.commit()
    
    return {"message": "密码重置成功，请使用新密码登录"}


'''

# 在 insert_marker 后面的 } 之前插入
# 找到 marker 后面的完整代码块
content = content.replace(insert_marker, insert_marker + new_api)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("auth.py 已更新")
