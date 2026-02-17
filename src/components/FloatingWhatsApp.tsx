import { MessageCircle } from "lucide-react";

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/JGaKYDD7DLzJvzyYyAJejo";

const FloatingWhatsApp = () => {
  return (
    <a
      href={WHATSAPP_GROUP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-all hover:scale-110 active:scale-95"
      title="קבוצת הוואטסאפ"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
};

export default FloatingWhatsApp;
