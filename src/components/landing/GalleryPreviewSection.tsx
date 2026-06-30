import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ImageIcon } from "lucide-react";
import gsap from "gsap";
import { supabase } from "@/integrations/supabase/client";

interface Album {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
}

interface Props {
  isApproved: boolean;
}

const GalleryPreviewSection = ({ isApproved }: Props) => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("gallery_albums")
      .select("id, title, description, cover_image_url, created_at")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setAlbums(data || []));
  }, []);

  useEffect(() => {
    if (!sectionRef.current || albums.length === 0) return;
    const cards = sectionRef.current.querySelectorAll(".gallery-card");
    gsap.fromTo(cards, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: "power3.out" });
  }, [albums]);

  if (!isApproved || albums.length === 0) return null;

  return (
    <section className="py-8 px-5 sm:py-16 sm:px-6" ref={sectionRef}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 sm:mb-12 text-center">
          <p className="mb-2 font-body text-xs sm:text-sm tracking-[0.3em] text-gold/70 uppercase">גלריה</p>
          <h2 className="font-serif text-2xl font-bold text-foreground sm:text-4xl md:text-5xl">
            רגעים <span className="text-gold">מהמועדון</span>
          </h2>
          <div className="mt-4 mx-auto h-px w-16 gradient-gold opacity-40" />
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {albums.map((album) => (
            <Link
              key={album.id}
              to={`/gallery?album=${album.id}`}
              className="gallery-card opacity-0 group block rounded-lg overflow-hidden border border-border bg-card transition-all duration-500 hover:border-gold/30 hover:shadow-[0_0_40px_hsl(43_72%_52%/0.08)]"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
                {album.cover_image_url ? (
                  <img
                    src={album.cover_image_url}
                    alt={album.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-gold/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              </div>
              <div className="p-4 sm:p-5">
                <h3 className="font-serif text-lg font-bold text-foreground line-clamp-1">{album.title}</h3>
                {album.description && (
                  <p className="mt-1 font-body text-sm text-muted-foreground line-clamp-2">{album.description}</p>
                )}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/gallery" className="font-body text-sm text-gold hover:underline">
            לכל הגלריות
          </Link>
        </div>
      </div>
    </section>
  );
};

export default GalleryPreviewSection;
