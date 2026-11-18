import bpy, numpy as np, json, os, math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parent.parent
out=root/'coconut'
out.mkdir(exist_ok=True)
dg=bpy.context.evaluated_depsgraph_get()
rng=np.random.default_rng(27183)
regions=[]
def material_color(mat):
    col=list(mat.diffuse_color[:3]) if mat else [.6,.65,.65]
    if mat and mat.use_nodes:
        node=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
        if node:col=node.inputs['Base Color'].default_value[:3]
    return np.array(col)
cache={}
def pixel_image(mat):
    if not mat or not mat.use_nodes:return None
    nodes=mat.node_tree.nodes
    bs=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
    if not bs:return None
    pending=[l.from_node for l in bs.inputs['Base Color'].links]
    seen=set()
    while pending:
        node=pending.pop(0)
        if node in seen:continue
        seen.add(node)
        if node.type=='TEX_IMAGE' and node.image:
            im=node.image
            if im.name not in cache and im.size[0] and im.size[1]:
                arr=np.empty(len(im.pixels),dtype=np.float32)
                im.pixels.foreach_get(arr)
                cache[im.name]=arr.reshape(im.size[1],im.size[0],-1)[::4,::4,:3].copy()
            return cache.get(im.name)
        pending.extend(l.from_node for sock in node.inputs for l in sock.links)
    return None
def building(name):
    return any(tag in name.lower() for tag in ('_house','_shop','_booth','_plank','_chenbao'))
from collections import defaultdict
# Cells on different storeys or materials never share a plate.
plate_cells=defaultdict(set)
def rasterize_floor(name,tris,mi,mesh,colors,selected):
    terrain=name.startswith('地面')
    if not (terrain or building(name)):return np.zeros(len(tris),dtype=bool)
    normal=np.cross(tris[:,1]-tris[:,0],tris[:,2]-tris[:,0])
    slope=normal[:,2]/np.maximum(np.linalg.norm(normal,axis=1),1e-10)
    mask=(np.abs(slope)>.05) if terrain else ((slope>.9998)&(np.ptp(tris[:,:,2],axis=1)<.035))
    covered=np.zeros(len(tris),dtype=bool)
    step=1.0 if terrain else .20
    for mat in np.unique(mi[mask]):
        sample=colors[mi[selected]==mat]
        base=([.79,.63,.38] if terrain else (sample.mean(axis=0) if len(sample) else [.4,.35,.3]))
        color=tuple(int(round(255*(1.055*float(np.clip(v,0,1))**(1/2.4)-.055))) for v in base)
        color=tuple(max(0,c) for c in color)
        material='terrain' if terrain else (mesh.materials[mat].name if len(mesh.materials)>mat and mesh.materials[mat] else name)
        for ti in np.flatnonzero(mask&(mi==mat)):
            tri=tris[ti]
            low=np.ceil(tri[:,:2].min(axis=0)/step-.500001).astype(int)
            high=np.floor(tri[:,:2].max(axis=0)/step-.499999).astype(int)
            if np.any(high<low):continue
            a,b,c=tri
            xx,yy=np.meshgrid(np.arange(low[0],high[0]+1),np.arange(low[1],high[1]+1))
            x=(xx+.5)*step-a[0];y=(yy+.5)*step-a[1]
            den=normal[ti,2]
            u=(x*(c[1]-a[1])-y*(c[0]-a[0]))/den
            v=((b[0]-a[0])*y-(b[1]-a[1])*x)/den
            inside=(u>=-1e-7)&(v>=-1e-7)&(u+v<=1.0000001)
            if not inside.any():continue
            zs=a[2]+u[inside]*(b[2]-a[2])+v[inside]*(c[2]-a[2])
            for i,j,z in zip(xx[inside],yy[inside],zs):
                top=int(round(z*100/(10 if terrain else 1)))*(10 if terrain else 1)
                plate_cells[(round(step*100),top,material,color)].add((int(i),int(j)))
            covered[ti]=True
    return covered
