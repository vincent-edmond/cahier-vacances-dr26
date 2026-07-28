function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/**
 * URL d'embed Vimeo. Gère les vidéos NON-LISTÉES / PRIVÉES au format
 * `vimeo.com/{id}/{hash}` : le hash doit être passé en `?h={hash}`, sinon
 * l'iframe affiche « vidéo privée ». Renvoie `null` si ce n'est pas du Vimeo.
 */
function vimeoEmbed(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([A-Za-z0-9]+))?/);
  if (!m) return null;
  return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}`;
}

interface VideoEmbedProps {
  url: string | null;
  titre: string;
}

export function VideoEmbed({ url, titre }: VideoEmbedProps) {
  if (!url) {
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-[#00194C] to-[#000D2B] flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-full bg-white/10 border border-white/25 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <p className="text-white font-semibold text-sm">{titre}</p>
          <p className="text-white/50 text-xs mt-1">Vidéo disponible prochainement</p>
        </div>
      </div>
    );
  }

  const yt = youtubeId(url);
  const vm = vimeoEmbed(url);
  const isMp4 = /\.(mp4|webm|ogg)(\?|$)/i.test(url);

  if (isMp4) {
    return (
      <video controls className="w-full aspect-video rounded-2xl bg-black" src={url}>
        Votre navigateur ne peut pas lire cette vidéo.
      </video>
    );
  }

  const embedSrc = yt ? `https://www.youtube.com/embed/${yt}` : vm ? vm : url;

  return (
    <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black">
      <iframe
        src={embedSrc}
        title={titre}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
