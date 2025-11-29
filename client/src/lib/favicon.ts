export function updateFavicon(logoUrl: string) {
  try {
    const faviconUrl = logoUrl ? `${logoUrl}?v=${Date.now()}` : '/icons/favicon-32x32.png';
    
    document.querySelectorAll("link[rel*='icon']").forEach(link => link.remove());
    
    const sizes = [
      { rel: 'icon', type: 'image/png', sizes: '32x32' },
      { rel: 'icon', type: 'image/png', sizes: '16x16' },
      { rel: 'icon', type: 'image/png', sizes: '192x192' },
    ];
    
    sizes.forEach(({ rel, type, sizes: sizeAttr }) => {
      const link = document.createElement('link');
      link.rel = rel;
      link.type = type;
      link.setAttribute('sizes', sizeAttr);
      link.href = faviconUrl;
      document.head.appendChild(link);
    });
    
    const existingAppleIcon = document.querySelector("link[rel='apple-touch-icon']");
    if (existingAppleIcon) {
      existingAppleIcon.remove();
    }
    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = faviconUrl;
    document.head.appendChild(appleLink);
    
  } catch (error) {
    console.error("Error updating favicon:", error);
  }
}

export function resetFaviconToDefault() {
  updateFavicon('');
}