def pack_plates():
    out=[]
    for (step,top,material,color),cells in plate_cells.items():
        rows=defaultdict(set)
        for x,y in cells:rows[y].add(x)
        active={};rects=[]
        for y in range(min(rows),max(rows)+2):
            runs=[];start=last=None
            for x in sorted(rows.get(y,())):
                if last is None or x!=last+1:
                    if last is not None:runs.append((start,last+1))
                    start=x
                last=x
            if last is not None:runs.append((start,last+1))
            for span in active.keys()-set(runs):rects.append((*span,active.pop(span),y))
            for span in runs:active.setdefault(span,y)
        if material=='terrain' and len(rects)>1:
            # A changing shoreline can split otherwise continuous runs every row.
            # Try maximal rectangles in both scan directions on the same footprint.
            for transpose in (False,True):
                remaining={(y,x) if transpose else (x,y) for x,y in cells}
                alternative=[]
                for x,y in sorted(remaining,key=lambda point:(point[1],point[0])):
                    if (x,y) not in remaining:continue
                    width=0
                    while (x+width,y) in remaining:width+=1
                    best=(width,width,1)
                    height=1
                    while width and (x,y+height) in remaining:
                        run=0
                        while run<width and (x+run,y+height) in remaining:run+=1
                        width=run
                        height+=1
                        best=max(best,(width*height,width,height))
                    _,w,h=best
                    remaining.difference_update((i,j) for j in range(y,y+h) for i in range(x,x+w))
                    alternative.append((y,y+h,x,x+w) if transpose else (x,x+w,y,y+h))
                if len(alternative)<len(rects):rects=alternative
        footprint={(x,y) for a,b,c,d in rects for x in range(a,b) for y in range(c,d)}
        assert footprint==cells
        assert sum((b-a)*(d-c) for a,b,c,d in rects)==len(cells)
        for a,b,c,d in rects:
            depth=12 if material=='terrain' else 5
            out.append(dict(typeId='1101002001034000',snapToGround=False,color=dict(zip('rgb',color)),transform=dict(location=dict(x=(a+b)*step/2,y=(c+d)*step/2,z=top-depth),rotation=dict(yaw=0,pitch=0,roll=0),scale=dict(x=(b-a)*step/100,y=(d-c)*step/100,z=depth/100))))
    print('FLOOR_COVERAGE',sum(map(len,plate_cells.values())),len(out),flush=True)
    return out

# Connected roof panels are represented in their own plane, measured in metres.
roof_panels=[]
def collect_roofs(name,tris,areas):
    taken=np.zeros(len(tris),dtype=bool)
    if not any(tag in name.lower() for tag in ('_house','_shop','_booth')):return taken
    normals=np.cross(tris[:,1]-tris[:,0],tris[:,2]-tris[:,0])/np.maximum(areas[:,None]*2,1e-9)
    centers=tris.mean(axis=1)
    candidates=(normals[:,2]>.38)&(normals[:,2]<.97)&(centers[:,2]>np.percentile(centers[:,2],45))
    for _ in range(12):
        ids=np.flatnonzero(candidates&~taken)
        if not len(ids):break
        seed=ids[np.argmax(areas[ids])]
        normal=normals[seed]
        group=candidates&~taken&(normals@normal>.996)&(np.abs((centers-centers[seed])@normal)<.11)
        candidates[group]=False
        if areas[group].sum()<3:continue
        # Local X follows the rise; local Y follows the ridge.
        rise=np.array([-normal[0],-normal[1],0.])
        rise/=np.linalg.norm(rise)
        yaw=math.atan2(rise[1],rise[0])
        pitch=math.acos(np.clip(normal[2],0,1))
        ridge=np.array([-rise[1],rise[0],0.])
        rise=rise*math.cos(pitch)+np.array([0,0,math.sin(pitch)])
        vertices=tris[group].reshape(-1,3)
        u=vertices@rise;v=vertices@ridge
        w=np.ptp(u);d=np.ptp(v)
        if min(w,d)<.4 or areas[group].sum()<.80*w*d:continue
        center=rise*(u.min()+u.max())/2+ridge*(v.min()+v.max())/2+normal*np.median(vertices@normal)
        origin=center-normal*.10
        roof_panels.append(dict(typeId='1108008001001009',snapToGround=False,transform=dict(
            location=dict(zip('xyz',(origin*100).tolist())),rotation=dict(yaw=math.degrees(yaw),pitch=math.degrees(pitch),roll=0),
            scale=dict(x=w*100/600.2,y=d*100/404.2,z=10/23.6))))
        taken|=group
    return taken

