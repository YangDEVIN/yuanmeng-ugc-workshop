local Config=require "Common.ParkConfig"
local Rules=require "Common.ParkRules"
local GameServer={players={},running={wheel=false,carousel=false},phase={wheel=0,carousel=0},clock=0,round=0}
function GameServer:Init()
 System:BindNotify(_GAME.NetMsg.C2S_ClientReq,self.OnClientReq,self)
end
function GameServer:OnStart()
 self.players={};self.clock=0;self.running={wheel=false,carousel=false};self.phase={wheel=0,carousel=0}
 Log:PrintServerLog("[ParkServer] OnStart")
end
function GameServer:Player(id)
 if not self.players[id] then self.players[id]={coins=0,lastAction=-10,lastInput=0} end
 return self.players[id]
end
function GameServer:Send(id,extra)
 local p=self:Player(id)
 System:SendToClient(id,_GAME.NetMsg.S2C_ServerNtf,{coins=p.coins,game=p.game or false,running=self.running,phase=self.phase,extra=extra or false})
end
function GameServer:OnClientReq(msgId,msg,id)
 if type(msg)~="table" then return end
 local p=self:Player(id)
 if msg.action=="hello" then self:Send(id);return end
 if msg.action=="direction" and p.game and not p.game.done then
  p.game.direction=math.max(-1,math.min(1,tonumber(msg.value) or 0));p.lastInput=self.clock;return
 end
 if msg.action=="answer" and p.game and p.game.round==msg.round then
  if self.clock-(p.lastAnswer or -1)<.2 then return end
  p.lastAnswer=self.clock;Rules.Answer(p.game,tonumber(msg.value));self:Send(id);return
 end
 if msg.action=="exit" then p.game=nil;self:Send(id);return end
 if self.clock-p.lastAction<.35 then return end
 p.lastAction=self.clock
 local index=tonumber(msg.index);local point=Config.points[index or 0]
 if not point then return end
 if msg.action=="travel" then
  if p.game then return end
  Character:SetPosition(id,Engine.Vector(point.pos[1],point.pos[2],point.pos[3]+150))
  self:Send(id,{travel=index});return
 end
 if msg.action~="interact" or p.game and not p.game.done then return end
 local pos=Character:GetPosition(id)
 if not pos or (pos.X-point.pos[1])^2+(pos.Y-point.pos[2])^2>2000^2 then self:Send(id,{tip="请先走近互动点"});return end
 if point.kind=="game" then
  self.round=self.round+1;p.game=Rules.New(point.game,self.round)
 elseif point.kind=="wheel" or point.kind=="carousel" then
  self.running[point.kind]=not self.running[point.kind]
  Log:PrintServerLog("[ParkMechanism] toggle",point.kind,self.running[point.kind])
 elseif point.kind=="photo" or point.kind=="interior" or point.kind=="bell" then
  self:Send(id,{view=index});return
 end
 self:Send(id)
end
function GameServer:OnUpdate(dt)
 self.clock=self.clock+dt
 for key,period in pairs({wheel=40,carousel=18}) do
  if self.running[key] then self.phase[key]=(self.phase[key]+dt*math.pi*2/period)%(math.pi*2) end
 end
 for id,p in pairs(self.players) do
  if p.game then
   if self.clock-p.lastInput>.5 then p.game.direction=0 end
   Rules.Step(p.game,dt)
   local paid;p.coins,paid=Rules.Pay(p.game,p.coins)
   if paid then Log:PrintServerLog("[ParkReward]",id,p.game.round,p.game.reward,p.coins) end
  end
 end
 self.sendClock=(self.sendClock or 0)+dt
 if self.sendClock>=.12 then
  self.sendClock=0
  for id in pairs(self.players) do self:Send(id) end
 end
end
function GameServer:OnEnd() self.players={} end
return GameServer
