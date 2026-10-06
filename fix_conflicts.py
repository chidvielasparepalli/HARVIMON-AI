import os

def fix_conflicts(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    new_lines = []
    in_head = False
    in_other = False
    modified = False
    
    for line in lines:
        if line.startswith('<<<<<<< HEAD'):
            in_head = True
            modified = True
        elif line.startswith('======='):
            in_head = False
            in_other = True
        elif line.startswith('>>>>>>> '):
            in_other = False
        else:
            if in_head:
                new_lines.append(line)
            elif not in_other:
                new_lines.append(line)
                
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print(f"Fixed {filepath}")

for root, _, files in os.walk('frontend/src'):
    for file in files:
        fix_conflicts(os.path.join(root, file))
