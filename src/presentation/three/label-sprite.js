/**
 * Tarayıcıda alan etiketi: kod (M2) ve isteğe bağlı kısa ad tek bir yuvarlatılmış kartta.
 * Sprite derinlik testine girmez; duvar veya mobilya arkasında kaybolmaz. Ekrandaki
 * boyutunu sahne her karede kameraya göre ayarlar (userData.aspect ile).
 * Node testlerinde DOM olmadığı için bu dosya kullanılmaz.
 * @param {any} THREE
 * @param {{ code: string, name?: string }} text Ad boşsa yalnızca kod yazılır.
 */
export function createLabelSprite(THREE, { code, name = '' }) {
  const pixelRatio = 2;
  const codeFont = `700 ${30 * pixelRatio}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const nameFont = `500 ${19 * pixelRatio}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = codeFont;
  const codeWidth = measure.measureText(code).width;
  measure.font = nameFont;
  const nameWidth = measure.measureText(name).width;
  const padding = 16 * pixelRatio;
  const gap = name ? 12 * pixelRatio : 0;
  const width = Math.ceil(padding * 2 + codeWidth + gap + nameWidth);
  const height = 52 * pixelRatio;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const radius = height / 2;
  context.beginPath();
  context.moveTo(radius, 0);
  context.arcTo(width, 0, width, height, radius);
  context.arcTo(width, height, 0, height, radius);
  context.arcTo(0, height, 0, 0, radius);
  context.arcTo(0, 0, width, 0, radius);
  context.closePath();
  context.fillStyle = 'rgba(28, 38, 33, 0.86)';
  context.fill();
  context.textBaseline = 'middle';
  context.font = codeFont;
  context.fillStyle = '#ffffff';
  context.fillText(code, padding, height / 2 + pixelRatio);
  if (name) {
    context.font = nameFont;
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.fillText(name, padding + codeWidth + gap, height / 2 + pixelRatio);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.name = `Etiket:${code}`;
  sprite.renderOrder = 10;
  sprite.userData.aspect = width / height;
  return sprite;
}
