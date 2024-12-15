import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import * as JSZip from 'jszip';

@Component({
  selector: 'app-image-editor',
  templateUrl: './image-editor.component.html',
  styleUrls: ['./image-editor.component.css']
})
export class ImageEditorComponent implements AfterViewInit {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private logo!: HTMLImageElement;
  private logoLeft!: HTMLImageElement;
  private logoRight!: HTMLImageElement;
  private files: File[] = [];
  private images: HTMLImageElement[] = [];
  private logoSizeVertical = 330; // Taille du logo pour les images verticales
  private logoSizeHorizontal = 450; // Taille du logo pour les images horizontales
  selectedLogo: 'blanc' | 'noir' | null = null;
  loading = false;
  progress = 0;
  totalImages = 0;

  addLogoLeft: boolean = false;
  addLogoRight: boolean = false;

  constructor() {}

  ngAfterViewInit() {
    this.ctx = this.canvas.nativeElement.getContext('2d')!;
    this.logoLeft = new Image();
    this.logoLeft.src = 'assets/logo_gauche.png';

    this.logoRight = new Image();
    this.logoRight.src = 'assets/logo_droit.png';
  }

  onFilesChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.files = Array.from(input.files);
      this.images = [];
      this.totalImages = this.files.length;
      this.progress = 0;
      this.loading = false;
      const promises = this.files.map(file => this.loadImage(file));
      Promise.all(promises)
        .then(() => console.log('Toutes les images sont prêtes.'))
        .catch(err => console.error('Erreur lors du chargement des images:', err));
    }
  }

  loadImage(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const img = new Image();
        img.onload = () => {
          this.images.push(img);
          resolve();
        };
        img.onerror = reject;
        img.src = e.target!.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  selectLogo(color: 'blanc' | 'noir') {
    this.selectedLogo = color;
    this.logo = new Image();
    this.logo.src = `assets/logo_${color}.png`;

    return new Promise<void>((resolve, reject) => {
      this.logo.onload = () => {
        console.log('Logo principal chargé');
        resolve();
      };
      this.logo.onerror = reject;
    });
  }

  async downloadImages() {
    if (this.images.length === 0 || !this.selectedLogo) {
      console.error('Aucune image ou logo principal non sélectionné.');
      return;
    }

    this.loading = true;
    const zip = new JSZip();
    this.progress = 0;

    try {
      for (let i = 0; i < this.images.length; i++) {
        await this.addImageToZip(zip, this.images[i], `image_${i + 1}.jpg`);
        this.progress++;
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = 'images_with_logos.zip';
      a.click();
      URL.revokeObjectURL(a.href);

    } catch (err) {
      console.error('Erreur lors de la génération du ZIP:', err);
    } finally {
      this.loading = false;
    }
  }

  addImageToZip(zip: JSZip, image: HTMLImageElement, filename: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;

      tempCtx.drawImage(image, 0, 0);

      const logoSize = image.width > image.height ? this.logoSizeHorizontal : this.logoSizeVertical;

      // Dessiner le logo central
      this.drawLogoOnCanvas(tempCtx, this.logo, (image.width - logoSize) / 2, image.height - logoSize, logoSize);

      // Dessiner le logo gauche
      if (this.addLogoLeft) {
        this.drawLogoOnCanvas(
          tempCtx,
          this.logoLeft,
          50,
          image.height - logoSize / 2 - 50,
          logoSize / 2
        );
      }

      // Dessiner le logo droit
      if (this.addLogoRight) {
        this.drawLogoOnCanvas(
          tempCtx,
          this.logoRight,
          image.width - logoSize / 2 - 50,
          image.height - logoSize / 2 - 50,
          logoSize / 2
        );
      }

      tempCanvas.toBlob(blob => {
        if (blob) {
          zip.file(filename.replace(/\.png$/, '.jpg'), blob);
          resolve();
        } else {
          reject(new Error('Erreur lors de la conversion de l\'image en Blob'));
        }
      }, 'image/jpg', 1.0);
    });
  }

  private drawLogoOnCanvas(ctx: CanvasRenderingContext2D, logo: HTMLImageElement, x: number, y: number, size: number) {
    const ratio = logo.width / logo.height;
    const width = size;
    const height = size / ratio;
    ctx.drawImage(logo, x, y, width, height);
  }
}
