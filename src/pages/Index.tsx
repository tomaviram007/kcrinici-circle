import HeroSection from "@/components/landing/HeroSection";
import BirthdaysSection from "@/components/landing/BirthdaysSection";
import BulletinSection from "@/components/landing/BulletinSection";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <HeroSection />
      <BirthdaysSection />
      <BulletinSection />
      
      <footer className="border-t border-border py-12 text-center">
        <p className="font-body text-sm text-muted-foreground">
          © {new Date().getFullYear()} הגברים של ק. קריניצי — מועדון חברים אקסקלוסיבי
        </p>
      </footer>
    </main>
  );
};

export default Index;
