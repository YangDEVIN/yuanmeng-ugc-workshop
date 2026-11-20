from pathlib import Path
import json, math
out=Path(__file__).resolve().parent
items=[];ids=[];doors=[]
def box(name,x,y,z,w,h,d,color):
 key=len(items);ids.append(name+'/'+str(key))
 items.append(dict(typeId='1101002001034000',snapToGround=False,color=dict(zip('rgb',bytes.fromhex(color[1:]))),transform=dict(location=dict(x=round(x*100,4),y=round(-z*100,4),z=round(y*100,4)),rotation=dict(pitch=0,yaw=0,roll=0),scale=dict(x=round(w,5),y=round(d,5),z=round(h,5)))))
def rod(name,x1,y1,x2,y2,z,width,depth,color):
 length=math.hypot(x2-x1,y2-y1)
 angle=math.atan2(y2-y1,x2-x1)
 # The cube pivot is at the centre of its bottom face.
 box(name,(x1+x2)/2+width*math.sin(angle)/2,(y1+y2)/2-width*math.cos(angle)/2,z,length,width,depth,color)
 items[-1]['transform']['rotation']['pitch']=math.degrees(angle)
def roundpiece(name,x,y,z,r,h,color,kind='1101002001034002'):
 box(name,x,y,z,2*r/3,h/3,2*r/3,color);items[-1]['typeId']=kind
stone='#d99c9c';trim='#f0d5b4';roof='#326e82';teal='#4c7472';brass='#bc965e';wine='#a86372';ivory=trim
grass='#91a385'; earth='#8f887c';glass='#536977'
def trimwall(x,z,w,d,h):
 box('石墙',x,.20,z,w,h,d,stone)
 for y,c in [(.2,trim),(h+.12,trim)]:box('檐线',x,y,z,w+.14,.16,d+.14,c)
def tower(x,z,r,h):
 roundpiece('石塔',x,.20,z,r,h,stone)
 for y in [.32,h-.24,h+.13]:roundpiece('石箍',x,y,z,r+.09,.14,trim)
 roundpiece('石板尖顶',x,h+.27,z,r*1.16,r*2.18,roof,'1101002001034004')
 roundpiece('塔尖',x,h+.26+r*2.18,z,.065,.32,brass)
 for off in [-.30,.30]:
  box('长窗',x+off*r,h-.82,z+r*.94,.17,.47,.055,glass)
def hall(x,z,w,d,h):
 box('内厅地面',x,.27,z,w,.10,d,trim)
 box('内厅后墙',x,.2,z-d/2,w,h,.19,stone)
 for side in [-1,1]:box('内厅侧墙',x+side*w/2,.2,z,.19,h,d,stone)
 for side in [-1,1]:box('可透视前墙',x+side*(w/4+.3),.2,z+d/2,w/2-.6,h,.19,stone)
 box('可透视门楣',x,h-.8,z+d/2,1.2,.8,.19,stone)
 for side in [-1,1]:
  tilt=32*side
  # Sloped roof panels meet on the central ridge.
  angle=math.radians(tilt);length=w*.55/math.cos(angle)
  rod('坡屋面',x+side*w*.55,h+.31,x,h+.31+w*.55*math.tan(math.radians(32)),z,.17,d+.35,roof)
 for j in range(10):
  rise=w*.55*math.tan(math.radians(32))/10
  box('山墙砌体',x,h+.25+j*rise,z,w*(1-(j+.5)/10),rise,d,stone)
 for i in range(int(w/.62)):
  xx=x-w/2+.4+i*.62
  box('拱窗玻璃',xx,h*.38,z+d/2+.035,.28,h*.42,.07,glass)
  box('窗台',xx,h*.38-.07,z+d/2+.06,.38,.08,.11,trim)
