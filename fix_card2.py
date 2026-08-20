# -*- coding: utf-8 -*-
with open(r'E:\3d\frontend\src\pages\LoginPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Replace </> (card-base fragment) + bottom link with card-base div wrapping everything
idx = content.find('</form>\n        </>\n\n        {/* \u5e95\u90e8\u94fe\u63a5 */}\n        <div className="text-center mt-6">')
if idx >= 0:
    print(f'Found pattern at {idx}')
    new_block = '</form>\n        </div>\n        <div className="text-center mt-6">'
    content = content[:idx] + new_block + content[idx + len('</form>\n        </>\n\n        {/* \u5e95\u90e8\u94fe\u63a5 */}\n        <div className="text-center mt-6">'):]
    print('Replaced Fragment + bottom link')
else:
    print('Pattern 1 NOT FOUND')
    # Try with different encoding for Chinese
    idx2 = content.find('</form>\n        </>\n\n       ')
    if idx2 >= 0:
        print(f'Found partial pattern at {idx2}')
        print(repr(content[idx2:idx2+80]))

# Step 2: Fix the <> opening - change from <> to <div className="card-base p-8">
content = content.replace(
    '        {/* \u767b\u5f55\u5361\u7247 */}\n        <>',
    '        {/* \u767b\u5f55\u5361\u7247 */}\n        <div className="card-base p-8">',
    1
)

# Step 3: Close card-base div at the end - just before the closing </div> of max-w-md
# The structure should be:
#   </form>
#   </div>         <- card-base close (NEW)
#   <div className="text-center mt-6">
#     ...
#   </div>         <- bottom link close
#   </div>         <- max-w-md close (was here)
# We need card-base close before bottom link. But actually, 
# After step 1, bottom link is no longer a sibling of card-base Fragment.
# Let me check: after replacement, the structure is:
#   </form>
#   </div>         <- card-base close (this was the lost </> replaced)
#   <div className="text-center mt-6">
#     ...
#   </div>         <- bottom link close
#   </div>         <- max-w-md close
#   </div>         <- outer min-h-screen close
# Wait, but the card-base open was replaced by <> earlier. 
# After Step 2, it's back to <div className="card-base p-8">
# And after Step 1, the card-base close </> was replaced by </div>
# So the structure should be correct!

with open(r'E:\3d\frontend\src\pages\LoginPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('File saved')
