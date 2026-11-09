/**
 * Corners are measured at the visible outer edge. For nested surfaces, subtract
 * the edge-to-edge inset (including any border) to align their corner curves.
 * Once the inset consumes the parent's curve, use a small optical floor:
 * 4px for readable surfaces, 2px for small controls. Never grow a child radius.
 * This is an optical adaptation, not exact concentric geometry at the floor.
 */
export function insetRadius(outer:number,inset:number,floor=0):number {
 return Math.max(0,Math.min(outer,Math.max(floor,outer-Math.max(0,inset))));
}
const surface=10;
const columnInset=12;
const card=insetRadius(surface,columnInset,4);
const overlay=8;
export const radii={
 surface,
 overlay,
 card,
 control:4,
 small:2,
 cardAction:insetRadius(card,4,2),
 menuItem:insetRadius(overlay,5,4),
 pill:999,
 circle:999,
} as const;
export const columnGeometry={radius:surface,inset:columnInset,cardRadius:card} as const;
