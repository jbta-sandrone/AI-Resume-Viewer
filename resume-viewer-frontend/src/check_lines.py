import sys
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i in range(int(sys.argv[2])-1, int(sys.argv[3])):
        print(f'{i+1}: {repr(lines[i])}')
