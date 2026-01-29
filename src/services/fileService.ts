import { app } from 'electron';
import path from 'node:path';
import fs from 'fs/promises';

/**
 * 文件服务，负责处理文件操作
 */
export class FileService {
  /**
   * 将图片复制到用户目录
   * @param sourcePath 源文件路径
   * @returns 新文件路径
   */
  async copyImageToUserDir(sourcePath: string): Promise<string> {
    const userDataPath = app.getPath("userData");
    const imagesDir = path.join(userDataPath, "images");
    
    // 确保目录存在
    await fs.mkdir(imagesDir, { recursive: true });
    
    // 如果源文件已经在用户 images 目录中，直接返回，避免自我拷贝导致错误
    const isAlreadyInImagesDir = !path.relative(imagesDir, sourcePath).startsWith('..');
    if (isAlreadyInImagesDir) {
      return sourcePath;
    }

    const fileName = path.basename(sourcePath);
    const newPath = path.join(imagesDir, fileName);
    
    await fs.copyFile(sourcePath, newPath);
    return newPath;
  }

  /**
   * 将 base64 图片数据保存到用户目录
   * @param base64 图片 base64 字符串（不含 data: 前缀）
   * @param filename 文件名（建议以 .png 结尾）
   * @returns 新文件路径
   */
  async saveImageFromBase64(base64: string, filename: string): Promise<string> {
    const userDataPath = app.getPath("userData");
    const imagesDir = path.join(userDataPath, "images");
    await fs.mkdir(imagesDir, { recursive: true });

    const safeName = filename || `image-${Date.now()}.png`;
    const newPath = path.join(imagesDir, safeName);
    const buffer = Buffer.from(base64, 'base64');
    await fs.writeFile(newPath, buffer);
    return newPath;
  }

  /** 获取 images 目录的绝对路径（跨平台：macOS/Windows/Linux） */
  getImagesDirPath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'images');
  }

  /** 获取输出目录（系统“下载”目录下的 images 子目录） */
  getDownloadsImagesDirPath(): string {
    const downloadsPath = app.getPath('downloads');
    return path.join(downloadsPath, 'images');
  }

  /** 获取 videos 目录的绝对路径 */
  getVideosDirPath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'videos');
  }

  /** 获取输出目录（系统“下载”目录下的 videos 子目录） */
  getDownloadsVideosDirPath(): string {
    const downloadsPath = app.getPath('downloads');
    return path.join(downloadsPath, 'videos');
  }

  /**
   * 将网络视频保存到用户目录
   * @param url 视频 URL
   * @param filename 文件名
   * @returns 新文件路径
   */
  async saveVideoFromUrl(url: string, filename: string): Promise<string> {
    const videosDir = this.getDownloadsVideosDirPath();
    await fs.mkdir(videosDir, { recursive: true });

    const safeName = filename || `video-${Date.now()}.mp4`;
    const newPath = path.join(videosDir, safeName);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download video: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(newPath, Buffer.from(arrayBuffer));
    return newPath;
  }

  /** 计算 images 缓存目录大小（字节） */
  async getImagesCacheSize(): Promise<number> {
    const imagesDir = this.getImagesDirPath();
    try {
      await fs.mkdir(imagesDir, { recursive: true });
    } catch (e) {
      // ignore mkdir error
    }

    let total = 0;
    try {
      const entries = await fs.readdir(imagesDir, { withFileTypes: true });
      for (const entry of entries) {
        const p = path.join(imagesDir, entry.name);
        try {
          if (entry.isFile()) {
            const stat = await fs.stat(p);
            total += stat.size;
          } else if (entry.isDirectory()) {
            total += await this.getDirectorySizeRecursive(p);
          }
        } catch (e) {
          // ignore stat error
        }
      }
    } catch (e) {
      // if readdir fails, treat as empty
      return 0;
    }
    return total;
  }

  private async getDirectorySizeRecursive(dir: string): Promise<number> {
    let total = 0;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const p = path.join(dir, entry.name);
        if (entry.isFile()) {
          try {
            const stat = await fs.stat(p);
            total += stat.size;
          } catch (e) {
            // ignore stat error
          }
        } else if (entry.isDirectory()) {
          total += await this.getDirectorySizeRecursive(p);
        }
      }
    } catch (e) {
      // ignore readdir error
    }
    return total;
  }

  /** 清空 images 缓存目录内容（保留目录），返回删除的文件数与释放字节数 */
  async clearImagesCache(): Promise<{ removedFiles: number; freedBytes: number }> {
    const imagesDir = this.getImagesDirPath();
    try {
      await fs.mkdir(imagesDir, { recursive: true });
    } catch (e) {
      // ignore mkdir error
    }

    let removedFiles = 0;
    let freedBytes = 0;
    try {
      const entries = await fs.readdir(imagesDir, { withFileTypes: true });
      for (const entry of entries) {
        const p = path.join(imagesDir, entry.name);
        try {
          const stat = await fs.stat(p);
          if (entry.isFile()) {
            freedBytes += stat.size;
            await fs.unlink(p);
            removedFiles += 1;
          } else if (entry.isDirectory()) {
            const subStats = await this.removeDirectoryRecursive(p);
            removedFiles += subStats.removedFiles;
            freedBytes += subStats.freedBytes;
            try {
              await fs.rmdir(p);
            } catch (e) {
              // ignore rmdir error
            }
          }
        } catch (e) {
          // ignore unlink/rmdir error
        }
      }
    } catch (e) {
      // ignore readdir error
    }

    return { removedFiles, freedBytes };
  }

  private async removeDirectoryRecursive(dir: string): Promise<{ removedFiles: number; freedBytes: number }> {
    let removedFiles = 0;
    let freedBytes = 0;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const p = path.join(dir, entry.name);
        if (entry.isFile()) {
          try {
            const stat = await fs.stat(p);
            freedBytes += stat.size;
            await fs.unlink(p);
            removedFiles += 1;
          } catch (e) {
            // ignore file remove error
          }
        } else if (entry.isDirectory()) {
          const sub = await this.removeDirectoryRecursive(p);
          removedFiles += sub.removedFiles;
          freedBytes += sub.freedBytes;
          try {
            await fs.rmdir(p);
          } catch (e) {
            // ignore rmdir error
          }
        }
      }
    } catch (e) {
      // ignore readdir error
    }
    return { removedFiles, freedBytes };
  }
}