// Render stud spacing in scene units, including the scale of instanced geometry.
function brickMaterial(material, pitch) {
  if (material.transparent) return material;
  material.onBeforeCompile = shader => {
    shader.uniforms.brickPitch = {value:pitch};
    shader.vertexShader = 'varying vec3 brickPoint; varying vec3 brickFace;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 brickScale = vec3(1.);
      #ifdef USE_INSTANCING
      brickScale = vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
      #endif
      brickPoint = position * brickScale;
      brickFace = normal;
    `);
    shader.fragmentShader = 'uniform float brickPitch; varying vec3 brickPoint; varying vec3 brickFace;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      bool top = brickFace.y > .7;
      vec2 face = top ? brickPoint.xz : vec2(abs(brickFace.x)>.7 ? brickPoint.z : brickPoint.x,brickPoint.y);
      vec2 grid = face / brickPitch;
      vec2 cell = fract(grid)-.5;
      float d = length(cell);
      float stud = (1.-smoothstep(.25,.32,d))*(.10-dot(cell,vec2(.38,.55)));
      vec2 seam = abs(fract(grid/vec2(2.,1.))-.5);
      float edge = smoothstep(.465,.5,max(seam.x,seam.y));
      diffuseColor.rgb *= 1. + ((top ? stud : 0.)-.16*edge)*(1.-smoothstep(.16,.5,max(fwidth(grid.x),fwidth(grid.y))));
    `);
  };
  material.extensions = {...material.extensions, derivatives:true};
  return material;
}
