# -*- coding: utf-8 -*-
with open(r'E:\3d\frontend\src\pages\LoginPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Strategy: remove the card-base outer div, make its inner content children of max-w-md div
# This eliminates the problematic nesting

# Find the card-base div open + close and bottom link div
card_open = '<div className="card-base p-8">\n          {isForgot ? null : (      '
card_close = '        </div>\n\n        {/* \u5e95\u90e8\u94fe\u63a5 */}'
bottom_div_open = '<div className="text-center mt-6">'
bottom_div_close = '        </div>\n      </div>\n    </div>\n  </>\n  )'

idx_card_open = content.find(card_open)
idx_card_close = content.find(card_close)

print(f'card_open at {idx_card_open}')
print(f'card_close at {idx_card_close}')

# Replace card-base with just a wrapper
# card-base -> <>
new_open = '<>\n          {isForgot ? null : (      '
content = content.replace(card_open, new_open, 1)

# card_close (</div> + \n\n + comment) -> </> + \n\n + comment  
new_close = '        </>\n\n        {/* \u5e95\u90e8\u94fe\u63a5 */}'
content = content.replace(card_close, new_close, 1)

with open(r'E:\3d\frontend\src\pages\LoginPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done - replaced card-base with Fragment')
