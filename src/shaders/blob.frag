uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uRim;
uniform float uAmp;

varying vec3 vNormal;
varying vec3 vViewPos;
varying float vNoise;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewPos);

  // Valles → color profundo, crestas → color de acento.
  float h = clamp(vNoise / max(uAmp, 0.0001) * 0.5 + 0.5, 0.0, 1.0);
  vec3 base = mix(uDeep, uMid, smoothstep(0.1, 0.9, h));

  // Luz direccional suave + fresnel en el borde.
  vec3 lightDir = normalize(vec3(0.6, 0.8, 0.5));
  float diffuse = max(dot(n, lightDir), 0.0);
  float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.8);

  vec3 color = base * (0.35 + 0.85 * diffuse) + uRim * fresnel * 0.9;

  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
