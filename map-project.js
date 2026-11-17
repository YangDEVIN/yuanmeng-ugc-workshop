/* The project contains source geometry and editable settings together. */
(function(root){
  const schema='yuanmeng-fps-project/v2';
  function create(geometry,spawns){
    const isTemplate=geometry.mapId==='template';
    return {schema,map:isTemplate?'template':'de_dust2',name:isTemplate?'训练模板':'沙漠双点',geometry,
      yuanmengReference:root.YuanmengTemplateReference ? JSON.parse(JSON.stringify(root.YuanmengTemplateReference)) : null,
      settings:{spawns,coordinates:{units:isTemplate?'cm':'Source units',upAxis:'Z',sourceUnitsToCm:isTemplate?1:null},originCm:{x:0,y:0,z:0},yaw:0,scale:1},
      reconstruction:{ready:false,commands:[],workflow:['核对目标地图与编辑模式','查询真实元件类型及原始尺寸','创建并记录返回 sceneId','按 sceneId 回读位置、旋转、缩放、颜色','逐项校正网格吸附误差并再次回读','截图与试玩验证','保存并核对保存回执'],unresolved:isTemplate?['原始 typeId、旋转、材质及玩法属性待补齐']: [
        ...(!geometry.deformedFaces ? ['BSP 地形曲面尚未展开'] : []), '静态模型及贴图尚未导入',
        'Source 单位到元梦厘米的比例待校准',
        '几何资源与出生点的元梦资源映射待完成'
      ]}};
  }
  function validate(project){
    if(!project||project.schema!==schema||!['de_dust2','template'].includes(project.map))throw Error('地图工程格式或地图不匹配');
    const geometry=project.geometry,settings=project.settings;
    if(!geometry||!Array.isArray(geometry.groups)||!geometry.groups.length||!Array.isArray(geometry.landmarks))throw Error('缺少地图几何');
    for(const group of geometry.groups){
      if(typeof group.material!=='string'||!Array.isArray(group.positions)||group.positions.length%9||!group.positions.every(Number.isFinite))throw Error('地图三角形数据无效');
    }
    if(!settings||!Array.isArray(settings.spawns))throw Error('缺少出生点设置');
    const ids=new Set();
    for(const p of settings.spawns){
      if(!p||typeof p.id!=='string'||!p.id||ids.has(p.id)||!['T','CT','N'].includes(p.team)||!Array.isArray(p.position)||p.position.length!==3||!p.position.every(Number.isFinite)||!Number.isFinite(p.yaw))throw Error('出生点数据无效');
      ids.add(p.id);
    }
    if(settings.coordinates?.units!==(project.map==='template'?'cm':'Source units')||settings.coordinates.upAxis!=='Z'||settings.coordinates.sourceUnitsToCm!==(project.map==='template'?1:null)||settings.scale!==1||settings.yaw!==0||!settings.originCm||['x','y','z'].some(k=>settings.originCm[k]!==0))throw Error('此版本尚不支持导入已变换或已校准的工程');
    return project;
  }
  root.FpsProject={create,validate};
  if(typeof module!=='undefined')module.exports=root.FpsProject;
})(globalThis);
