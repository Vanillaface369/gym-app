import json, sys
d=json.load(open('trace.json'))
LABELS = {
 'front': {
  'calves': [0,1,2,3], 'quads': [4,5,6,7,10,11], 'adductors': [8,9], 'abductors': [12,13],
  'abs': [14,15,22,23,28,29,30,31], 'obliques': [16,17,18,19,26,27], 'forearms': [20,21,24,25],
  'lats': [32,33], 'biceps': [34,35], 'chest': [36,37], 'front_delts,side_delts': [38,39], 'traps': [40,41,42],
 },
 'back': {
  'calves': [0,1,2,3,4,5], 'hamstrings': [6,7,10,11], 'adductors': [8,9], 'abductors': [12,13,14,15],
  'glutes': [16,17], 'obliques': [18,19], 'lower_back': [20,21], 'forearms': [22,23,24,25],
  'triceps': [26,27,30,31], 'lats': [28,29], 'upper_back': [32,33], 'rear_delts,side_delts': [34,35],
  'traps,upper_back': [36,37],
 },
}
def path(pts): return 'M' + ' '.join(f'{x:g},{y:g}' for x,y in pts) + 'Z'
out=['// Body map shapes traced from reference screenshots the user supplied (permission for personal use, per the user).',
     '// Generated: coordinates are pixels in the 891x2000 source images. Regenerate rather than hand-edit.',
     "import type { Muscle } from '../../db/types';",'',
     'export interface Region { muscles: Muscle[]; d: string }',
     'export interface Figure { body: string; regions: Region[] }','']
allx=[];ally=[]
for side in ['front','back']:
    used=set()
    regs=[]
    for key,idx in LABELS[side].items():
        used.update(idx)
        regs.append((key.split(','), ''.join(path(d[side]['muscles'][i]['pts']) for i in idx)))
    missing=set(range(len(d[side]['muscles'])))-used
    assert not missing, (side, missing)
    body=''.join(path(p) for p in d[side]['body'])
    for p in d[side]['body']:
        allx+= [x for x,_ in p]; ally+=[y for _,y in p]
    out.append(f'export const {side.upper()}: Figure = {{')
    out.append(f"  body: '{body}',")
    out.append('  regions: [')
    for ms,dd in regs:
        out.append(f"    {{ muscles: {json.dumps(ms)}, d: '{dd}' }},")
    out.append('  ],')
    out.append('};')
    out.append('')
pad=6
out.append(f"export const VIEWBOX = '{min(allx)-pad:g} {min(ally)-pad:g} {max(allx)-min(allx)+2*pad:g} {max(ally)-min(ally)+2*pad:g}';")
open(sys.argv[1],'w',encoding='utf-8').write('\n'.join(out)+'\n')
print('ok', min(allx),min(ally),max(allx),max(ally))