box('王国场地200米',0,-.35,0,200,.35,200,grass)
box('花园草坪',-.25,.13,2,20.6,.06,22.25,grass)
box('月河',-11.65,.13,2,4.2,.06,22.25,'#669697')
box('滨河步道',-8.53,.19,2,2.1,.065,22.25,'#bca085')
box('城堡地坪',0,.19,-2.5,11.8,.07,10.6,'#c9b7a0')
hall(-1.5,-4.3,4.4,3.7,4.05);hall(2.1,-3.4,3.1,3.4,3.25)
for x,z,r,h in [(-2.8,-4.9,.96,6.35),(1.7,-5.25,.65,4.9),(3.55,-3.8,.68,4.45),(-4.8,-6.5,.62,3.5),(4.8,-6.5,.62,3.5)]:tower(x,z,r,h)
for x in [-4.8,4.8]:
 trimwall(x,-2.45,.44,8,1.48);tower(x,1.55,.66,2.15)
 trimwall(x*.59,1.55,3.85,.46,1.55)
for x in [-1.03,1.03]:tower(x,1.55,.43,2.35)
box('门楼过梁',0,1.97,1.55,1.8,.45,.65,stone);box('门楼挑檐',0,2.42,1.55,2,.17,.82,roof)
for i in range(13):
 for side in [-1,1]:box('城垛',side*4.8,1.82,-6.1+i*.61,.46,.25,.32,trim)
box('城门大道',0,.20,6.8,2.3,.06,10.2,'#dacbb4')
box('市集广场',0,.192,7.1,14.3,.06,6.0,'#c8ac97')
for side in [-1,1]:
 box('铺地镶边',side*1.25,.255,7.1,.09,.035,6.0,trim)
 box('翼廊步道',side*5.4,.20,4.35,4.35,.06,1.3,trim)
 for z in [3.2,10.55]:
  box('花池石座',side*4.75,.20,z,4.4,.25,.77,stone)
  box('修剪绿篱',side*4.75,.45,z,4.18,.35,.65,'#668368')
 for z in [-5.6,-2.8,.3,11.8]:
  x=side*7.9
  roundpiece('树干',x,.2,z,.14,1.12,'#87694f')
  for y,r in [(1.14,.63),(1.68,.46)]:roundpiece('树冠',x,y,z,r,r*1.5,'#658368','1101002001034010')
box('码头栈台',-9.4,.21,1.3,3.15,.15,4.7,'#ad9275')
for game,(x,z,title) in enumerate([(-5.25,5.42,'星月课堂'),(5.55,4.8,'公主雪场'),(5.55,8.65,'金币商铺')]):
 box('店铺地台',x,.25,z,2.75,.14,1.94,stone)
 box('后墙',x,.39,z-.8,2.50,1.46,.16,stone)
 for side in [-1,1]:box('石廊柱',x+side*1.1,.39,z+.67,.18,1.48,.18,trim)
 for side in [-1,1]:rod('店铺双坡顶',x+side*1.48,1.91,x,2.62,z,.14,2.18,roof)
 box('金色屋脊',x,2.64,z,.10,.09,2.26,brass)
 if game==0:
  box('课堂黑板',x,.80,z-.67,1.70,.79,.08,teal)
  for side in [-1,1]:box('书桌',x+side*.50,.40,z+.15,.78,.35,.35,'#ac8c70')
 elif game==1:
  for j in range(6):box('练习雪坡',x,.39,z+.65-j*.23,1.55,.08+.095*j,.24,'#d1e3e4')
 else:
  box('柜台',x,.39,z+.48,1.83,.55,.41,wine)
  for i in range(4):roundpiece('金币',x-.54+i*.35,.94,z+.48,.14,.12,brass)
 doors.append(dict(id='arcade-'+str(game),game=game,name=title,label=['答题','滑雪','接金币'][game],location=dict(x=x*100,y=-(z+1)*100,z=120)))
for x in [-3.0,-1.4]:
 box('花架支柱',x,.2,9.4,.17,1.63,.19,teal)
 for i in range(3):roundpiece('蔷薇',x,.65+i*.4,9.55,.15,.28,wine,'1101002001034010')
box('花架横梁',-2.2,1.83,9.4,2.02,.18,.32,teal)
for x in [-1.62,1.62]:
 for z in [3.15,10.6]:
  roundpiece('灯杆',x,.21,z,.075,1.35,teal)
  roundpiece('灯球',x,1.56,z,.18,.36,ivory,'1101002001034010')
