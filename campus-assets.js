(function(root) {
  const records = [
    {name:'编程元件', typeId:'1105000000000219', category:'逻辑', usage:'当前主场景 · 实例 222', size:[100,100,100], instance:true},
    {name:'学习桌子', typeId:'1108006001001447', category:'室内', usage:'旧教室', size:[151.2,185,158.4]},
    {name:'黑板', typeId:'1108006001001371', category:'室内', usage:'旧教室', size:[27.6,801.4,531.7]},
    {name:'公告栏', typeId:'1102015001001405', category:'装饰', usage:'校门', size:[316.4,519.7,514.7]},
    {name:'木长椅', typeId:'1102015001001406', category:'室内', usage:'庭院', size:[244.1,414.6,257.1]},
    {name:'铁艺路灯', typeId:'1102015001002800', category:'照明', usage:'校园主路', size:[244.3,65.2,442.9]},
    {name:'稻草人偶', typeId:'1102015001002742', category:'装饰', usage:'走廊', size:[219.6,286,414.9]},
    {name:'信号触发开关', typeId:'1105000000000029', category:'逻辑', usage:'走廊检测参考', size:[500,500,350]},
    {name:'木门2', typeId:'1102015001002792', category:'建筑', usage:'广播室门参考', size:[239,50.6,380.5]},
    {name:'石材墙壁', typeId:'1108006001001437', category:'建筑', usage:'建筑墙体参考', size:[100,800,340]},
    {name:'出生点', typeId:'1105000000000027', category:'玩法', usage:'校门出生点', size:[207.4,154.1,143.4]},
    {name:'立方体 · 积木', typeId:'1101008001011363', category:'积木', usage:'校园三维几何', size:[100,100,100]}
  ];
  if(typeof module==='object') module.exports=records;
  else root.CampusAssets=records;
})(globalThis);
