export interface CustomStyle {
  name: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  color?: string;
  backgroundColor?: string;
}

const STORAGE_KEY = 'custom-styles';

export class CustomStylesManager {
  private styles: CustomStyle[];

  constructor() {
    this.styles = this.loadStyles();
  }

  private loadStyles(): CustomStyle[] {
    try {
      const stylesJson = localStorage.getItem(STORAGE_KEY);
      return stylesJson ? JSON.parse(stylesJson) : [];
    } catch (error) {
      console.error('Failed to load custom styles:', error);
      return [];
    }
  }

  private saveStyles(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.styles));
    } catch (error) {
      console.error('Failed to save custom styles:', error);
    }
  }

  public addStyle(style: CustomStyle): boolean {
    if (this.styles.some(s => s.name === style.name)) {
      // Style with the same name already exists
      return false;
    }
    this.styles.push(style);
    this.saveStyles();
    return true;
  }

  public getStyle(name: string): CustomStyle | undefined {
    return this.styles.find(s => s.name === name);
  }

  public getAllStyles(): CustomStyle[] {
    return [...this.styles];
  }

  public removeStyle(name: string): void {
    this.styles = this.styles.filter(s => s.name !== name);
    this.saveStyles();
  }
  
  public applyStyle(element: HTMLElement, style: CustomStyle): void {
    Object.assign(element.style, style);
  }
}

export const customStylesManager = new CustomStylesManager();
