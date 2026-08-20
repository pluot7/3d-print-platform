import os, sys, re

sys.path.insert(0, r'E:\3d\backend')
os.environ['USE_MYSQL'] = 'True'

# 导入所有 models 看结构
import app.models as M
from sqlalchemy import inspect

def describe_model(cls):
    mapper = inspect(cls)
    cols = []
    for c in mapper.columns:
        nullable = 'NULL' if c.nullable else 'NOT NULL'
        default = f' def={c.default.arg}' if c.default is not None else ''
        pk = ' PK' if c.primary_key else ''
        fk = f' FK>{c.foreign_keys}' if c.foreign_keys else ''
        cols.append(f'  {c.name:30s} {str(c.type):20s} {nullable:10s}{default}{pk}{fk}')
    return '\n'.join(cols)

models = [
    ('User', M.User),
    ('Model3D', M.Model3D),
    ('Order', M.Order),
    ('OrderItem', M.OrderItem),
    ('Address', M.Address),
    ('CartItem', M.CartItem),
    ('Discussion', M.Discussion),
    ('DiscussionReply', M.DiscussionReply),
    ('ModelComment', M.ModelComment),
    ('Announcement', M.Announcement),
    ('WalletTransaction', M.WalletTransaction),
    ('Report', M.Report),
    ('Notification', M.Notification),
    ('Follow', M.Follow),
    ('Activity', M.Activity),
    ('Conversation', M.Conversation),
    ('Message', M.Message),
    ('UserConversationStatus', M.UserConversationStatus),
    ('Material', M.Material),
    ('HelpArticle', M.HelpArticle),
    ('Favorite', M.Favorite),
]

for name, cls in models:
    print(f'\n{"=" * 60}')
    print(f'Model: {name}')
    print(f'{"=" * 60}')
    print(describe_model(cls))
