local Game={}
local W=require "Common.Bindings"
local stage,score,distance,length,time,x,speed,jump,wings,stun,mode,objects
local held={}
local steer,throttle,originX,originY=0,0,nil,nil
local function resetInput()
 held={}
 steer,throttle,originX,originY=0,0,nil,nil
end
local function moveStick(_,px,py)
 if not originX or mode~="run" then return end
 local dx,dy=(px-originX)/70,(py-originY)/70
 local length=math.max(1,math.sqrt(dx*dx+dy*dy))
 steer=math.abs(dx)>.15 and dx/length or 0
 throttle=math.abs(dy)>.15 and -dy/length or 0
end
local marks={"●","━","海豹","旗","鱼","旗","★"}
local function begin()
 resetInput()
 length=840+stage*70
 time=length/24+8
 distance,x,speed,jump,wings,stun,mode=0,0,23,0,0,0,"run"
 objects={}
 local seed=9127*stage
 local function random()
  seed=(1664525*seed+1013904223)%4294967296
  return seed/4294967296
 end
 local z=32
 while z<length-12 do
  local kind=1+math.floor(random()*7)
  local lane=random()*1.55-.775
  local variant=math.floor(random()*3)
  table.insert(objects,{kind=kind,z=z,x=lane,v=variant})
  z=z+14+random()*17
 end
end
local function press(uid)
 uid=tonumber(uid)
 held[uid]=true
 if uid==W.start then
  if mode=="station" then stage=stage+1 else stage,score=1,0 end
  begin()
 elseif uid==W.pause then
  if mode=="run" then resetInput() mode="pause" elseif mode=="pause" then mode="run" end
 elseif uid==W.jump and mode=="run" and stun<=0 and (jump<=0 or wings>0) then jump=.82 end
end
local function release(uid) held[tonumber(uid)]=false end
local function step(dt)
 time=time-dt
 if time<=0 then time,mode=0,"lost" return end
 jump=math.max(0,jump-dt)
 stun=math.max(0,stun-dt)
 wings=math.max(0,wings-dt)
 if stun<=0 then
  x=math.max(-.92,math.min(.92,x+math.max(-1,math.min(1,steer+(held[W.right] and 1 or 0)-(held[W.left] and 1 or 0)))*dt*1.7))
  speed=math.max(12,math.min(38,speed+math.max(-1,math.min(1,throttle+(held[W.fast] and 1 or 0)-(held[W.slow] and 1 or 0)))*dt*21))
 end
 distance=distance+speed*dt
 local height=math.sin(math.pi*jump/.82)
 for _,o in ipairs(objects) do
  if not o.done and o.z<=distance then
   o.done=true
   if math.abs(o.x-x)<=(o.kind==2 and .60 or .23) then
    if o.kind==7 then score=score+1000 wings=5
    elseif o.kind==4 or o.kind==6 then score=score+500+100*o.v
    elseif o.kind==5 then if height>.23 then score=score+(o.v==0 and 500 or 300) end
    elseif height>.28 then if o.kind~=3 then score=score+30 end
    else stun,speed,jump=.8,8,0 end
   end
  end
 end
 if distance>=length then score=score+math.floor(time)*100 mode=stage==10 and "won" or "station" end
end
local labels={ready="进入冒险",run="冒险中",pause="已暂停",lost="时间到",station="抵达驿站 · 开始进入下一站",won="全部通关"}
local prototypes={W.hole,W.hole,W.seal,W.flag,W.fish,W.flag,W.magic}
local pool={}
local roadFrames=W.roads
local lastRoad=-1
local function render()
 local phase=math.floor(distance/78/(2*math.pi)*24+.5)%24
 if phase~=lastRoad then
  UI:SetImage({W.screen},roadFrames[phase+1],true)
  lastRoad=phase
  if phase==2 then Log:PrintLog("[Princess] road phase 2 distance "..math.floor(distance)) end
 end
 local frame=math.floor(distance/1.7)%8
 if jump>0 then frame=jump>.55 and 2 or (jump>.22 and 3 or 7) elseif stun>0 then frame=1 end
 for i=0,7 do UI:SetVisibility({W.frames[i+1]},i==frame) end
 UI:SetPosition({W.frames[frame+1]},x*1110-105,227-208*math.sin(math.pi*jump/.82))
 local used={}
 for _,o in ipairs(objects) do
  local z=o.z-distance
  if not o.done and z>=0 and z<150 then
   local proto=prototypes[o.kind]
   local n=(used[proto] or 0)+1
   used[proto]=n
   pool[proto]=pool[proto] or {}
   local uid=pool[proto][n]
   if not uid then
    uid=UI:DuplicateWidget(proto,-3000,-3000)
    if uid and uid~=0 then pool[proto][n]=uid end
   end
   if uid and uid~=0 then
    local d=12/(12+z)
    local w=math.floor((o.kind==2 and 460 or 170)*d+6)
    local h=math.floor(160*d+5)
    UI:SetSize({uid},w,h)
    UI:SetPosition({uid},8.88*(math.sin(phase*2*math.pi/24+z/78)*math.min(32,z*.28)+o.x*(10+d*143))-w/2,(-90+d*253)*8/3-h)
    UI:SetVisibility({uid},true)
   end
  end
 end
 for proto,widgets in pairs(pool) do
  for i=(used[proto] or 0)+1,#widgets do UI:SetVisibility({widgets[i]},false) end
 end
 UI:SetText({W.score},labels[mode].."  "..stage.."/10   "..math.ceil(time).." 秒   "..math.max(0,math.ceil(length-distance)).." 米   "..score.." 分")
end
function Game:Init() end
local function bind()
 UI:RegisterPressed(W.stick,function(_,px,py)
  if mode=="run" then originX,originY=px,py end
 end)
 UI:RegisterMoved(W.stick,moveStick)
 UI:RegisterReleased(W.stick,function()
  steer,throttle,originX,originY=0,0,nil,nil
 end)
 for _,id in ipairs({W.left,W.right,W.fast,W.slow}) do
  local button=id
  UI:RegisterPressed(id,function() press(button) end)
  UI:RegisterReleased(id,function() release(button) end)
 end
 for _,id in ipairs({W.jump,W.start,W.pause}) do
  local button=id
  UI:RegisterClicked(id,function() press(button) Log:PrintLog("[Princess] clicked "..id.." mode "..mode) end)
 end
end
local elapsed=0
function Game:OnStart() stage,score=1,0 begin() mode="ready" bind() render() Log:PrintLog("[Princess] OnStart") end
function Game:OnUpdate(dt)
 if not mode then return end
 if mode=="run" then step(math.min(dt,.1)) end
 elapsed=elapsed+dt
 if elapsed>=.055 then elapsed=0 render() end
end
function Game:OnEnd() resetInput() mode=nil end
return Game
