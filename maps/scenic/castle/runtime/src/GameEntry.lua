-- 脚本加载入口
_GAME = {}

------------------------------------------------- Game Require ------------------------------------------------------
_GAME.NetMsg = require "Common.NetMsg"
_GAME.GameServer = require "Server.GameServer"
_GAME.GameClient = require "Client.GameClient"

------------------------------------------------- Game Life ---------------------------------------------------------
-- 初始化
if System:IsServer() then
    _GAME.GameServer:Init()
end
if System:IsClient() then
    _GAME.GameClient:Init()
end

local ServerCurTime = TimerManager:GetTimeSeconds()
local ClientCurTime = TimerManager:GetTimeSeconds()

-- 客户端游戏更新
local function UpdateClient()
    local _curTime = TimerManager:GetTimeSeconds()
    _GAME.GameClient:OnUpdate(_curTime - ClientCurTime)
    ClientCurTime = _curTime
end

-- 服务端游戏更新
local function UpdateServer()
    local _curTime = TimerManager:GetTimeSeconds()
    _GAME.GameServer:OnUpdate(_curTime - ServerCurTime)
    ServerCurTime = _curTime
end

-- 脚本启动时调用
local function OnBeginPlay()
    -- 请注意 单机启动的游戏既是服务器端又是客户端 System:IsServer() 和 System:IsClient() 都返回 true

    -- 启动服务器
    if System:IsServer() then
        -- 服务端游戏开始入口
        _GAME.GameServer:OnStart()

        -- 循环更新服务器
        -- -- 按时间间隔刷新
        -- local timeDelta = 0.05 -- 服务端每次刷新的时间间隔
        -- TimerManager:AddLoopTimer(timeDelta, UpdateServer)
        -- 按帧刷新
        TimerManager:AddLoopFrame(1, UpdateServer)
    end

    -- 启动客户端
    if System:IsClient() then
        -- 客户端游戏开始入口
        _GAME.GameClient:OnStart()

        -- 循环更新客户端
        -- -- 按时间间隔刷新
        -- local timeDelta = 0.02 -- 客户端每次刷新的时间间隔
        -- TimerManager:AddLoopTimer(timeDelta, UpdateClient)
        -- 按帧刷新
        TimerManager:AddLoopFrame(1, UpdateClient)
    end
end

-- 脚本结束时调用
local function OnEndPlay()
    if System:IsServer() then
        _GAME.GameServer:OnEnd()
    end

    if System:IsClient() then
        _GAME.GameClient:OnEnd()
    end
end

-- 监听脚本启动事件
System:RegisterEvent(Events.ON_BEGIN_PLAY, OnBeginPlay)

-- 监听脚本结束事件
System:RegisterEvent(Events.ON_END_PLAY, OnEndPlay)