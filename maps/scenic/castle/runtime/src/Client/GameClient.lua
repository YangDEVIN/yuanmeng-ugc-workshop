local Config=require "Common.ParkConfig"
local Rules=require "Common.ParkRules"
local Client={widgets={},handlers={},pool={},rest={},phase={wheel=0,carousel=0},running={},coins=0,nearest=nil,menu=false,photo=false,interior=false,hold=0,ready=false}
local function atan2(y,x)
 if x>0 then return math.atan(y/x) end
 if x<0 then return math.atan(y/x)+(y>=0 and math.pi or -math.pi) end
 if y>0 then return math.pi/2 elseif y<0 then return -math.pi/2 end
 return 0
end
local function vector(p) return Engine.Vector(p[1],p[2],p[3]) end
local function distance(a,b) return (a.X-b[1])^2+(a.Y-b[2])^2 end
local function quat(r)
 local p,y,roll=r.Y*.5*math.pi/180,r.Z*.5*math.pi/180,r.X*.5*math.pi/180
 local sp,cp,sy,cy,sr,cr=math.sin(p),math.cos(p),math.sin(y),math.cos(y),math.sin(roll),math.cos(roll)
 return {cr*sp*sy-sr*cp*cy,-cr*sp*cy-sr*cp*sy,cr*cp*sy-sr*sp*cy,cr*cp*cy+sr*sp*sy}
end
local function multiply(a,b)
 return Engine.Quat(a[4]*b[1]+a[1]*b[4]+a[2]*b[3]-a[3]*b[2],a[4]*b[2]-a[1]*b[3]+a[2]*b[4]+a[3]*b[1],a[4]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[4],a[4]*b[4]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3])
end
function Client:Init()
 System:BindNotify(_GAME.NetMsg.S2C_ServerNtf,self.OnState,self)
 System:RegisterEvent(Events.ON_BUTTON_CLICKED,self.OnClick,self)
 System:RegisterEvent(Events.ON_BUTTON_PRESSED,self.OnPress,self)
 System:RegisterEvent(Events.ON_BUTTON_RELEASED,self.OnRelease,self)
end
function Client:Widget(name,text,x,y,w,h,colour,handler)
 local uid=UI:CreateWidget(10000001,x,y)
 assert(uid and uid~=0,"Cannot create park UI "..name)
 UI:SetSize({uid},w,h);UI:SetText({uid},text);UI:SetTextSize({uid},22)
 UI:SetImageColor({uid},colour or "#F2DFC3");UI:SetTextColor({uid},"#503A4E")
 UI:SetHittable(uid,handler~=nil);self.widgets[name]=uid
 if handler then self.handlers[uid]=handler end
 return uid
end
function Client:Show(name,visible) UI:SetVisibility({self.widgets[name]},visible) end
function Client:OnStart()
 self.widgets={};self.handlers={};self.rest={};self.pool={};self.hold=0;self.ready=false
 self.phase={wheel=0,carousel=0};self.running={wheel=false,carousel=false};self.game=nil;self.menu=false
 Log:PrintLog("[ParkClient] OnStart")
 for _,b in ipairs(Config.motions) do
  local p=Element:GetPosition(b.id);local r=Element:GetRotation(b.id)
  assert(p and r,"Missing moving entity "..b.id)
  self.rest[b.id]={pos={p.X,p.Y,p.Z},q=quat(r)}
 end
 TimerManager:AddTimer(.6,function() self:BuildUI();System:SendToServer(_GAME.NetMsg.C2S_ClientReq,{action="hello"}) end)
end
function Client:Send(action,index,value)
 System:SendToServer(_GAME.NetMsg.C2S_ClientReq,{action=action,index=index,value=value,round=self.game and self.game.round})
