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
  private files: File[] = [];
  private images: HTMLImageElement[] = [];
  //private logoSizeVertical = 400; // Taille du logo pour les images verticales
  //private logoSizeHorizontal = 350; // Taille du logo pour les images horizontales
  private logoSizeVertical = 1200; // Taille du logo pour les images verticales
  private logoSizeHorizontal = 1000; // Taille du logo pour les images horizontales
  selectedLogo: 'blanc' | 'noir' | null = null;
  loading = false;
  progress = 0;
  totalImages = 0;

  constructor() { }

  ngAfterViewInit() {
    this.ctx = this.canvas.nativeElement.getContext('2d')!;
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
      Promise.all(promises).then(() => {
        console.log('Toutes les images sont prêtes.');
      }).catch(err => {
        console.error('Erreur lors du chargement des images:', err);
      });
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
    this.logo.src = `assets/logo_${color}.png`; // Chemin du logo sélectionné

    // Assurez-vous que le logo est chargé avant de permettre le téléchargement
    return new Promise<void>((resolve, reject) => {
      this.logo.onload = () => {
        console.log('Logo chargé');
        resolve();
      };
      this.logo.onerror = (err) => {
        console.error('Erreur lors du chargement du logo:', err);
        reject(err);
      };
    });
  }

  async downloadImages() {
    if (this.images.length === 0) {
      console.error('Aucune image chargée.');
      return;
    }
  
    if (!this.logo.complete) {
      console.error('Logo non chargé.');
      return;
    }
  
    this.loading = true;
    const zip = new JSZip();
    const chunkSize = 90; // Nombre d'images à traiter simultanément
  
    try {
      this.progress = 0;
  
      for (let i = 0; i < this.images.length; i += chunkSize) {
        const chunk = this.images.slice(i, i + chunkSize);
        await Promise.all(chunk.map((image, index) =>
          this.addImageToZip(zip, image, `image_${i + index + 1}.jpg`, i + index + 1)
        ));
        this.progress += chunk.length;
        console.log(`Progression: ${this.progress} sur ${this.totalImages}`);
      }
  
      const content = await zip.generateAsync({ type: 'blob' });
      console.log('ZIP généré avec succès');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = 'images_with_logo.zip';
      a.click();
      URL.revokeObjectURL(a.href); // Nettoyer l'URL
  
    } catch (err) {
      console.error('Erreur lors de la génération du ZIP:', err);
    } finally {
      this.loading = false;
    }
  }

  addImageToZip(zip: JSZip, image: HTMLImageElement, filename: string, current: number): Promise<void> {
    return new Promise((resolve) => {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d')!;
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;

      // Dessiner l'image originale sur le canvas temporaire
      tempCtx.drawImage(image, 0, 0);

      // Déterminer la taille du logo en fonction de l'orientation de l'image
      const logoSize = image.width > image.height ? this.logoSizeHorizontal : this.logoSizeVertical;
      const logoRatio = this.logo.width / this.logo.height;
      const imageRatio = image.width / image.height;

      let logoWidth, logoHeight;
      if (logoSize / logoRatio > image.height) {
        logoHeight = image.height;
        logoWidth = logoHeight * logoRatio;
      } else {
        logoWidth = logoSize;
        logoHeight = logoWidth / logoRatio;
      }

      // Calculer la position du logo pour le centrer horizontalement et le placer en bas
      const logoX = (image.width - logoWidth) / 2; // Centrer horizontalement
      const logoY = image.height - logoHeight; // Placer en bas

      // Dessiner le logo sur le canvas temporaire
      tempCtx.drawImage(this.logo, logoX, logoY, logoWidth, logoHeight);

      // Convertir le canvas en Blob
      tempCanvas.toBlob(blob => {
        if (blob) {
          zip.file(filename, blob);
        }
        resolve();
      }, 'image/jpeg', 1.00); // 0.7 pour 70% de qualité      

    });
  }
}
