/**
 * @schema 2.10
 * @input color: color = #A61C1C
 * @input opacity: number = 0.1
 * @input gap: number = 40
 */
const nodes = [];
const gap = pencil.input.gap;
const size = 12;
const thickness = 2;

for (let x = 0; x < pencil.width; x += gap) {
  for (let y = 0; y < pencil.height; y += gap) {
    nodes.push({
      type: "path",
      x: x,
      y: y,
      width: size,
      height: size,
      geometry: `M ${size/2} 0 L ${size/2} ${size} M 0 ${size/2} L ${size} ${size/2}`,
      stroke: {
        fill: pencil.input.color,
        thickness: thickness,
        cap: "round"
      },
      opacity: pencil.input.opacity
    });
  }
}

return nodes;
