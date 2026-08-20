with open(r'E:\3d\frontend\src\pages\LoginPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the extra > at L175
content = content.replace('card-base p-8\">>', 'card-base p-8\">')
content = content.replace('p-8\">\n', 'p-8\">\n')

with open(r'E:\3d\frontend\src\pages\LoginPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open(r'E:\3d\frontend\src\pages\LoginPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
print(f'L175: {lines[174][:80]}')
