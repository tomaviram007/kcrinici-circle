import confetti from "canvas-confetti";

export const useConfetti = () => {
  const fireRSVP = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#C9A84C", "#FFD700", "#ffffff", "#b8860b"],
    });
  };

  const fireNewEvent = () => {
    const end = Date.now() + 1200;
    const colors = ["#C9A84C", "#FFD700", "#ffffff"];
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const fireMemberApproved = () => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.5 },
      colors: ["#C9A84C", "#FFD700", "#ffffff", "#4CAF50"],
      startVelocity: 40,
    });
  };

  const fireBirthday = () => {
    const end = Date.now() + 2000;
    const colors = ["#C9A84C", "#FFD700", "#ff69b4", "#87ceeb", "#ffffff"];
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  return { fireRSVP, fireNewEvent, fireMemberApproved, fireBirthday };
};
