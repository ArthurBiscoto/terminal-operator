import {T,scene,renderer} from './core.js';

export function improveLighting(){
 // A compact procedural environment supplies broad sky reflections to metal and glass.
 const width=256,height=128,pixels=new Uint8Array(width*height*4);
 const sky=new T.Color('#7aaabf'),horizon=new T.Color('#e6dfc2'),ground=new T.Color('#53664f');
 for(let y=0;y<height;y++){
  const t=y/(height-1),color=t<.5?sky.clone().lerp(horizon,Math.pow(t*2,3)):horizon.clone().lerp(ground,Math.min(1,(t-.5)*5));
  for(let x=0;x<width;x++){const i=(y*width+x)*4;pixels[i]=color.r*255;pixels[i+1]=color.g*255;pixels[i+2]=color.b*255;pixels[i+3]=255}
 }
 const environment=new T.DataTexture(pixels,width,height,T.RGBAFormat);environment.mapping=T.EquirectangularReflectionMapping;environment.needsUpdate=true;
 scene.environment=environment;scene.environmentIntensity=.55;
 const dome=new T.Mesh(new T.SphereGeometry(280,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{zenith:{value:new T.Color('#72a2be')},horizon:{value:new T.Color('#c7d4cf')}},vertexShader:'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 direction;uniform vec3 zenith;uniform vec3 horizon;void main(){float h=pow(max(normalize(direction).y,0.0),0.6);gl_FragColor=vec4(mix(horizon,zenith,h),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
 scene.add(dome);renderer.toneMappingExposure=1.04;
}
