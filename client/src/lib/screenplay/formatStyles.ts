export function getFormatStyles(elementType: string): string {
  switch (elementType) {
    case "scene-header-1":
    case "scene-header-2":
      return `<div class="${elementType}">`;
    case "scene-header-3":
      return `<div class="${elementType}">`;
    case "action":
      return `<div class="${elementType}">`;
    case "character":
      return `<div class="${elementType}">`;
    case "dialogue":
      return `<div class="${elementType}">`;
    case "parenthetical":
      return `<div class="${elementType}">`;
    case "transition":
      return `<div class="${elementType}">`;
    case "director-note":
      return `<div class="${elementType}">`;
    default:
      return `<div class="action">`;
  }
}