cx,cy,cz=-9.2,3.55,1.3
for z in [cz-.42,cz+.42]:
 for side in [-1,1]:rod('摩天轮支架',cx+side*1.35,.34,cx,cy,z,.19,.22,teal)
for j in range(16):
 a=j*math.tau/16;b=(j+1)*math.tau/16
 for radius,color,width in [(2.54,brass,.12),(2.30,wine,.085)]:
  rod('轮圈',cx+radius*math.cos(a),cy+radius*math.sin(a),cx+radius*math.cos(b),cy+radius*math.sin(b),cz,width,.15,color)
 if j%2==0:
  xx=cx+2.47*math.cos(a); yy=cy+2.47*math.sin(a)
  rod('轮辐',cx,cy,xx,yy,cz,.075,.12,ivory)
  for side in [-1,1]:box('吊杆',xx+side*.19,yy-.49,cz+.16,.045,.50,.045,brass)
  box('吊舱',xx,yy-.60,cz+.16,.56,.24,.48,[wine,teal,roof,'#b16e49'][j//2%4])
  box('吊舱金边',xx,yy-.40,cz+.16,.60,.07,.50,ivory)
for side in [-1,1]:
 for j in range(3):
  x=side*(2.15+j*1.17)
  for z in [3.2,10.54]:
   roundpiece('花篱绣球',x,.74,z,.18,.30,wine,'1101002001034010')
 for z in [6.9,8.25]:
  x=side*3.5
  box('长椅座',x,.47,z,1.15,.10,.35,'#99775c')
  for dx in [-.40,.40]:box('椅脚',x+dx,.26,z,.12,.21,.28,teal)
  box('椅背',x,.55,z-.15,1.15,.23,.07,'#99775c')
 for j in range(5):
  z=4.8+j*1.05
  box('广场分缝',side*4.1,.255,z,5.6,.008,.033,'#b79f8e')
for x in [-7,7]:
 roundpiece('水池石沿',x,.2,-3.9,.92,.22,trim)
 roundpiece('池水',x,.42,-3.9,.80,.03,'#77a2a4')
 roundpiece('喷泉柱',x,.45,-3.9,.13,.52,stone)
 roundpiece('泉盘',x,.97,-3.9,.34,.10,trim)
# The park is authored in seven-metre planning bays. Landmark prefabs use a
# uniform transform so wheel circles, roofs and towers retain their proportions.
for x,z,r,h in [(-4,-6.9,.51,4.7),(0,-7.7,.90,7.65),(3,-6.9,.56,5.3)]:
 tower(x,z,r,h)
for i in range(23):
 x=-5.45+i*.49
 box('岩台石壁',x,.18,-7.8,.65,1.05+.39*math.sin(i*.9),1.3,'#928784')
for s in [-1,1]:
 for j in range(3):
  x=s*(3.0+j*1.7);z=10.9
  hall(x,z,1.65,1.65,1.84+(j%2)*.28)
  for side in [-1,1]:box('商铺橱窗',x+side*.42,.42,z+.86,.55,.75,.07,'#80a6a4')
  for k in range(7):
   box('沿街遮阳棚',x-.66+k*.22,1.23,z+1.02,.22,.12,.52,[trim,wine][k%2])
  box('店面腰线',x,1.60,z+.88,1.64,.09,.13,brass)
 tower(s*2,12.8,.47,2.28)
 for i in range(4):
  x=s*(3.2+i*1.55)
  box('沿街花坛',x,.20,12.6,1.30,.22,.70,trim)
  for j in range(4):roundpiece('月季',x-.44+j*.28,.42,12.6,.19,.33,[wine,'#cf929b'][j%2],'1101002001034010')
rod('南门拱左',-1.9,1.98,0,2.76,12.8,.18,.32,brass)
rod('南门拱右',0,2.76,1.9,1.98,12.8,.18,.32,brass)
# Crown fountain at the forecourt junction.
for r,y,h,c in [(1.44,.26,.16,trim),(1.31,.42,.08,'#72b2ba'),(.42,.5,.36,stone),(.68,.86,.10,brass),(.20,.96,.51,'#8ccbd0'),(.38,1.47,.12,trim)]:
 roundpiece('皇冠喷泉',0,y,6.6,r,h,c)
# River-bank carousel with striped radial canopy and suspended brick mounts.
cx,cz=-9.1,6.8
roundpiece('旋木舞台',cx,.20,cz,1.94,.30,wine)
roundpiece('金边台面',cx,.50,cz,1.87,.09,brass)
roundpiece('旋木轴柱',cx,.59,cz,.28,2.03,trim)
for j in range(16):
 ang=math.tau*j/16
 for layer in range(5):
  r=1.78-layer*.34
  x=cx+r*math.cos(ang);z=cz+r*math.sin(ang)
  box('帐篷放射瓦',x,2.48+layer*.15,z,.90*r/1.78+.16,.19,.90*r/1.78+.16,[wine,trim][j%2])
 if j%2==0:
  x=cx+1.34*math.cos(ang);z=cz+1.34*math.sin(ang)
  roundpiece('旋木吊杆',x,.59,z,.041,1.98,brass)
  box('木马身',x,1.03,z,.48,.21,.16,trim)
  box('木马首',x+.20,1.22,z,.16,.24,.15,wine)
# Alpine ridge and continuous switchback snow piste.
for x,z,r,h in [(8,-6,3.55,4.9),(10,-4,2.75,3.8),(8,-2.8,2.9,3.1),(10,-.7,2.1,2.1)]:
 roundpiece('山体',x,.20,z,r,h,'#89928e','1101002001034004')
 roundpiece('雪峰',x,.20+h*.48,z,r*.52,h*.53,'#e7ede4','1101002001034004')
for i in range(64):
 t=i/63;x=8.4+1.45*math.sin(t*math.pi*3)-2.8*t;z=-5.3+9.6*t;y=.36+3.6*(1-t)
 roundpiece('弯道雪床',x,.20,z,.61,y-.2,'#9eada9')
 roundpiece('雪道',x,y,z,.64,.10,'#e8f2f0')
 if i%8==0:
  box('赛旗杆',x+.5,y+.1,z,.035,.49,.035,brass)
  box('赛旗',x+.61,y+.42,z,.22,.15,.04,wine)
for j in range(38):
 x=10.8+1.3*math.sin(j*1.9);z=-9+j*.48
 roundpiece('雪杉',x,.20,z,.44,1.35,'#527d70','1101002001034004')
 roundpiece('树梢积雪',x,.94,z,.22,.68,'#e4eee5','1101002001034004')
# Garden promenade, stepped palace landing and rose loggia.
for j in range(6):
 box('迎宾石阶',0,.26,2.55-j*.20,2.8,.07+j*.055,.22,trim)
for s in [-1,1]:
 for i in range(4):
  x=s*(1.55+i*.54)
  roundpiece('蔷薇廊柱',x,.26,3.45,.11,1.12,trim)
  roundpiece('廊柱金帽',x,1.38,3.45,.14,.09,brass)
  for k in range(3):
   roundpiece('花廊月季',x+k*.15,1.49,3.45,.13,.20,[wine,'#d7969f'][k%2],'1101002001034010')
 box('花廊横枋',s*2.4,1.47,3.45,2.05,.12,.21,teal)
 for i in range(9):
  z=-10+i*2.6;x=s*(11.95+.42*math.sin(i))
  roundpiece('花园树干',x,.01,z,.105,.93,'#967664')
  for j in range(3):
   roundpiece('花园树冠',x+.23*math.cos(j*2.1),.83+j*.19,z+.24*math.sin(j*2.1),.43,.71,[wine,'#d996a6','#bc8593'][j],'1101002001034010')
for i in range(22):
 x=-10.8+i*.96
 box('北园石栏',x,.13,-10.3,.96,.39,.19,stone)
 roundpiece('栏顶石珠',x,.52,-10.3,.10,.19,trim,'1101002001034010')
for i in range(18):
 z=-8.7+i*.95
 box('河滨栏柱',-8.12,.23,z,.09,.40,.09,trim)
box('河滨扶栏',-8.12,.62,-.62,.08,.07,16.3,brass)
for x,z,w,h in [(-1.5,-4.3,4.4,4.05),(2.1,-3.4,3.1,3.25)]:
 front=z+(3.7 if x<0 else 3.4)/2
 for j in range(6):
  xx=x-w*.46+j*w*.184
  box('大厅扶壁',xx,.24,front+.09,.10,h*.88,.21,trim)
  roundpiece('扶壁尖顶',xx,h*.88+.24,front+.09,.12,.30,brass,'1101002001034004')
def plate(name,x,y,z,n,m,p,c):
 box(name,x,y,z,n*p,.14,m*p,c)
 for i in range(n):
  for j in range(m):
   roundpiece('凸粒',x+(i-(n-1)/2)*p,y+.14,z+(j-(m-1)/2)*p,p*.30,.08,c)
for side in [-1,1]:
 for row in range(3):
  for j in range(7):
   box('错缝面砖',side*(1.4+j*.46+(row%2)*.19),.4+row*.29,1.82,.445,.27,.09,[stone,'#e3ada5','#cf9390'][(row+j)%3])
 for j in range(4):
  plate('城墙盖砖',side*(1.55+j*.82),1.91,1.55,4,2,.205,trim)
  plate('南门彩砖',side*(2.6+j*.91),.4,12.95,4,2,.225,[stone,trim][j%2])
 for j in range(3):
  plate('商街饰带',side*(3+j*1.7),1.60,11.83,8,1,.19,trim)
for j in range(32):
 a=j*math.tau/32
 roundpiece('喷泉包边凸粒',1.36*math.cos(a),.42,6.6+1.36*math.sin(a),.077,.075,trim)
plate('相机底座',-10.45,.28,4.45,8,5,.23,teal)
box('相机机身',-10.45,.5,4.45,1.42,.86,.55,wine)
plate('相机顶板',-10.45,1.36,4.45,6,2,.234,stone)
box('相机取景窗',-10.84,1.5,4.45,.43,.22,.39,trim)
for i,(r,c) in enumerate([(.37,brass),(.29,roof),(.18,'#83bdc6')]):
 roundpiece('镜头环',-10.41,.94,4.74+i*.08,r,.10,c)
 items[-1]['transform']['rotation']['roll']=90
plate('冰晶台',9.25,.22,3.45,8,6,.24,'#91b9c4')
for off,h,c in [(-.56,.88,'#83b9cb'),(0,1.50,'#9bcfdd'),(.52,1.05,'#87b9d2')]:
 box('水晶柱',9.25+off,.45,3.45,.42,h,.45,c)
 roundpiece('水晶尖',9.25+off,.45+h,3.45,.32,.43,'#cbe5e9','1101002001034004')
for i in range(18):
 a=i*math.tau/18
 roundpiece('旋木舞台凸粒',-9.1+1.81*math.cos(a),.52,6.8+1.81*math.sin(a),.09,.08,brass)
# The throne hall and library share the same floor and visible door threshold.
box('王座地毯',-1.5,.38,-4.0,.90,.025,3.3,wine)
for j in range(3):box('王座台阶',-1.5,.38+j*.10,-5.58+j*.12,1.26-j*.1,.10,.8-j*.12,trim)
box('王座座面',-1.5,.78,-5.48,.60,.16,.49,brass)
box('王座靠背',-1.5,.84,-5.68,.62,.92,.15,wine)
for side in [-1,1]:
 box('王座扶手',-1.5+side*.32,.84,-5.43,.10,.29,.52,brass)
 for j in range(3):
  x=-1.5+side*1.65;z=-5.3+j*1.05
  roundpiece('内厅柱',x,.38,z,.12,2.6,trim)
  roundpiece('内厅柱帽',x,2.98,z,.18,.12,brass)
 box('宫廷旗帜',-1.5+side*.84,1.1,-5.97,.44,1.5,.06,wine)
for j in range(3):
 z=-4.5+j*.65
 box('阅览桌',2.1,.38,z,1.15,.52,.40,'#9f785c')
 for side in [-1,1]:box('书卷',2.1+side*.24,.90,z,.25,.07,.26,[wine,teal][side==1])
for side in [-1,1]:
 x=2.1+side*1.36
 box('图书柜',x,.38,-3.4,.24,1.85,2.0,'#99795c')
 for shelf in range(3):
  box('书架隔板',x,.62+shelf*.51,-3.4,.29,.06,1.94,trim)
  for j in range(9):box('彩色藏书',x,.69+shelf*.51,-4.2+j*.2,.22,.30,.14,[wine,teal,brass][j%3])
for z in [-4.6,-3.5]:
 roundpiece('吊灯杆',-1.5,2.68,z,.035,.60,brass)
 for i in range(6):
  a=i*math.tau/6
  roundpiece('烛灯',-1.5+.43*math.cos(a),2.6,z+.43*math.sin(a),.06,.22,trim)
# Interactive kiosks face the promenade.
for x,z,c in [(-6.9,2.3,teal),(-7.2,7.4,wine),(1.3,5.9,brass)]:
 plate('机关操作台',x,.25,z,3,2,.17,c)
 box('操作柱',x,.42,z,.19,.59,.18,c)
 roundpiece('启动按钮',x,1.01,z,.10,.10,brass)
# The north ridge runs behind the palace into the western half of the park.
# Keep all foothills inside the 200 m square and below the central tower finial.
for i in range(12):
 x=-11.15+i*2.02
 z=-11.40+.28*math.sin(i*1.9)
 r=1.57+(i%3)*.18
 h=[4.25,5.3,4.7,5.75,4.65,4.35,4.6,4.85,5.65,5.2,5.9,5.05][i]
 roundpiece('背景山脊',x,.12,z,r,h,'#8b9ba5','1101002001034004')
 roundpiece('山巅积雪',x,.12+h*.43,z,r*.58,h*.58,'#e2edf0','1101002001034004')
 for side in [-1,1]:
  xx=x+side*.59; zz=z+.55
  roundpiece('前层岩坡',xx,.12,zz,.92,h*.48,'#9ba8ad','1101002001034020')
  roundpiece('岩坡雪帽',xx,.12+h*.24,zz,.48,h*.25,'#d9e8eb','1101002001034020')
 for j in range(3):
  xx=x+(j-1)*.47;zz=z+1.22
  roundpiece('山脚雪杉',xx,.20,zz,.27,.95,'#678d83','1101002001034004')
  roundpiece('山脚雪梢',xx,.68,zz,.14,.48,'#e0edf0','1101002001034004')
# A descending ridge connects the enlarged ski massif to the backdrop.
for x,z,r,h in [(10.1,-9.1,2.2,5.25),(8.5,-8.2,1.85,4.6),(-10.6,-8.6,1.7,3.1)]:
 roundpiece('连接山脊',x,.12,z,r,h,'#929fa6','1101002001034004')
 roundpiece('连接雪峰',x,.12+h*.46,z,r*.55,h*.55,'#e0ecef','1101002001034004')
# Keep the reference orientation: river west (left on the arrival view).
factor=7
for key,item in zip(ids,items):
 if key.startswith('王国场地200米/'):continue
 tr=item['transform'];loc=tr['location']
 loc['x']*=-factor;loc['y']=(loc['y']+125)*factor;loc['z']*=factor
 tr['rotation']['pitch']*=-1
 for axis in 'xyz':tr['scale'][axis]=round(tr['scale'][axis]*factor,6)
for d in doors:
 loc=d['location'];loc.update(x=-loc['x']*factor,y=(loc['y']+125)*factor,z=loc['z']*factor)
motion=[];reveal=[]
for key,item in zip(ids,items):
 name=key.split('/')[0]
 if name in ['轮圈','轮辐','吊杆','吊舱','吊舱金边','旋木舞台','金边台面','旋木吊杆','木马身','木马首','旋木舞台凸粒']:
  binding=dict(id=key,kind='wheel' if name in ['轮圈','轮辐'] else 'cabin' if name in ['吊杆','吊舱','吊舱金边'] else 'horse' if name in ['木马身','木马首'] else 'carousel')
  if binding['kind']=='cabin':
   tr=item['transform'];x=-tr['location']['x']/700
   y=tr['location']['z']/700
   delta={'吊杆':.49,'吊舱':.60,'吊舱金边':.40}[name]
   binding['pivot']=[-x*7,(y+delta)*7,-1.3*7+8.75]
  motion.append(binding)
 if name in ['坡屋面','山墙砌体','可透视前墙','可透视门楣','拱窗玻璃','窗台','大厅扶壁','扶壁尖顶','内厅侧墙'] and item['transform']['location']['y']>0:reveal.append(key)
 if name in ['石塔','石箍','石板尖顶','塔尖','长窗'] and abs(item['transform']['location']['y']+210)<1:reveal.append(key)
protected={m['id'] for m in motion}|set(reveal)
# Combine face-adjacent boxes with identical finish and cross-section to a fixed point.
def merge_boxes():
 pairs=list(zip(ids,items))
 while True:
  before=len(pairs)
  for axis in 'xyz':
   groups={};other=[]
   for key,item in pairs:
    tr=item['transform']
    if key in protected or item['typeId']!='1101002001034000' or any(tr['rotation'].values()):
     other.append((key,item));continue
    size=tr['scale'];pos=tr['location']
    fixed=tuple((pos[k],size[k]) for k in 'xyz' if k!=axis)
    start=round(pos[axis]-(0 if axis=='z' else size[axis]*50),5)
    groups.setdefault((tuple(item['color'].values()),fixed),[]).append((start,key,item))
   for group in groups.values():
    end=None
    for start,key,item in sorted(group,key=lambda r:r[0]):
     length=item['transform']['scale'][axis]*100
     if end is not None and abs(start-end)<.00001:
      tr=prev['transform'];tr['scale'][axis]=round(tr['scale'][axis]+length/100,5)
      if axis!='z':tr['location'][axis]=round(tr['location'][axis]+length/2,5)
     else:
      other.append((key,item));prev=item
     end=start+length
   pairs=other
  if len(pairs)==before:break
 ids[:]=[k for k,_ in pairs];items[:]=[v for _,v in pairs]
merge_boxes()
name='minecraft-castle'
project=dict(schema='yuanmeng-custom-project/v1',map=name,name='方块城堡 · 月河灯会',placement=dict(map=name,coordinates=dict(units='cm',sourceUnitCm=1),count=len(items),commands=[dict(tool='ugc_create_entity',arguments=dict(items=items[i:i+20])) for i in range(0,len(items),20)],batchItemIds=[ids[i:i+20] for i in range(0,len(ids),20)]),gameplay=dict(interactables=doors,photoSpot=dict(id='rose-arch',location=dict(x=1540,y=-5705,z=140))),verification=dict(layout='unverified',playtest='unverified',gridMetres=.1,sourceFloorMetres=1.3))
project['gameplay']['photoSpots']=[
 dict(id='rose-arch',name='蔷薇城门',point=[15.4,3,-57.05],camera=[15.4,19,-80],target=[0,14,18]),
 dict(id='river-camera',name='河岸摩天轮',point=[73.15,10,-22.4],camera=[94,23,-53],target=[63,16,-3]),
 dict(id='crystal-deck',name='雪山冰晶',point=[-64.75,9,-15.4],camera=[-85,21,-43],target=[-57,15,23])]
project['gameplay']['mechanisms']=dict(bindings=motion,revealIds=reveal,wheel=dict(pivot=[64.4,24.85,-.35],periodSeconds=40),carousel=dict(pivot=[63.7,0,-38.85],periodSeconds=18),editorBinding='required')
assert len(items)<=30000
(out/'workshop-project.json').write_text(json.dumps(project,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print(len(items))
