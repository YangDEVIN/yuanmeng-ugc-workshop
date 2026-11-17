"""按工程文件里的 placement.commands 分批导入元梦地图。

用法:
  python import_map.py --start 0 --end 1      # 试跑第 1 批(索引 0)
  python import_map.py --resume              # 从进度文件继续剩余批次
  python import_map.py --save                # 保存地图
  python import_map.py --verify              # 回读场景概况

凭据只在本机读取, 不打印、不写入日志。
"""
import argparse
import json
import os
import urllib.error
import urllib.request
import time

BASE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.join(BASE, 'midnight-roll-call-map-project.json')
PROGRESS = os.path.join(BASE, 'import-progress.json')
CFG = os.path.join(
    os.environ.get('LOCALAPPDATA', os.path.expanduser('~/AppData/Local')),
    'Yuanmeng', 'DesktopService', 'ai-connection.json',
)


class MCP:
    def __init__(self):
        cfg = json.load(open(CFG, encoding='utf-8'))
        self.url = cfg['url']
        self.headers = dict(cfg['headers'])
        self.rid = 0
        self.session = None
        self._rpc('initialize', {
            'protocolVersion': '2025-03-26',
            'capabilities': {},
            'clientInfo': {'name': 'map-importer', 'version': '1.0'},
        })
        self._rpc('notifications/initialized', notify=True)

    def _rpc(self, method, params=None, notify=False, timeout=90):
        body = {'jsonrpc': '2.0', 'method': method}
        if params is not None:
            body['params'] = params
        if not notify:
            self.rid += 1
            body['id'] = self.rid
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            **self.headers,
        }
        if self.session:
            headers['Mcp-Session-Id'] = self.session
        req = urllib.request.Request(
            self.url, data=json.dumps(body, ensure_ascii=False).encode('utf-8'),
            headers=headers, method='POST',
        )
        with urllib.request.urlopen(req, timeout=timeout) as r:
            sid = r.headers.get('Mcp-Session-Id')
            if sid:
                self.session = sid
            raw = r.read().decode('utf-8', 'replace')
            ctype = r.headers.get('Content-Type', '')
        if notify or not raw.strip():
            return {}
        if 'text/event-stream' in ctype or raw.lstrip().startswith(('event:', 'data:')):
            for line in raw.splitlines():
                if line.startswith('data:'):
                    return json.loads(line[5:].strip())
        return json.loads(raw)

    def tool(self, name, arguments):
        resp = self._rpc('tools/call', {'name': name, 'arguments': arguments})
        if 'error' in resp:
            return {'ok': False, 'error': resp['error']}
        result = resp.get('result', {})
        text = '\n'.join(
            c.get('text', '') for c in result.get('content', [])
            if c.get('type') == 'text'
        )
        parsed = None
        try:
            parsed = json.loads(text)
        except Exception:
            pass
        return {
            'ok': not result.get('isError', False),
            'text': text,
            'data': parsed,
        }


def load_progress():
    if os.path.exists(PROGRESS):
        return json.load(open(PROGRESS, encoding='utf-8'))
    return {'done': {}, 'saved': False}


def save_progress(p):
    with open(PROGRESS, 'w', encoding='utf-8') as f:
        json.dump(p, f, ensure_ascii=False, indent=2)


def extract_ids(data):
    if not isinstance(data, dict):
        return []
    found = []
    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in ('sceneId', 'sceneIds'):
                    if isinstance(v, list):
                        found.extend(str(x) for x in v)
                    elif v is not None:
                        found.append(str(v))
                else:
                    walk(v)
        elif isinstance(o, list):
            for x in o:
                walk(x)
    walk(data)
    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--start', type=int, default=0)
    ap.add_argument('--end', type=int, default=1)
    ap.add_argument('--resume', action='store_true')
    ap.add_argument('--save', action='store_true')
    ap.add_argument('--verify', action='store_true')
    args = ap.parse_args()

    project = json.load(open(PROJECT, encoding='utf-8'))
    cmds = project['placement']['commands']
    prog = load_progress()
    mcp = MCP()

    if args.verify:
        r = mcp.tool('ugc_get_context', {'detail': 'brief'})
        print('verify ok:', r['ok'])
        print((r['text'] or '')[:900])
        return

    if args.save:
        r = mcp.tool('ugc_editor_save', {})
        print('save ok:', r['ok'])
        print((r['text'] or '')[:900])
        if r['ok']:
            prog['saved'] = True
            save_progress(prog)
        return

    start, end = args.start, min(args.end, len(cmds))
    if args.resume:
        start = max(int(k) for k in prog['done']) + 1 if prog['done'] else 0
        end = len(cmds)
    print('batches: %d -> %d (of %d)' % (start, end, len(cmds)))

    for i in range(start, end):
        if str(i) in prog['done']:
            print('skip %d (already done)' % i)
            continue
        items = cmds[i]['arguments']['items']
        t0 = time.time()
        try:
            r = mcp.tool('ugc_create_entity', {'items': items})
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            print('STOP at batch %d: transport error %s' % (i, e))
            save_progress(prog)
            raise SystemExit(1)
        ids = extract_ids(r.get('data'))
        prog['done'][str(i)] = {
            'items': len(items),
            'ok': r['ok'],
            'sceneIds': ids,
            'elapsedSec': round(time.time() - t0, 2),
        }
        save_progress(prog)
        if not r['ok']:
            print('STOP at batch %d: tool error' % i)
            print((r.get('text') or str(r.get('error')))[:1200])
            raise SystemExit(1)
        print('batch %02d/%02d  items=%2d  ids=%2d  %.1fs' % (
            i + 1, len(cmds), len(items), len(ids), time.time() - t0,
        ))
        if i == start and end - start == 1:
            print('--- first batch raw reply (truncated) ---')
            print((r.get('text') or '')[:1500])

    total = sum(v['items'] for v in prog['done'].values())
    print('DONE batches=%d items=%d saved=%s' % (len(prog['done']), total, prog['saved']))


if __name__ == '__main__':
    main()
