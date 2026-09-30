import * as THREE from 'three'
import { SKY_ATMOSPHERE_GLSL, skyAtmosphereUniforms } from './skyAtmosphere'

/**
 * Distance haze that dissolves into the sky itself: each fogged fragment blends toward the sky
 * colour in its own view direction (the same gradient the dome draws), so far hills fade into
 * pale horizon by day and navy by night. Clouds join in only as the fog completes, so they never
 * sit in front of anything still visible. Where the world is completely lost in the haze it
 * already matches the sky, and dropping those fragments leaves no invisible ground in front of
 * the distant stars, moon and clouds, which show through there, and only there.
 */
const MARK = '/* sky-horizon */'
const FOG_MIX = 'gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );'
const DEPTH_VARYING = 'varying float vFogDepth;'

if (!THREE.ShaderChunk.fog_fragment.includes(MARK)) {
  const chunks = THREE.ShaderChunk
  chunks.fog_pars_vertex = chunks.fog_pars_vertex.replace(DEPTH_VARYING, `${DEPTH_VARYING}\n\tvarying vec3 vFogSkyDir;`)
  chunks.fog_vertex = chunks.fog_vertex.replace(
    'vFogDepth = - mvPosition.z;',
    'vFogDepth = - mvPosition.z;\n\tvFogSkyDir = ( vec4( mvPosition.xyz, 0.0 ) * viewMatrix ).xyz;',
  )
  chunks.fog_pars_fragment = chunks.fog_pars_fragment.replace(
    DEPTH_VARYING,
    `${DEPTH_VARYING}\n\tvarying vec3 vFogSkyDir;\n${SKY_ATMOSPHERE_GLSL}`,
  )
  chunks.fog_fragment = chunks.fog_fragment.replace(
    FOG_MIX,
    `${MARK}
	if ( fogFactor > 0.996 ) discard;
	if ( fogFactor > 0.0 ) {
		vec3 skyDir = normalize( vFogSkyDir );
		vec3 hazeColor = skyAtmoGradient( skyDir, fogColor );
		if ( fogFactor > 0.4 ) hazeColor = mix( hazeColor, skyAtmoWithClouds( skyDir, hazeColor ), pow( fogFactor, 6.0 ) );
		gl_FragColor.rgb = mix( gl_FragColor.rgb, hazeColor, fogFactor );
	}`,
  )

  for (const shader of Object.values(THREE.ShaderLib)) {
    if ('fogColor' in shader.uniforms) Object.assign(shader.uniforms, skyAtmosphereUniforms)
  }
}
