from os import chdir
from pathlib import Path
import re

table = str.maketrans('ABCDEFGHIJKLMNO', '123456789abcdef')

work_dir = input('请输入教学录像文件的目录：')
chdir(work_dir)

for orc_file_path in Path('.').glob('*.orc'):
    print(orc_file_path.name)
    with open(Path(orc_file_path.parent, 'json', orc_file_path.stem+'.json'), 'w', encoding = 'utf8') as json_file:
        print('[', file = json_file)
        with open(orc_file_path, encoding = 'gb18030') as orc_file:
            line_list = orc_file.readlines()
        new_line_list = []
        for line in line_list:
            if re.match('<[0-9]{2}:[0-9]{2}:[0-9]{2}>', line.rstrip('\r\n')) is None:  #合并被分成两行的长聊天行
                new_line_list[-1] = new_line_list[-1] + line
            else:
                new_line_list.append(line)
        prev_time_int = 0
        for line in new_line_list:
            print('    {', file = json_file)
            time, action = re.match('<(.+?)>\[(.+?)\]', line.rstrip('\r\n')).groups()
            h, m , s = time.split(':')
            time_int = int(h)*3600 + int(m)*60 + int(s)
            if time_int < prev_time_int:
                time_int += 60 * 60 * 24
                prev_time_int = time_int
            print(f'        "action": "{action}",', file = json_file)
            print(f'        "time_int": {time_int},', file = json_file)
            if action == 'RESET':
                num_a, num_b, content = re.match('<.+?>\[.+?\]([0-9]{3})([0-9]{3})(.*)', line.rstrip('\r\n')).groups()
                print(f'        "user": "",', file = json_file)
                print(f'        "content": "{num_a}{num_b}{content}"', file = json_file)
                print('    },', file = json_file)
                num = min(int(num_a), int(num_b))
                if num != 0:
                    print('    {', file = json_file)
                    print(f'        "action": "LOAD",', file = json_file)
                    print(f'        "time_int": {time_int},', file = json_file)
                    print(f'        "user": "",', file = json_file)
                    move_content = content[:num*2]
                    move_content = "".join([move_content[i:i+1].translate(table)+move_content[i+1:i+2].translate(table) for i in range(0, len(move_content), 2)])
                    print(f'        "content": "{move_content}"', file = json_file)
                    print('    },', file = json_file)
            elif action == 'LOAD':
                user, num_a, num_b, content = re.match('<.+?>\[.+?\]\{(.+?)\}([0-9]{3})([0-9]{3})(.*)', line.rstrip('\r\n')).groups()
                num = min(int(num_a), int(num_b))
                move_content = content[:num*2]
                move_content = "".join([move_content[i:i+1].translate(table)+move_content[i+1:i+2].translate(table) for i in range(0, len(move_content), 2)])
                print(f'        "user": "{user}",', file = json_file)
                print(f'        "content": "{move_content}"', file = json_file)
                print('    },', file = json_file)
            elif action == 'MOVE':
                user, content = re.match('<.+?>\[.+?\]\{(.+?)\}(.*)', line.rstrip('\r\n')).groups()
                coord = content[0].translate(table) + content[1].translate(table)
                print(f'        "user": "{user}",', file = json_file)
                print(f'        "content": "{coord}"', file = json_file)
                print('    },', file = json_file)
            elif action in ('CLEAR', 'BACK', 'NEXT', 'FIRST', 'LAST'):
                user = re.match('<.+?>\[.+?\]\{(.+?)\}', line.rstrip('\r\n')).group(1)
                print(f'        "user": "{user}",', file = json_file)
                print(f'        "content": ""', file = json_file)
                print('    },', file = json_file)
            elif action == 'GOTO':
                user, num = re.match('<.+?>\[.+?\]\{(.+?)\}(.*)', line.rstrip('\r\n')).groups()
                print(f'        "user": "{user}",', file = json_file)
                print(f'        "content": {int(num)}', file = json_file)
                print('    },', file = json_file)
            elif action in ('TALK', 'EMOTE'):
                user, content = re.match('<.+?>\[.+?\]\{(.+?)\}(.*)', line.rstrip('\r\n')).groups()
                print(f'        "user": "{user}",', file = json_file)
                print(f'        "content": "{content}"', file = json_file)
                print('    },', file = json_file)
            elif action in ('CREDIT', 'CHECKRESULT'):
                content = re.match('<.+?>\[.+?\](.*)', line.rstrip('\r\n')).group(1)
                print(f'        "user": "",', file = json_file)
                print(f'        "content": "{content}"', file = json_file)
                if action == 'CHECKRESULT':
                    print('    },', file = json_file)
                else:
                    print('    }', file = json_file)
        print(']', file = json_file)