end
function Client:BuildUI()
 self:Widget("wallet","月河乐园 · 金币 0",-640,-330,295,42,"#F2DFC3")
 self:Widget("directory","园区导览",-640,-280,150,42,"#C3DED6",function() self.menu=not self.menu;self:Refresh() end)
 self:Widget("interact","走近场景中的互动点",-245,280,490,46,"#E5CBD7",function() if self.nearest then self:Send("interact",self.nearest) end end)
 self:Widget("return","返回游园",440,-280,150,42,"#C3DED6",function() self:Return() end)
 self:Widget("info","",-245,226,490,40,"#F2DFC3")
 for i,p in ipairs(Config.points) do
  self:Widget("place"..i,p.name.." · 前往",-635,-225+(i-1)*44,220,40,"#F2DFC3",function() self.menu=false;self:Send("travel",i);self:Refresh() end)
 end
 self:Widget("board","",-320,-245,640,475,"#E9E4DC")
 self:Widget("title","",-300,-234,600,46,"#D4ABC0")
 self:Widget("score","",-300,-180,600,40,"#F2DFC3")
 self:Widget("question","",-285,-95,570,95,"#F2DFC3")
 for i=1,3 do self:Widget("answer"..i,"",-260,15+(i-1)*58,520,48,"#C3DED6",function() self:Send("answer",nil,i) end) end
 self:Widget("left","按住向左",-290,235,180,48,"#C3DED6",function() end)
 self:Widget("right","按住向右",110,235,180,48,"#C3DED6",function() end)
 self:Widget("avatar","公主",-27,102,58,44,"#D4ABC0")
 for i=1,12 do self.pool[i]=self:Widget("token"..i,"币",0,-600,30,30,"#E6BC6C") end
 self:Widget("result","",-275,-58,550,145,"#F2DFC3")
 self:Widget("done","领取并返回广场",-210,120,420,52,"#C3DED6",function() self:Return() end)
 self.ready=true;self:Refresh();Log:PrintLog("[ParkUI] ready",#self.pool)
end
function Client:OnClick(uid)
 local fn=self.handlers[uid];if fn then fn() end
end
function Client:OnPress(uid)
 if uid==self.widgets.left then self.hold=-1 elseif uid==self.widgets.right then self.hold=1 else return end
 self:Send("direction",nil,self.hold)
end
function Client:OnRelease(uid)
 if uid==self.widgets.left or uid==self.widgets.right then self.hold=0;self:Send("direction",nil,0) end
end
function Client:Return()
 self.hold=0;self:Send("exit");self.game=nil;self.photo=false;self.menu=false
 if self.interior then for _,id in ipairs(Config.reveal) do Element:SetVisibility(id,true) end;self.interior=false end
 Camera:Reset();self:Refresh()
end
function Client:SetView(index)
 local p=Config.points[index]
 if p.kind=="bell" then Audio:PlaySFXAudio2D(700236,3,65,0);UI:SetText({self.widgets.info},"庆典钟已敲响");return end
 self.photo=true;self.menu=false
 if p.kind=="interior" then
  self.interior=true
  for _,id in ipairs(Config.reveal) do Element:SetVisibility(id,false) end
  Camera:BindOnWorldPosition(Engine.Vector(1050,1800,1300),Engine.Rotator(0,-12,90),.4)
  UI:SetText({self.widgets.info},"王座厅与魔法书房 · 返回游园恢复外观")
 else
  local c,t=p.camera,p.target;local dx,dy,dz=t[1]-c[1],t[2]-c[2],t[3]-c[3]
  local yaw=atan2(dy,dx)*180/math.pi;local pitch=atan2(dz,math.sqrt(dx*dx+dy*dy))*180/math.pi
  Camera:BindOnWorldPosition(vector(c),Engine.Rotator(0,pitch,yaw),.5)
  UI:SetNativeInterfaceVisible(UI.UIType.Photo,true)
  UI:SetText({self.widgets.info},p.name.." · 使用原生拍照按钮留念")
 end
 self:Refresh();Log:PrintLog("[ParkView]",p.name)
end
function Client:OnState(msgId,msg)
 self.motionChanged=true;self.coins=msg.coins or 0;self.game=msg.game or nil;self.running=msg.running or {};self.phase=msg.phase or self.phase
 if self.ready then
  local extra=msg.extra
  if extra and extra.view then self:SetView(extra.view) end
  if extra and extra.tip then UI:SetText({self.widgets.info},extra.tip) end
  self:Refresh()
 end
end
function Client:Refresh()
 if not self.ready then return end
 UI:SetText({self.widgets.wallet},"月河乐园 · 金币 "..self.coins)
 local g=self.game;local active=g~=nil
 for _,name in ipairs({"board","title","score"}) do self:Show(name,active) end
 for _,name in ipairs({"question","answer1","answer2","answer3","left","right","avatar","result","done"}) do self:Show(name,false) end
 for i=1,12 do self:Show("token"..i,false) end
 self:Show("interact",not active and not self.photo)
 self:Show("return",active or self.photo)
 self:Show("info",not active)
 for i=1,#Config.points do self:Show("place"..i,self.menu and not active and not self.photo) end
 if not active then return end
 UI:SetText({self.widgets.title},Config.points[g.game].name)
 UI:SetText({self.widgets.score},"得分 "..g.score.."　剩余 "..math.max(0,math.ceil((g.game==1 and 60 or 25)-g.time)).." 秒")
 if g.done then
  self:Show("result",true);self:Show("done",true)
  UI:SetText({self.widgets.result},"本局完成\n获得 "..g.reward.." 金币\n当前金币 "..self.coins)
 elseif g.game==1 then
  self:Show("question",true);local q=Rules.questions[g.question];UI:SetText({self.widgets.question},q.text)
  for i=1,3 do self:Show("answer"..i,true);UI:SetText({self.widgets["answer"..i]},q.options[i]) end
 else
  self:Show("left",true);self:Show("right",true);self:Show("avatar",true)
  UI:SetText({self.widgets.avatar},g.game==2 and "公主" or "篮子")
  UI:SetPosition({self.widgets.avatar},g.x-27,102)
  for i,o in ipairs(g.objects) do if i<=12 then
   self:Show("token"..i,true);UI:SetPosition({self.pool[i]},o.x-15,o.y)
   UI:SetText({self.pool[i]},o.kind=="rock" and "岩" or "币")
   UI:SetImageColor({self.pool[i]},o.kind=="rock" and "#809698" or "#E6BC6C")
  end end
 end
end
function Client:Animate(dt)
 for key,period in pairs({wheel=40,carousel=18}) do if self.running[key] then self.phase[key]=(self.phase[key]+dt*math.pi*2/period)%(math.pi*2) end end
 for _,b in ipairs(Config.motions) do
  local wheel=b.kind=="wheel" or b.kind=="cabin";local key=wheel and "wheel" or "carousel"
  if self.running[key] or self.motionChanged then
   local r=self.rest[b.id];local p=r.pos;local center=wheel and Config.wheel or Config.carousel;local a=self.phase[key];local c,s=math.cos(a),math.sin(a)
   local x,y,z=p[1],p[2],p[3]
   if b.kind=="cabin" then
    local pivot=b.pivot;local dx,dz=pivot[1]-center[1],pivot[3]-center[3]
    x=x+center[1]+c*dx-s*dz-pivot[1];z=z+center[3]+s*dx+c*dz-pivot[3]
   elseif wheel then
    local dx,dz=x-center[1],z-center[3];x=center[1]+c*dx-s*dz;z=center[3]+s*dx+c*dz
   else
    local dx,dy=x-center[1],y-center[2];x=center[1]+c*dx-s*dy;y=center[2]+s*dx+c*dy
    if b.kind=="horse" then z=z+48*math.sin(a*2+atan2(dy,dx)*2) end
   end
   Element:SetPosition(b.id,Engine.Vector(x,y,z),Element.COORDINATE.World)
   if b.kind~="cabin" then
    local q=wheel and {0,-math.sin(a/2),0,math.cos(a/2)} or {0,0,math.sin(a/2),math.cos(a/2)}
    Element:SetRotationQuaternion(b.id,multiply(q,r.q),Element.COORDINATE.World)
   end
  end
 end
 self.motionChanged=false
end
function Client:OnUpdate(dt)
 if not self.ready then return end
 self:Animate(dt)
 self.uiClock=(self.uiClock or 0)+dt
 if self.uiClock>.20 then
  self.uiClock=0
  if self.hold~=0 then self:Send("direction",nil,self.hold) end
  local id=Character:GetLocalPlayerId();local p=id and Character:GetPosition(id)
  if p and not self.game and not self.photo then
   local best,range=nil,2000^2
   for i,point in ipairs(Config.points) do local d=distance(p,point.pos);if d<range then best=i;range=d end end
   self.nearest=best
   UI:SetText({self.widgets.interact},best and ("互动 · "..Config.points[best].name) or "沿广场游览 · 导览可前往各互动点")
  end
 end
end
function Client:OnEnd()
 self.ready=false
 for _,r in pairs(self.widgets) do UI:SetVisibility({r},false) end
 Camera:Reset()
end
return Client
