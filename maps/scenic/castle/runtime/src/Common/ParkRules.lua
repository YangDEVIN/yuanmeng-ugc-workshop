local Rules = {}
Rules.questions = {
 {text="三角形有几条边？", options={"3 条","4 条","5 条"}, answer=1},
 {text="雪遇热会变成什么？", options={"沙子","水","石头"}, answer=2},
 {text="红色与黄色调和成什么颜色？", options={"紫色","绿色","橙色"}, answer=3},
}
function Rules.New(game, round)
 return {game=game,round=round,time=0,score=0,question=1,done=false,reward=0,x=0,direction=0,objects={},nextSpawn=0,serial=0,paid=false}
end
function Rules.Answer(g, choice)
 if g.done or g.game~=1 or not Rules.questions[g.question] then return false end
 if choice==Rules.questions[g.question].answer then g.score=g.score+1 end
 g.question=g.question+1
 if g.question>#Rules.questions then g.done=true;g.reward=g.score*5 end
 return true
end
function Rules.Step(g,dt)
 if g.done then return end
 g.time=g.time+dt
 if g.game==1 then
  if g.time>=60 then g.done=true;g.reward=g.score*5 end
  return
 end
 g.x=math.max(-220,math.min(220,g.x+g.direction*260*dt))
 if g.time>=g.nextSpawn then
  g.serial=g.serial+1;g.nextSpawn=g.nextSpawn+.72
  g.objects[#g.objects+1]={x=((g.serial*73)%421)-210,y=-140,kind=(g.game==2 and g.serial%3==0) and "rock" or "coin"}
 end
 for i=#g.objects,1,-1 do
  local o=g.objects[i];local previous=o.y;o.y=o.y+160*dt
  if previous<115 and o.y>=115 and math.abs(o.x-g.x)<37 then
   if o.kind=="rock" then g.score=math.max(0,g.score-2) else g.score=g.score+1 end
   table.remove(g.objects,i)
  elseif o.y>185 then table.remove(g.objects,i) end
 end
 if g.time>=25 then g.done=true;g.reward=g.score+(g.game==2 and 5 or 0) end
end
function Rules.Pay(g, balance)
 if not g.done or g.paid then return balance,false end
 g.paid=true;return balance+g.reward,true
end
return Rules