for inst in dg.object_instances:
    obj=inst.object
    if obj.type!='MESH' or obj.hide_render: continue
    mesh=obj.to_mesh()
    try:
        if not mesh.polygons:continue
        mesh.calc_loop_triangles()
        v=np.empty(len(mesh.vertices)*3,dtype=np.float32);mesh.vertices.foreach_get('co',v)
        m=np.array(inst.matrix_world);v=v.reshape(-1,3)@m[:3,:3].T+m[:3,3]
        idx=np.empty(len(mesh.loop_triangles)*3,dtype=np.int32);mesh.loop_triangles.foreach_get('vertices',idx)
        tris=v[idx.reshape(-1,3)]
        areas=np.linalg.norm(np.cross(tris[:,1]-tris[:,0],tris[:,2]-tris[:,0]),axis=1)/2
        if areas.sum()<1e-12:continue
        mi=np.empty(len(areas),dtype=np.int32);mesh.loop_triangles.foreach_get('material_index',mi)
        cols=np.array([material_color(mat) for mat in mesh.materials] or [[.6,.65,.65]])
        n=220000 if building(obj.name) else min(48000,max(600,len(areas)*5))
        sel=rng.choice(len(areas),size=n,p=areas/areas.sum())
        uv=rng.random((n,2));uv[uv.sum(axis=1)>1]=1-uv[uv.sum(axis=1)>1]
        t=tris[sel];pts=t[:,0]+uv[:,:1]*(t[:,1]-t[:,0])+uv[:,1:]*(t[:,2]-t[:,0])
        colors=cols[np.minimum(mi[sel],len(cols)-1)]
        if mesh.uv_layers.active:
            loops=np.empty(len(areas)*3,dtype=np.int32);mesh.loop_triangles.foreach_get('loops',loops)
            coords=np.empty(len(mesh.loops)*2,dtype=np.float32);mesh.uv_layers.active.data.foreach_get('uv',coords)
            corners=coords.reshape(-1,2)[loops.reshape(-1,3)[sel]]
            tex=(corners[:,0]+uv[:,:1]*(corners[:,1]-corners[:,0])+uv[:,1:]*(corners[:,2]-corners[:,0]))%1
            for k,mat in enumerate(mesh.materials):
                image=pixel_image(mat)
                mask=mi[sel]==k
                if image is not None and mask.any():
                    y,x=image.shape[:2]
                    colors[mask]=image[(tex[mask,1]*y).astype(int)%y,(tex[mask,0]*x).astype(int)%x]
        if '_house01' in obj.name.lower():
            collect_roofs(obj.name,tris,areas)
            continue
        floor=rasterize_floor(obj.name,tris,mi,mesh,colors,sel)
        floor |= collect_roofs(obj.name,tris,areas)
        keep=~floor[sel]
        if keep.any() and not obj.name.startswith('地面'):
            regions.append((obj.name,pts[keep],colors[keep],areas[~floor].sum(),v.min(axis=0),v.max(axis=0)))
    finally:obj.to_mesh_clear()
if not regions:raise RuntimeError('No scene meshes')
print("REGIONS",len(regions),'BOUNDS',np.min([r[4] for r in regions],axis=0),np.max([r[5] for r in regions],axis=0),flush=True)
bpy.ops.export_scene.gltf(filepath=str(out/'source.glb'),export_format='GLB',use_renderable=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True)
# Sample the surface deterministically; distribute the piece budget by visible area.
plates=pack_plates()
budget=6500
print('NATIVE_ROOF_PANELS',len(roof_panels),flush=True)
assert budget>=len(regions)
if len(regions)>budget:
    regions=[('scene',np.concatenate([r[1] for r in regions]),np.concatenate([r[2] for r in regions]),sum(r[3] for r in regions),None,None)]
