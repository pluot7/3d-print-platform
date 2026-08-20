import pymysql

conn = pymysql.connect(host='localhost', user='root', password='root', database='3dprint')
cur = conn.cursor()

# 迁移已有数据：大写 → 小写
cur.execute("UPDATE users SET role='user' WHERE role='USER'")
print(f'USER→user: {cur.rowcount} rows')

cur.execute("UPDATE users SET role='admin' WHERE role='ADMIN'")
print(f'ADMIN→admin: {cur.rowcount} rows')

# 删除之前创建失败的超级管理员（可能残留 with role=USER or 空）
cur.execute("DELETE FROM users WHERE phone='adminboss'")
print(f'Deleted stale adminboss: {cur.rowcount} rows')

conn.commit()
conn.close()
print('Migration done')
