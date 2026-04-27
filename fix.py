import os
import glob

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We need to replace \${ with ${ and \` with `
    # But only if it's literally backslash followed by the character.
    # Actually, in TS/TSX, escaped backticks and dollar signs are rare except when we actually want to render them,
    # but the AI systematically escaped ALL of them incorrectly.
    new_content = content.replace('\\${', '${').replace('\\`', '`')

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

# Gather all .ts and .tsx files in app, components, lib
search_paths = [
    'app/**/*.ts', 'app/**/*.tsx',
    'components/**/*.ts', 'components/**/*.tsx',
    'lib/**/*.ts', 'lib/**/*.tsx'
]

for pattern in search_paths:
    for filepath in glob.glob(pattern, recursive=True):
        fix_file(filepath)
