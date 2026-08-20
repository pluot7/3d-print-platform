with open(r'E:\3d\frontend\src\pages\LoginPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('        <>')
if idx >= 0:
    content = content[:idx] + '        <div className="card-base p-8">' + content[idx+9:]
    print('Replaced <> with div')
else:
    print('Not found')

print(f'<> count: {content.count("<>")}')
print(f'</> count: {content.count("</>")}')

with open(r'E:\3d\frontend\src\pages\LoginPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Saved')
