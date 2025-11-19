/**
 * Visual Cryptography Logic
 * 
 * Implements a Visual Cryptography Scheme (VCS) using 2x2 subpixel expansion.
 * This ensures security (individual shares look like random noise) and contrast
 * (stacked shares reveal the image).
 * 
 * Scheme:
 * - Each source pixel maps to a 2x2 block (4 subpixels).
 * - Individual shares always have exactly 2 black subpixels (50% grey density).
 * - White Source Pixel: Shares correlate (stacking yields 2 black subpixels -> Grey).
 * - Black Source Pixel: Shares anticorrelate (stacking yields 4 black subpixels -> Black).
 */

/**
 * Resizes an image to fit within max dimensions while maintaining aspect ratio.
 */
export const resizeImage = (
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; canvas: HTMLCanvasElement } => {
  let { width, height } = img;
  
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Could not get context");
  
  ctx.drawImage(img, 0, 0, width, height);
  return { width, height, canvas };
};

/**
 * Generates shares based on Visual Cryptography Scheme.
 * Always uses 2x2 expansion to ensure security.
 */
export const generateVisualShares = (
  sourceData: ImageData,
  shareCount: number,
  isColor: boolean
): ImageData[] => {
  const width = sourceData.width;
  const height = sourceData.height;
  
  // Always use 2x2 expansion. 
  // This turns 1 source pixel into a 2x2 block on the share.
  const outWidth = width * 2;
  const outHeight = height * 2;
  
  // Initialize buffers for shares
  const sharesData = Array.from({ length: shareCount }, () => 
    new Uint8ClampedArray(outWidth * outHeight * 4)
  );

  // Process each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = sourceData.data[i];
      const g = sourceData.data[i + 1];
      const b = sourceData.data[i + 2];
      const a = sourceData.data[i + 3];

      // Handle transparency in source image
      const isTransparent = a < 50;

      // Prepare channels
      // If color mode is off, we use luminance for all 3 channels
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const channels = isColor ? [r, g, b] : [lum, lum, lum];

      // Generate bit patterns for each channel (1=Ink, 0=Clear)
      // returns number[shareIndex][subpixelIndex]
      const patR = generatePatterns(channels[0], shareCount);
      const patG = generatePatterns(channels[1], shareCount);
      const patB = generatePatterns(channels[2], shareCount);

      // Write the 2x2 blocks to the destination buffers
      for (let s = 0; s < shareCount; s++) {
        writeBlock2x2(
          sharesData[s], 
          x, y, outWidth, 
          patR[s], patG[s], patB[s], 
          isTransparent
        );
      }
    }
  }

  return sharesData.map(data => new ImageData(data, outWidth, outHeight));
};


/**
 * Helper: Generate patterns for N shares for a single channel pixel value.
 * Returns: Array of size N, where each element is an array of 4 bits (subpixels).
 */
function generatePatterns(val: number, n: number): number[][] {
  // 1. Dithering: Convert grayscale 0-255 to binary Black/White target
  // Adding noise helps gradients look better (simple error diffusion/dither)
  const threshold = 128 + (Math.random() * 60 - 30);
  const isDark = val < threshold;

  // 2. Create a random permutation of the 4 subpixel positions [0,1,2,3]
  // This ensures the "shape" of the noise is random every time.
  const p = [0, 1, 2, 3];
  // Fisher-Yates shuffle
  for (let i = 3; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }

  // Initialize shares with empty 2x2 blocks (0 = Clear)
  const patterns: number[][] = Array(n).fill(null).map(() => [0, 0, 0, 0]);

  if (!isDark) {
    // --- TARGET IS WHITE (Light) ---
    // Stacked result should be Grey (50% density).
    // To achieve this, all shares must have the SAME pattern of 2 black pixels.
    // When stacked: {Ink, Ink} U {Ink, Ink} = {Ink, Ink} (2 subpixels covered).
    
    // Pick the first 2 positions from shuffled array
    const idx1 = p[0];
    const idx2 = p[1];
    
    for (let s = 0; s < n; s++) {
      patterns[s][idx1] = 1;
      patterns[s][idx2] = 1;
    }
  } else {
    // --- TARGET IS BLACK (Dark) ---
    // Stacked result should be Black (100% density).
    // We need the union of all shares to cover all 4 subpixels.
    // AND: To be secure, each individual share must still have exactly 2 black pixels
    // so it looks identical to a White-target share.

    if (n === 2) {
      // Standard Naor-Shamir (2,2)
      // S0: {p0, p1}
      // S1: {p2, p3} (Complement)
      patterns[0][p[0]] = 1; patterns[0][p[1]] = 1;
      patterns[1][p[2]] = 1; patterns[1][p[3]] = 1;
    } 
    else if (n === 3) {
      // (3,3) Simulation
      // We need to cover 4 spots with 3 shares of size 2.
      // S0: {p0, p1}
      // S1: {p1, p2}
      // S2: {p2, p3}
      // Union covers {p0, p1, p2, p3}. Perfect black.
      patterns[0][p[0]] = 1; patterns[0][p[1]] = 1;
      patterns[1][p[1]] = 1; patterns[1][p[2]] = 1;
      patterns[2][p[2]] = 1; patterns[2][p[3]] = 1;
    } 
    else { 
      // (4,4) Simulation (and fallback for >4)
      // S0: {p0, p1}
      // S1: {p1, p2}
      // S2: {p2, p3}
      // S3: {p3, p0} (Wrap around)
      patterns[0][p[0]] = 1; patterns[0][p[1]] = 1;
      patterns[1][p[1]] = 1; patterns[1][p[2]] = 1;
      patterns[2][p[2]] = 1; patterns[2][p[3]] = 1;
      patterns[3][p[3]] = 1; patterns[3][p[0]] = 1;
    }
  }
  
  return patterns;
}


/**
 * Helper: Writes a generated 2x2 pattern to the output pixel buffer
 */
function writeBlock2x2(
  data: Uint8ClampedArray,
  x: number, y: number, width: number,
  pR: number[], pG: number[], pB: number[],
  transparent: boolean
) {
  // Define the 4 subpixel offsets in a 2x2 grid
  const offsets = [
    { dx: 0, dy: 0, i: 0 }, // Top-Left
    { dx: 1, dy: 0, i: 1 }, // Top-Right
    { dx: 0, dy: 1, i: 2 }, // Bottom-Left
    { dx: 1, dy: 1, i: 3 }  // Bottom-Right
  ];

  offsets.forEach(({ dx, dy, i }) => {
    // Calculate index in the expanded destination buffer
    const targetIdx = ((y * 2 + dy) * width + (x * 2 + dx)) * 4;

    if (transparent) {
      data[targetIdx] = 0;     // R
      data[targetIdx + 1] = 0; // G
      data[targetIdx + 2] = 0; // B
      data[targetIdx + 3] = 0; // A (Transparent)
    } else {
      // Logic: 
      // p[i] == 1 (Ink) -> Color value 0 (Black/Dark)
      // p[i] == 0 (Clear) -> Color value 255 (White/Light)
      // In 'Multiply' blend mode, White(255) is transparent, Black(0) is opaque.
      
      data[targetIdx]     = (1 - pR[i]) * 255;
      data[targetIdx + 1] = (1 - pG[i]) * 255;
      data[targetIdx + 2] = (1 - pB[i]) * 255;
      data[targetIdx + 3] = 255; // Alpha always 255 for the sheet itself
    }
  });
}
