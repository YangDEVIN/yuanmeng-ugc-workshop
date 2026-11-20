local S = {}
local winners = {}

-- 2D 模式：锁住底层 3D 角色，玩家开局后无法用摇杆/WASD 移动
-- 这是 GameServer 的成员方法；Character 命名空间没有 Lock 方法，必须用真实属性 API
function S:LockPlayerMoveOnly(playerId)
    Character:StopMove(playerId)
    Character:SetAttributeEnabled(playerId, Character.ATTR_ENABLE.CanMove, false)
    Character:SetAttributeEnabled(playerId, Character.ATTR_ENABLE.CanJump, false)
    Character:ChangeAttribute(playerId, Character.ATTR.MaxWalkSpeed, 0)
    Character:ChangeAttribute(playerId, Character.ATTR.JumpZVelocity, 0)
end

function S:Init()
    System:BindNotify(_GAME.NetMsg.C2S_WIN, self.OnWin, self)
    Log:PrintServerLog("[Princess] Init")
end

-- 新玩家进入即锁移动
function S:OnPlayerJoin(playerId)
    self:LockPlayerMoveOnly(playerId)
end

function S:OnStart()
    Log:PrintServerLog("[Princess] OnStart")
    local ids = Character:GetAllPlayerIds()
    for _, pid in ipairs(ids) do
        self:LockPlayerMoveOnly(pid)
    end
end

function S:OnWin(msgId, msg, playerId)
    if winners[playerId] then return end
    winners[playerId] = true
    Log:PrintServerLog("[Princess] WIN player=" .. tostring(playerId))
    -- 回包确认胜利，客户端据此解锁"发布地图"入口
    System:SendToClient(playerId, _GAME.NetMsg.S2C_WIN_ACK, { win = true, canPublish = true })
end

function S:OnUpdate(dt) end
function S:OnEnd() winners = {} end
return S
