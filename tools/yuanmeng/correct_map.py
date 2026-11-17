"""全量回读并按 placement 清单校正编辑器网格吸附误差。

  python correct_map.py            # 只审计, 写 import-audit.json
  python correct_map.py --apply    # 用 ugc_update_entity 校正 transform, 再回读确认
"""
import argparse
import json
import os
import time

from import_map import MCP, BASE, PROJECT, PROGRESS

AUDIT = os.path.join(BASE, 'import-audit.json')


def build_index():
    prog = json.load(open(PROGRESS, encoding='utf-8'))
    d = json.load(open(PROJECT, encoding='utf-8'))
    exp = [it for c in d['placement']['commands'] for it in c['arguments']['items']]
    ids = []
    for i in range(len(prog['done'])):
        rec = prog['done'][str(i)]
        seen, b = set(), []
        for s in rec['sceneIds']:
            if s not in seen:
                seen.add(s)
                b.append(s)
        ids.extend(b[:rec['items']])
    return ids, exp


def ang_diff(a, b):
    return abs((float(a) - float(b) + 180) % 360 - 180)


def diff_of(exp, got):
    e_t, g_t = exp['transform'], got.get('transform', {})
    e_loc, g_loc = e_t['location'], g_t.get('location', {})
    loc = {k: float(e_loc[k]) - float(g_loc.get(k, 0)) for k in ('x', 'y', 'z')}
    e_sc, g_sc = e_t.get('scale', {}), g_t.get('scale', {})
    sc = {k: float(e_sc[k]) - float(g_sc.get(k, 0)) for k in e_sc}
    e_rot, g_rot = e_t.get('rotation', {}), g_t.get('rotation', {})
    rot = {k: ang_diff(e_rot.get(k, 0), g_rot.get(k, 0)) for k in ('pitch', 'yaw', 'roll')}
    return loc, sc, rot


def needs_fix(loc, sc, rot):
    return (any(abs(v) > 0.01 for v in loc.values())
            or any(abs(v) > 0.01 for v in sc.values())
            or any(v > 0.01 for v in rot.values()))


def audit(mcp, ids, exp):
    records, missing = [], []
    t0 = time.time()
    for idx, sid in enumerate(ids):
        r = mcp.tool('ugc_get_entity', {'sceneId': sid})
        got = (r.get('data') or {}).get('data', {})
        if not r['ok'] or not got:
            missing.append(sid)
            continue
        loc, sc, rot = diff_of(exp[idx], got)
        if needs_fix(loc, sc, rot):
            records.append({
                'idx': idx, 'sceneId': sid,
                'typeId': exp[idx].get('typeId'),
                'deltaLocation': loc, 'deltaScale': sc, 'deltaRotation': rot,
                'expectedTransform': exp[idx]['transform'],
            })
        if (idx + 1) % 200 == 0:
            print('audited %d/%d  fixes=%d  %.0fs' % (
                idx + 1, len(ids), len(records), time.time() - t0))
    out = {'total': len(ids), 'missing': missing, 'fixes': records}
    with open(AUDIT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    maxloc = max((max(abs(v) for v in r['deltaLocation'].values()) for r in records), default=0)
    print('AUDIT total=%d fixes=%d missing=%d maxLocationDelta=%.2fcm elapsed=%.0fs' % (
        len(ids), len(records), len(missing), maxloc, time.time() - t0))
    return out


def apply(mcp, out, exp):
    fixes = out['fixes']
    print('applying %d transform corrections...' % len(fixes))
    ok = fail = 0
    for n, rec in enumerate(fixes, 1):
        r = mcp.tool('ugc_update_entity', {
            'sceneId': rec['sceneId'],
            'transform': rec['expectedTransform'],
        })
        if r['ok']:
            ok += 1
        else:
            fail += 1
            if fail <= 5:
                print('  FAIL', rec['sceneId'], (r.get('text') or '')[:200])
        if n % 100 == 0:
            print('  applied %d/%d ok=%d fail=%d' % (n, len(fixes), ok, fail))
    print('apply done ok=%d fail=%d' % (ok, fail))
    # 回读确认
    still = []
    for rec in fixes:
        r = mcp.tool('ugc_get_entity', {'sceneId': rec['sceneId']})
        got = (r.get('data') or {}).get('data', {})
        if not got:
            still.append(rec['sceneId']); continue
        loc, sc, rot = diff_of(exp[rec['idx']], got)
        if needs_fix(loc, sc, rot):
            still.append(rec['sceneId'])
    print('readback: still off = %d / %d' % (len(still), len(fixes)))
    if still:
        print('  examples:', still[:15])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()
    ids, exp = build_index()
    print('sceneIds=%d expected=%d' % (len(ids), len(exp)))
    mcp = MCP()
    if args.apply:
        out = json.load(open(AUDIT, encoding='utf-8'))
        apply(mcp, out, exp)
    else:
        audit(mcp, ids, exp)


if __name__ == '__main__':
    main()
