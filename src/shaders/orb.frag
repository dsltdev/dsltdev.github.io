// Variante translúcida de blob.frag para orbes de fondo: centro tenue, borde brillante.
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uRim;
uniform float uAmp;
uniform float uOpacity;

varying vec3 vNormal;
varying vec3 vViewPos;
varying float vNoise;

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewPos);

  float h = clamp(vNoise / max(uAmp, 0.0001) * 0.5 + 0.5, 0.0, 1.0);
  vec3 base = mix(uDeep, uMid, smoothstep(0.1, 0.9, h));

  float diffuse = max(dot(n, normalize(vec3(0.6, 0.8, 0.5))), 0.0);
  float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.2);

  vec3 color = base * (0.25 + 0.6 * diffuse) + uRim * fresnel * 0.9;
  float alpha = clamp(0.30 + fresnel * 0.8, 0.0, 1.0) * uOpacity;

  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}
