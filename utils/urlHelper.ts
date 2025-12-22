
export const sanitizeImageUrl = (url: string): string => {
  if (!url) return '';
  const cleanUrl = url.trim();

  // Se for Base64 (armazenamento interno), retorna direto
  if (cleanUrl.startsWith('data:image/')) return cleanUrl;

  // Imgur: Converte links de álbuns/páginas em links diretos
  if (cleanUrl.includes('imgur.com/')) {
    if (cleanUrl.includes('i.imgur.com')) return cleanUrl;
    const parts = cleanUrl.split('/');
    const id = parts[parts.length - 1].split('?')[0].split('#')[0];
    return id ? `https://i.imgur.com/${id}.png` : cleanUrl;
  }

  // Google Drive
  if (cleanUrl.includes('drive.google.com/file/d/')) {
    const parts = cleanUrl.split('/d/');
    const id = parts[1]?.split('/')[0]?.split('?')[0];
    return id ? `https://lh3.googleusercontent.com/d/${id}` : cleanUrl;
  }

  return cleanUrl;
};