single=lambda r:any(tag in r[0].lower() for tag in ('_stone','_plant','_sea01'))
weights=np.array([0 if single(r) else math.sqrt(r[3])*(22 if building(r[0]) else .13 if r[0].startswith('地面') else 1) for r in regions])
q=np.ones(len(regions),dtype=int)
caps=np.array([1 if single(r) else max(1,len(r[1])//9) for r in regions])
import heapq
heap=[(-w,i) for i,w in enumerate(weights) if w>0 and caps[i]>1]
heapq.heapify(heap)
for _ in range(budget-len(q)):
    if not heap:break
    _,i=heapq.heappop(heap)
    q[i]+=1
    if q[i]<caps[i]:heapq.heappush(heap,(-weights[i]/q[i],i))
print('BUILDING_BUDGET',[(r[0],int(n)) for r,n in zip(regions,q) if '_house' in r[0].lower()],flush=True)
items=plates+roof_panels
def fit(points,colors,n):
    if n>1 and len(points)>=2:
        ext=np.ptp(points,axis=0);axis=int(np.argmax(ext))
        j=min(len(points)-1,max(1,round(len(points)*(n//2)/n)))
        indices=np.argpartition(points[:,axis],j)
        left,right=indices[:j],indices[j:]
        fit(points[left],colors[left],n//2);fit(points[right],colors[right],n-n//2);return
    lo,hi=np.min(points,axis=0),np.max(points,axis=0)
    dims=np.maximum(hi-lo,.025)
    center=(hi+lo)/2
    rgb=np.clip(np.mean(colors,axis=0),0,1)
    rgb=np.where(rgb<=.0031308,rgb*12.92,1.055*rgb**(1/2.4)-.055)
    items.append(dict(typeId='1101002001034000',snapToGround=False,color=dict(zip('rgb',map(int,np.rint(rgb*255)))),transform=dict(location=dict(zip('xyz',map(float,[center[0]*100,center[1]*100,(center[2]-dims[2]/2)*100]))),rotation=dict(yaw=0,pitch=0,roll=0),scale=dict(zip('xyz',map(float,dims))))))
import subprocess
assets={a['typeId']:a for a in json.loads(subprocess.check_output(['node','-p',"JSON.stringify(require('./native-assets'))"],cwd=root,encoding='utf8'))}
def native(r,tid):
    asset=assets[tid];lo,hi=r[4],r[5]
    scale=np.maximum(hi-lo,.025)*100/np.array(asset['size'])
    origin=(lo+hi)*50-np.array(asset['offset'])*scale
    items.append(dict(typeId=tid,snapToGround=False,transform=dict(location=dict(zip('xyz',origin.tolist())),scale=dict(zip('xyz',scale.tolist())),rotation=dict(yaw=0,pitch=0,roll=0))))
# Source-family aliases selected from fuzzy searches of the native catalogue.
prop_matches={
    '_swing':'木秋千','_mailbox':'木信箱','_table':'大型户外桌','_balloon':'甜蜜气球簇',
    '_shell':'小贝壳','_lobster':'大龙虾','_swimring':'游泳圈','_surfboard':'冲浪板1',
    '_lamp':'铁艺路灯','_slide':'儿童滑梯','_signboard':'路牌','_barbecue':'烤架',
}
by_name={a['name']:tid for tid,a in assets.items()}
for r,n in zip(regions,q):
    name=r[0].lower();tid=None
    if '_chair01' in name:tid='1108001002001000'
    elif '_stone' in name:tid='1108006001001024'
    elif '_plant' in name:tid='1108006006001002' if r[5][2]-r[4][2]>4 else '1102015001004218'
    else:tid=next((by_name[label] for token,label in prop_matches.items() if token in name),None)
    if tid:
        native(r,tid)
        continue
    terrain=name.startswith('地面') or 'chunk' in name or 'activity_summer2025-' in name or 'activity_summer20250' in name
    if '_sea01' in name or terrain:
        water='_sea01' in name
        rgb=[.06,.46,.54] if water else [.79,.63,.38]
        if water:
            fit(np.array([r[4],r[5]]),np.array([rgb,rgb]),1)
        else:fit(r[1],np.tile(rgb,(len(r[1]),1)),int(n))
        continue
    fit(r[1],r[2],int(n))
# Coastal cottage. Local X spans the gable, Y follows the measured ridge.
def cottage():
    yaw=19.1; a=math.radians(yaw); ca,sa=math.cos(a),math.sin(a)
    blue=(62,108,145);trim=(226,210,174);wood=(128,83,52);glass=(46,77,89)
    def board(x,y,z,w,d,h,color,pitch=0):
        normal=np.array([-math.sin(math.radians(pitch))*ca,-math.sin(math.radians(pitch))*sa,math.cos(math.radians(pitch))])
        center=np.array([-4.55+x*ca-y*sa,-1.53+x*sa+y*ca,z+h/2])
        origin=(center-normal*h/2)*100
        items.append(dict(typeId='1101002001034000',snapToGround=False,color=dict(zip('rgb',color)),
            transform=dict(location=dict(zip('xyz',origin.tolist())),rotation=dict(yaw=yaw,pitch=pitch,roll=0),scale=dict(x=w,y=d,z=h))))
    floor=.57; eave=4.95;half=4.25;end=5.78
    board(0,0,floor-.17,2*half,2*end,.17,wood)
    for side in [-1,1]:
        board(side*half,0,floor,.16,2*end,eave-floor,blue)
        board(side*half,0,eave-.15,.22,2*end,.15,trim)
        for y in [-end,end]:
            board(side*half,y,floor,.22,.22,eave-floor,trim)
    for front in [-1,1]:
        y=front*end
        # Door opening at the front is full height for a standard player.
        if front<0:
            for side in [-1,1]:board(side*2.925,y,floor,2.65,.18,eave-floor,blue)
            board(0,y,floor+3.24,3.20,.18,eave-floor-3.24,blue)
        else:board(0,y,floor,8.5,.18,eave-floor,blue)
        for side in [-1,1]:
            x=side*2.94
            board(x,y+front*.13,2.09,1.22,.08,1.32,glass)
            for dx in [-.65,0,.65]:board(x+dx,y+front*.19,2.03,.08,.10,1.48,trim)
            for z in [2.03,2.73,3.43]:board(x,y+front*.19,z,1.4,.10,.08,trim)
        # Horizontal clapboard shadow lines flank the doorway.
        for z in np.arange(.92,eave,.32):
            for side in [-1,1]:
                board(side*2.925,y+front*.095,z,2.65,.028,.035,(51,87,116))
        for row in range(12):
            w=8.50*(1-(row+.5)/12)
            board(0,y,eave+.28*row,w,.17,.28,blue)
        board(0,y+front*.13,eave-.05,8.5,.17,.14,trim)
        # Faceted porthole with a contrasting rim on the seaward gable.
        if front<0:
            for radius,facecolor,offset in [(.48,trim,.22),(.365,glass,.27)]:
                for strip in range(10):
                    dz=(strip+.5)*2*radius/10-radius
                    width=2*math.sqrt(radius*radius-dz*dz)
                    board(0,y-offset,6.05+dz,width,.055,2*radius/10,facecolor)
        # Cream fascia follows both slopes.
        for side in [-1,1]:
            board(side*2.13,y+front*.16,eave+1.65,5.48,.21,.16,trim,-side*39.1)
    # Open side veranda and lean-to canopy.
    board(5.74,-.80,.39,3.0,7.8,.18,wood)
    for y in [-4.6,-.8,3.0]:board(7.10,y,.57,.17,.17,3.45,trim)
    board(5.70,-.80,4.18,3.45,8.12,.16,wood,-12)
    board(7.10,-.80,3.94,.21,7.85,.19,trim)
cottage()
batches=[items[i:i+50] for i in range(0,len(items),50)]
project=dict(schema='yuanmeng-custom-project/v1',map='coconut-wave',name='椰风逐浪',placement=dict(coordinates=dict(units='cm',sourceUnitCm=1),count=len(items),commands=[dict(tool='ugc_create_entity',arguments=dict(items=b)) for b in batches]))
(out/'project.json').write_text(json.dumps(project,ensure_ascii=False,separators=(',',':')),encoding='utf8')
