import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'E:\3d\frontend\src\pages\LoginPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old1 = '            ) : (\n              <>\n                <div className="flex items-center gap-2 mb-2">'
new1 = '            ) : (\n              <div>\n                <div className="flex items-center gap-2 mb-2">'

if old1 in content:
    content = content.replace(old1, new1, 1)
    print('1. <> -> <div> opening')
else:
    print('1. NOT FOUND')

old2 = '              </>\n            })}'
new2 = '              </div>\n            })}'

if old2 in content:
    content = content.replace(old2, new2, 1)
    print('2a. try exact match')
else:
    print('2a. NOT FOUND')
    # try without ) afterwards
    old3 = '              </>\n            })'
    new3 = '              </div>\n            })'
    if old3 in content:
        content = content.replace(old3, new3, 1)
        print('2b. </> -> </div> closing')
    else:
        print('2b. NOT FOUND')

with open(r'E:\3d\frontend\src\pages\LoginPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
