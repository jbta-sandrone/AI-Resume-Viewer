import sys
print(len(open(sys.argv[1], 'r', encoding='utf-8').readlines()))
