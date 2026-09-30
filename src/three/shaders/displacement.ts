export const displacementVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const displacementFragment = `
  uniform sampler2D uTexture;
  uniform float uHover;
  uniform vec2 uMouse;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    float dist = distance(uv, uMouse);
    float wave = sin(dist * 12.0 - uHover * 3.0) * 0.012 * uHover;
    uv += wave;
    vec4 color = texture2D(uTexture, uv);
    gl_FragColor = color;
  }
`
