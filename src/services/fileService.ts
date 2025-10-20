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
    
    const fileName = path.basename(sourcePath);
    const newPath = path.join(imagesDir, fileName);
    
    await fs.copyFile(sourcePath, newPath);
    return newPath;
  }
}