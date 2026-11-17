"""按 placement.verification 要求回读校验：sceneId -> location/rotation/scale/color。

用法: python verify_map.py [--samples 16]
"""
import argparse
import json
import os

from import_map import MCP, BASE, PROJECT, PROGRESS


def flat_expected():
    d = json.load(open(PROJECT, encoding='utf-8'))
    return [it for c in d['placement']['commands'] for it in c['arguments']['items']]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--samples', type=int, default=16)
    args = ap.parse_args()

    prog = json.load(open(PROGRESS, encoding='utf-8'))
    expected = flat_expected()

    # 依批次顺序展开 sceneId（每批回执里 sceneId 出现两次，按 items 数取前 N 个去重）
    ids = []
    for i in range(len(prog['done'])):
        rec = prog['done'].get(str(i))
        if not rec:
            break
        seen, batch_ids = set(), []
        for sid in rec['sceneIds']:
            if sid not in seen:
                seen.add(sid)
                batch_ids.append(sid)
        ids.extend(batch_ids[:rec['items']])
    print('recorded sceneIds: %d / expected items: %d' % (len(ids), len(expected)))

    # 抽样：覆盖不同 typeId、非零 yaw、有颜色的方块、以及首尾
    picks = set()
    for idx in [0, 1, len(ids) // 2, len(ids) - 2, len(ids) - 1]:
        if 0 <= idx < len(ids):
            picks.add(idx)
    seen_types, seen_yaw = set(), False
    for idx, it in enumerate(expected[:len(ids)]):
        t = it.get('typeId')
        if t not in seen_types:
            seen_types.add(t); picks.add(idx)
        if not seen_yaw and (it['transform'].get('rotation') or {}).get('yaw', 0):
            seen_yaw = True; picks.add(idx)
        if len(picks) >= args.samples:
            break
    picks = sorted(picks)[:args.samples]

    mcp = MCP()
    passed, failed = 0, []
    for idx in picks:
        sid = ids[idx]
        exp = expected[idx]
        r = mcp.tool('ugc_get_entity', {'sceneId': sid})
        data = (r.get('data') or {}).get('data', {})
        if not r['ok'] or not data:
            failed.append((sid, 'read failed: ' + (r.get('text') or '')[:120]))
            continue
        got_t = data.get('transform', {})
        e_t = exp['transform']
        e_loc, g_loc = e_t['location'], got_t.get('location', {})
        loc_ok = all(abs(float(g_loc.get(k, 1e9)) - float(e_loc[k])) < 0.01 for k in ('x', 'y', 'z'))
        e_sc, g_sc = e_t.get('scale', {}), got_t.get('scale', {})
        scale_ok = all(abs(float(g_sc.get(k, -1)) - float(e_sc[k])) < 0.01 for k in e_sc)
        e_rot = e_t.get('rotation', {})
        g_rot = got_t.get('rotation', {})
        rot_ok = all(abs(float(g_rot.get(k, 1e9)) - float(e_rot.get(k, 0))) < 0.01 for k in ('pitch', 'yaw', 'roll'))
        e_col = exp.get('color')
        colors = ((data.get('nativeDetails') or {}).get('colors') or [])
        if e_col:
            col_ok = any(
                all(int(c.get(k, -1)) == int(e_col[k]) for k in ('r', 'g', 'b'))
                for c in colors
            )
        else:
            col_ok = True
        type_ok = str(data.get('typeId')) == str(exp.get('typeId'))
        ok = loc_ok and scale_ok and rot_ok and col_ok and type_ok
        if ok:
            passed += 1
        else:
            failed.append((sid, {
                'typeId': type_ok, 'location': loc_ok, 'rotation': rot_ok,
                'scale': scale_ok, 'color': col_ok,
                'expectedColor': e_col, 'gotColors': colors,
            }))
        print('sceneId %-6s type=%-16s  %s' % (
            sid, str(exp.get('typeId')), 'OK' if ok else 'FAIL',
        ))

    print('\npassed %d / %d' % (passed, len(picks)))
    if failed:
        for sid, detail in failed:
            print('  FAIL', sid, detail)
    else:
        print('all sampled entities match placement manifest')


if __name__ == '__main__':
    main()
