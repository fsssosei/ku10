from os import chdir
from pathlib import Path
import re

action_dict = {'100': 'TALK', '201': 'LOAD', '202': 'MOVE', '203': 'BACK', '204': 'NEXT', '205': 'FIRST', '206': 'LAST', '207': 'CLEAR', '208': 'GOTO', '212': 'MARK', '300': 'RESET', '306': 'CREDIT', '316': 'CHECKRESULT'}
table = str.maketrans('ABCDEFGHIJKLMNO', '123456789abcdef')

work_dir = input('请输入教学录像文件的目录：')
chdir(work_dir)

for zjr_file_path in Path('.').glob('*.zjr'):
    print(zjr_file_path.name)
    with open(Path(zjr_file_path.parent, 'json', zjr_file_path.stem+'.json'), 'w', encoding = 'utf8') as json_file:
        print('[', file = json_file)
        with open(zjr_file_path, encoding = 'gb18030') as zjr_file:
            line_list = zjr_file.readlines()
        new_line_list = []
        for line in line_list:
            if re.match('<.{8}>\[[0-9]{3}\]', line) is None:
                new_line_list[-1] = new_line_list[-1] + line
            else:
                new_line_list.append(line)
        for line in new_line_list:
            print('    {', file = json_file)
            time, lable = re.match('<(.+?)>\[(.+?)\]', line).groups()
            h, m , s = time.split(':')
            time_int = int(h)*3600 + int(m)*60 + int(s)
            action = action_dict[lable]
            print(f'        "action": "{action}",', file = json_file)
            print(f'        "time_int": {time_int},', file = json_file)
            if action == 'RESET':
                num, content = re.match('<.+?>\[.+?\]([0-9]{6})(.*)', line.rstrip('\r\n')).groups()
                print(f'        "user": "",', file = json_file)
                print(f'        "content": "ZJ{num}{content}"', file = json_file)
                num = int(num[:3])
                if num == 0:
                    if content != '':
                        print('    },', file = json_file)
                        print('    {', file = json_file)
                        print(f'        "action": "MARK",', file = json_file)
                        print(f'        "time_int": {time_int},', file = json_file)
                        print(f'        "user": "",', file = json_file)
                        mark_content = "".join([content[i+3:i+4].translate(table)+content[i+4:i+5].translate(table)+content[i+5:i+6] for i in range(0, len(content), 6)])
                        print(f'        "content": "ZJ{mark_content}"', file = json_file)
                else:
                    print('    },', file = json_file)
                    print('    {', file = json_file)
                    print(f'        "action": "LOAD",', file = json_file)
                    print(f'        "time_int": {time_int},', file = json_file)
                    print(f'        "user": "",', file = json_file)
                    move_content = content[:num*3]
                    mark_content = content[num*3:]
                    move_content = "".join([move_content[i:i+1]+move_content[i+1:i+2].translate(table)+move_content[i+2:i+3].translate(table) for i in range(0, len(move_content), 3)])
                    print(f'        "content": "ZJ{move_content}"', file = json_file)
                    if mark_content != "":
                        print('    },', file = json_file)
                        print('    {', file = json_file)
                        print(f'        "action": "MARK",', file = json_file)
                        print(f'        "time_int": {time_int},', file = json_file)
                        print(f'        "user": "",', file = json_file)
                        mark_content = "".join([mark_content[i+3:i+4].translate(table)+mark_content[i+4:i+5].translate(table)+mark_content[i+5:i+6] for i in range(0, len(mark_content), 6)])
                        print(f'        "content": "ZJ{mark_content}"', file = json_file)
            elif action == 'LOAD':
                user, content = re.match('<.+?>\[.+?\]00\{(.+?)\}\(.+?\)(.*)', line.rstrip('\r\n')).groups()
                move_content = content[3:]
                move_content = "".join([move_content[i:i+1]+move_content[i+1:i+2].translate(table)+move_content[i+2:i+3].translate(table) for i in range(0, len(move_content), 3)])
                print(f'        "user": "{user}",', file = json_file)
                print(f'        "content": "ZJ{move_content}"', file = json_file)
            elif action == 'MARK':
                coord, mark, user = re.match('<.+?>\[.+?\]00...(..)(.)\{(.+?)\}', line).groups()
                print(f'        "user": "{user}",', file = json_file)
                print(f'        "content": "ZJ{coord[0].translate(table)}{coord[1].translate(table)}{mark}"', file = json_file)
            elif action == 'MOVE':
                colour, coord, user = re.match('<.+?>\[.+?\]00([01])(..)\{(.+?)\}', line).groups()
                print(f'        "user": "{user}",', file = json_file)
                print(f'        "content": "ZJ{colour}{coord[0].translate(table)}{coord[1].translate(table)}"', file = json_file)
            elif action in ('CLEAR', 'BACK', 'NEXT', 'FIRST', 'LAST'):
                user = re.match('<.+?>\[.+?\]00\{(.+?)\}', line).group(1)
                print(f'        "user": "{user}",', file = json_file)
                print(f'        "content": ""', file = json_file)
            elif action == 'GOTO':
                num, user = re.match('<.+?>\[.+?\]00(...)\{(.+?)\}', line).groups()
                print(f'        "user": "{user}",', file = json_file)
                print(f'        "content": {int(num)}', file = json_file)
            elif action == 'TALK':
                user, content = re.match('<.+?>\[.+?\]00\{(.+?)\}\(.+?\)<.+?>(.*)', line.rstrip('\r\n')).groups()
                content = content.replace('\\', '\\\\ ').replace('"', '\\"').replace('/', '\\/')
                print(f'        "user": "{user}",', file = json_file)
                print(f'        "content": "{content}"', file = json_file)
            elif action in ('CREDIT', 'CHECKRESULT'):
                content = re.match('<.+?>\[.+?\](.*)', line.rstrip('\r\n')).group(1)
                print(f'        "user": "",', file = json_file)
                print(f'        "content": "{content}"', file = json_file)
            if action == 'CREDIT':
                print('    }', file = json_file)
            else:
                print('    },', file = json_file)
        print(']', file = json_file)
